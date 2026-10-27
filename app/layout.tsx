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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={urbanist.variable}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
