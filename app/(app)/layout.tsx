import { AppFrame } from '@/components/layout/app-frame';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppFrame>{children}</AppFrame>;
}
