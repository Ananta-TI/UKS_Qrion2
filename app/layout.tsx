import { Urbanist } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast';

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

const themeScript = `(function(d){try{var t=localStorage.getItem('uks:theme')||'light';if(t==='system'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}d.dataset.theme=t;var a=localStorage.getItem('uks:accent');if(a)d.dataset.accent=a;var n=localStorage.getItem('uks:density');if(n)d.dataset.density=n}catch(e){}})(document.documentElement);`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      data-theme="light"
      data-accent="ocean"
      className={urbanist.variable}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
