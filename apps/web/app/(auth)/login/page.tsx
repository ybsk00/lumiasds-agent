'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const supabase = createSupabaseBrowserClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? '이메일 또는 비밀번호가 올바르지 않습니다.'
        : error.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setMessage('확인 이메일을 전송했습니다. 이메일을 확인해주세요.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-md bg-card rounded-lg border p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary">LumiAds</h1>
          <p className="text-sm text-muted-foreground mt-1">AI 마케팅 자동화 오케스트레이터</p>
        </div>

        {/* 탭 전환 */}
        <div className="flex mb-6 border-b">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); setMessage(''); }}
            className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
              mode === 'login'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(''); setMessage(''); }}
            className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
              mode === 'signup'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            회원가입
          </button>
        </div>

        <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
              {error}
            </div>
          )}

          {message && (
            <div className="p-3 bg-primary/10 text-primary text-sm rounded-md">
              {message}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full px-3 py-2 border rounded-md text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 (6자 이상)"
              className="w-full px-3 py-2 border rounded-md text-sm"
              required
              minLength={6}
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium mb-1">비밀번호 확인</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호 재입력"
                className="w-full px-3 py-2 border rounded-md text-sm"
                required
                minLength={6}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading
              ? (mode === 'login' ? '로그인 중...' : '가입 중...')
              : (mode === 'login' ? '로그인' : '회원가입')
            }
          </button>
        </form>
      </div>
    </div>
  );
}
