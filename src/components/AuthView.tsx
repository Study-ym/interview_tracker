import { useState } from 'react';
import { authApi } from '../api';
import { saveAuth } from '../auth';

interface Props {
  onLogin: () => void;
}

type Step = 'phone' | 'code';

export function AuthView({ onLogin }: Props) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  function startCountdown() {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSendCode() {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入正确的手机号');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authApi.sendCode(phone);
      setStep('code');
      startCountdown();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '发送失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (code.length !== 6) {
      setError('请输入 6 位验证码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { token, user } = await authApi.verifyCode(phone, code);
      saveAuth(token, user);
      onLogin();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '验证失败，请检查验证码');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">⌥</span>
          <span className="logo-text">面试日志</span>
        </div>
        <p className="auth-subtitle">记录每一次面试，复盘成长</p>

        {step === 'phone' ? (
          <div className="auth-form">
            <div className="auth-field">
              <label>手机号</label>
              <div className="phone-input-row">
                <span className="phone-prefix">+86</span>
                <input
                  className="input"
                  type="tel"
                  placeholder="请输入手机号"
                  value={phone}
                  maxLength={11}
                  onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleSendCode()}
                  autoFocus
                />
              </div>
            </div>
            {error && <span className="auth-error">{error}</span>}
            <button
              className="btn btn-primary auth-submit"
              onClick={handleSendCode}
              disabled={loading || phone.length !== 11}
            >
              {loading ? '发送中…' : '获取验证码'}
            </button>
          </div>
        ) : (
          <div className="auth-form">
            <p className="auth-hint">验证码已发送至 +86 {phone}</p>
            <div className="auth-field">
              <label>验证码</label>
              <input
                className="input auth-code-input"
                type="text"
                inputMode="numeric"
                placeholder="请输入 6 位验证码"
                value={code}
                maxLength={6}
                onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleVerify()}
                autoFocus
              />
            </div>
            {error && <span className="auth-error">{error}</span>}
            <button
              className="btn btn-primary auth-submit"
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
            >
              {loading ? '验证中…' : '登录'}
            </button>
            <button
              className="btn-link auth-resend"
              onClick={() => { setStep('phone'); setCode(''); setError(''); }}
              disabled={countdown > 0}
            >
              {countdown > 0 ? `${countdown}s 后重新发送` : '重新获取验证码'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
