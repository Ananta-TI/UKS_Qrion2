'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { HeartPulse, LogIn, AlertCircle } from 'lucide-react';

export default function SignInPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push('/');
    router.refresh();
  }

  return (
    <>
      <div className="mesh" aria-hidden="true">
        <i className="mesh__a" />
        <i className="mesh__b" />
        <i className="mesh__c" />
      </div>

      <div className="signin">
        <div className="signin__card">
          <div className="flex items-center gap-3">
            <span className="brand__mark" aria-hidden="true">
              <HeartPulse />
            </span>
            <span className="brand__text">
              <b>UKS</b>
              <small>Sehat Sekolah</small>
            </span>
          </div>

          <div>
            <h1>Masuk Staf UKS</h1>
            <p className="text-sm" style={{ marginTop: 6 }}>Akses internal petugas UKS sekolah.</p>
          </div>

          <form onSubmit={handleLogin} className="grid gap-4">
            {error && (
              <div className="note note--bad">
                <AlertCircle className="ico" />
                <div>{error}</div>
              </div>
            )}

            <div className="field">
              <label className="field__label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staf@sekolah.id"
                autoComplete="email"
                required
              />
            </div>

            <div className="field">
              <label className="field__label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn--primary w-full">
              <LogIn className="ico" /> {loading ? 'Memproses…' : 'Masuk'}
            </button>
          </form>

          <div className="note">
            <AlertCircle className="ico" />
            <div>Hubungi admin sekolah bila lupa password atau belum punya akun.</div>
          </div>
        </div>
      </div>
    </>
  );
}
