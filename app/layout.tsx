import { Urbanist } from 'next/font/google';
import './globals.css';

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

const themeScript = `(function(d){try{var t=localStorage.getItem('uks:theme')||'light';if(t==='system'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}d.dataset.theme=t}catch(e){}d.dataset.accent='ocean'})(document.documentElement);`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" data-theme="light" data-accent="ocean" className={urbanist.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
