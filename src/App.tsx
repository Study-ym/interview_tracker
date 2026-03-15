import { useState, useEffect } from 'react';
import type { JobApplication } from './types';
import { loadJobs, saveJobs, deleteJob, deleteJobOnServer, syncFromServer, updateRoundOnServer, updateRound } from './store';
import { ListView } from './components/ListView';
import { DetailView } from './components/DetailView';
import { FormView } from './components/FormView';
import { AuthView } from './components/AuthView';
import { ExperienceView } from './components/ExperienceView';
import { ProfileView } from './components/ProfileView';
import { isLoggedIn, clearAuth, getUser } from './auth';
import { AUTH_LOGOUT_EVENT } from './api';
import './App.css';

type TabId = 'home' | 'notes' | 'me';
type View =
  | { type: 'list' }
  | { type: 'detail'; id: string }
  | { type: 'form-job'; id?: string }
  | { type: 'form-round'; jobId: string; roundId?: string; didAutoPassPrevious?: boolean };

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => isLoggedIn());
  const [jobs, setJobs] = useState<JobApplication[]>(() => loadJobs());
  const [tab, setTab] = useState<TabId>('home');
  const [view, setView] = useState<View>({ type: 'list' });

  // 登录后从服务器同步数据
  useEffect(() => {
    if (loggedIn) {
      syncFromServer()
        .then(serverJobs => setJobs(serverJobs))
        .catch(err => console.error('同步失败:', err));
    }
  }, [loggedIn]);

  // 任意接口返回 401 时统一退登并回到登录页
  useEffect(() => {
    const onLogout = () => setLoggedIn(false);
    window.addEventListener(AUTH_LOGOUT_EVENT, onLogout);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, onLogout);
  }, []);

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

  async function handleDeleteJob(id: string) {
    try {
      await deleteJobOnServer(id);
      setJobs(prev => deleteJob(prev, id));
      setView(v => {
        if (v.type === 'list') return v;
        const currentId = v.type === 'detail' ? v.id : v.type === 'form-job' ? v.id : v.jobId;
        return currentId === id ? { type: 'list' as const } : v;
      });
    } catch (e) {
      console.error('删除失败', e);
    }
  }

  function goHome() {
    setTab('home');
    setView({ type: 'list' });
  }

  function handleSelectJobFromNotes(jobId: string) {
    setTab('home');
    setView({ type: 'detail', id: jobId });
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <button className="logo-btn" onClick={goHome}>
            <span className="logo-icon">⌥</span>
            <span className="logo-text">面试日志</span>
          </button>
          <div className="header-right">
            {tab === 'home' && view.type === 'list' && (
              <button className="btn btn-primary header-new-btn" onClick={() => setView({ type: 'form-job' })}>
                + 新增投递
              </button>
            )}
            {tab === 'home' && view.type !== 'list' && (
              <button className="btn btn-ghost" onClick={goBack}>← 返回</button>
            )}
            <button className="btn-user" onClick={handleLogout} title={`${user?.phone ?? ''} 退出`}>
              {user?.phone?.slice(-4) ?? '我'}
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {tab === 'home' && (
          <>
            {view.type === 'list' && (
              <ListView
                jobs={jobs}
                onSelect={id => setView({ type: 'detail', id })}
                onNew={() => setView({ type: 'form-job' })}
                onDelete={id => void handleDeleteJob(id)}
              />
            )}
            {view.type === 'detail' && currentJob && (
              <DetailView
                job={currentJob}
                onChange={updated => setJobs(prev => prev.map(j => j.id === updated.id ? updated : j))}
                onEdit={() => setView({ type: 'form-job', id: currentJob.id })}
                onAddRound={async () => {
              const job = currentJob;
              let didAutoPassPrevious = false;
              if (job.rounds.length > 0) {
                const last = job.rounds[job.rounds.length - 1];
                if (last.status !== 'passed') {
                  try {
                    const updated = await updateRoundOnServer(job.id, { ...last, status: 'passed' });
                    setJobs(prev => prev.map(j => j.id === job.id ? updateRound(j, updated) : j));
                    didAutoPassPrevious = true;
                  } catch (e) {
                    console.error('置上一轮为通过失败', e);
                  }
                }
              }
              setView({ type: 'form-round', jobId: job.id, didAutoPassPrevious });
            }}
                onEditRound={roundId => setView({ type: 'form-round', jobId: currentJob.id, roundId })}
                onDelete={() => void handleDeleteJob(currentJob.id)}
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
              didAutoPassPrevious: view.didAutoPassPrevious,
            }}
            onSave={handleSaveJob}
            onCancel={goBack}
          />
        )}
          </>
        )}
        {tab === 'notes' && (
          <ExperienceView
            jobs={jobs}
            onSelectJob={handleSelectJobFromNotes}
            onGoHome={goHome}
          />
        )}
        {tab === 'me' && (
          <ProfileView user={user} jobs={jobs} onLogout={handleLogout} />
        )}
      </main>

      <nav className="tab-bar">
        <button
          type="button"
          className={`tab-item ${tab === 'home' ? 'tab-item-active' : ''}`}
          onClick={() => setTab('home')}
        >
          <span className="tab-icon">📋</span>
          <span className="tab-label">主页</span>
        </button>
        <button
          type="button"
          className={`tab-item ${tab === 'notes' ? 'tab-item-active' : ''}`}
          onClick={() => setTab('notes')}
        >
          <span className="tab-icon">📚</span>
          <span className="tab-label">面经</span>
        </button>
        <button
          type="button"
          className={`tab-item ${tab === 'me' ? 'tab-item-active' : ''}`}
          onClick={() => setTab('me')}
        >
          <span className="tab-icon">👤</span>
          <span className="tab-label">个人</span>
        </button>
      </nav>
    </div>
  );
}
