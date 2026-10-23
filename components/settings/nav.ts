import { Bell, Building2, Download, Plug, ShieldCheck, SunMoon } from 'lucide-react';

export const settingsNav = [
  {
    href: '/settings',
    label: 'Profil Sekolah',
    desc: 'Nama, alamat, kontak',
    icon: Building2,
    exact: true,
  },
  {
    href: '/settings/users',
    label: 'Pengguna & peran',
    desc: 'Siapa yang bisa melihat',
    icon: ShieldCheck,
  },
  {
    href: '/settings/notifications',
    label: 'Notifikasi',
    desc: 'Apa yang masuk ke lonceng',
    icon: Bell,
  },
  {
    href: '/settings/appearance',
    label: 'Tampilan',
    desc: 'Tema, aksen, kerapatan',
    icon: SunMoon,
  },
  {
    href: '/settings/integrations',
    label: 'Integrasi',
    desc: 'Layanan & terminal',
    icon: Plug,
  },
  {
    href: '/settings/data',
    label: 'Data',
    desc: 'Ekspor atau mulai ulang',
    icon: Download,
  },
];

export function isSettingsActive(pathname: string, href: string, exact?: boolean) {
  if (exact || href === '/settings') return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}
