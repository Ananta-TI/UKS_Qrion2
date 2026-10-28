'use client';

import { useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { logClientActivity } from '@/lib/activity-client';
import { useRouter } from 'next/navigation';
import { LogIn, AlertCircle } from 'lucide-react';

export function SignInForm({ initialError }: { initialError: string | null }) {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }
    await logClientActivity({
      action: 'login',
      entity: 'session',
      summary: `Masuk ke aplikasi sebagai ${email}`,
      metadata: { method: 'password' },
    });
    setLoading(false);
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
            <Image
              src="/qrion-logo2.png"
              alt="Qrion"
              width={1081}
              height={347}
              priority
              className="brand__img"
            />
          </div>

          <div>
            <h1>Masuk ke Qrion</h1>
            <p className="text-sm" style={{ marginTop: 6 }}>Sistem informasi UKS untuk staf sekolah dan admin.</p>
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
