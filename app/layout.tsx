import { Urbanist } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast';
import { getPreferences } from '@/lib/preferences';

const urbanist = Urbanist({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-urbanist',
  display: 'swap',
});

export const metadata = {
  title: 'UKS Sisfo — Sistem Informasi Kesehatan Sekolah',
  description: 'Aplikasi internal untuk Staf/Petugas UKS',
};

// Hanya dipakai untuk preferensi "Sistem"; tema eksplisit sudah dirender server-side per akun.
const systemThemeScript = `(function(d){try{if(d.dataset.themePref!=='system')return;var m=matchMedia('(prefers-color-scheme: dark)');var s=function(){d.dataset.theme=m.matches?'dark':'light'};s();m.addEventListener('change',s)}catch(e){}})(document.documentElement);`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const prefs = await getPreferences();
  const theme = prefs.theme === 'system' ? 'light' : prefs.theme;

  return (
    <html
      lang="id"
      data-theme={theme}
      data-theme-pref={prefs.theme}
      data-accent={prefs.accent}
      data-density={prefs.density}
      className={urbanist.variable}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: systemThemeScript }} />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
