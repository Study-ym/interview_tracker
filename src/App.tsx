import { useState, useEffect } from 'react';
import type { JobApplication } from './types';
import { loadJobs, saveJobs, deleteJob, syncFromServer } from './store';
import { ListView } from './components/ListView';
import { DetailView } from './components/DetailView';
import { FormView } from './components/FormView';
import { AuthView } from './components/AuthView';
import { isLoggedIn, clearAuth, getUser } from './auth';
import './App.css';

type View =
  | { type: 'list' }
  | { type: 'detail'; id: string }
  | { type: 'form-job'; id?: string }
  | { type: 'form-round'; jobId: string; roundId?: string };

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => isLoggedIn());
  const [jobs, setJobs] = useState<JobApplication[]>(() => loadJobs());
  const [view, setView] = useState<View>({ type: 'list' });

  // 登录后从服务器同步数据
  useEffect(() => {
    if (loggedIn) {
      syncFromServer()
        .then(serverJobs => setJobs(serverJobs))
        .catch(err => console.error('同步失败:', err));
    }
  }, [loggedIn]);

  useEffect(() => { saveJobs(jobs); }, [jobs]);

  // 未登录显示登录页
  if (!loggedIn) {
    return <AuthView onLogin={() => setLoggedIn(true)} />;
  }

  const user = getUser();

  const currentJob = view.type !== 'list'
    ? jobs.find(j => j.id === (view.type === 'detail' ? view.id : view.type === 'form-job' ? view.id : view.jobId))
    : undefined;

  function handleSaveJob(updated: JobApplication) {
    setJobs(prev => {
      const exists = prev.some(j => j.id === updated.id);
      return exists ? prev.map(j => j.id === updated.id ? updated : j) : [updated, ...prev];
    });
    setView({ type: 'detail', id: updated.id });
  }

  function goBack() {
    if (view.type === 'form-job') {
      setView(view.id ? { type: 'detail', id: view.id } : { type: 'list' });
    } else if (view.type === 'form-round') {
      setView({ type: 'detail', id: view.jobId });
    } else {
      setView({ type: 'list' });
    }
  }

  function handleLogout() {
    clearAuth();
    setLoggedIn(false);
    setJobs([]);
    setView({ type: 'list' });
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <button className="logo-btn" onClick={() => setView({ type: 'list' })}>
            <span className="logo-icon">⌥</span>
            <span className="logo-text">面试日志</span>
          </button>
          <div className="header-right">
            {view.type === 'list' && (
              <button className="btn btn-primary header-new-btn" onClick={() => setView({ type: 'form-job' })}>
                + 新增投递
              </button>
            )}
            {view.type !== 'list' && (
              <button className="btn btn-ghost" onClick={goBack}>← 返回</button>
            )}
            <button className="btn-user" onClick={handleLogout} title={`${user?.phone ?? ''} 退出`}>
              {user?.phone?.slice(-4) ?? '我'}
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {view.type === 'list' && (
          <ListView
            jobs={jobs}
            onSelect={id => setView({ type: 'detail', id })}
            onNew={() => setView({ type: 'form-job' })}
            onDelete={id => setJobs(prev => deleteJob(prev, id))}
          />
        )}
        {view.type === 'detail' && currentJob && (
          <DetailView
            job={currentJob}
            onChange={updated => setJobs(prev => prev.map(j => j.id === updated.id ? updated : j))}
            onEdit={() => setView({ type: 'form-job', id: currentJob.id })}
            onAddRound={() => setView({ type: 'form-round', jobId: currentJob.id })}
            onEditRound={roundId => setView({ type: 'form-round', jobId: currentJob.id, roundId })}
            onDelete={() => { setJobs(prev => deleteJob(prev, currentJob.id)); setView({ type: 'list' }); }}
          />
        )}
        {view.type === 'form-job' && (
          <FormView
            mode={{ kind: 'job', job: currentJob }}
            onSave={handleSaveJob}
            onCancel={goBack}
          />
        )}
        {view.type === 'form-round' && currentJob && (
          <FormView
            mode={{
              kind: 'round',
              job: currentJob,
              round: view.roundId ? currentJob.rounds.find(r => r.id === view.roundId) : undefined,
            }}
            onSave={handleSaveJob}
            onCancel={goBack}
          />
        )}
      </main>
    </div>
  );
}
