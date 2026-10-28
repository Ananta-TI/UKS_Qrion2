import { Building2, Download, ShieldCheck } from 'lucide-react';

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
    href: '/settings/data',
    label: 'Data',
    desc: 'Ekspor data sekolah',
    icon: Download,
  },
];

export function isSettingsActive(pathname: string, href: string, exact?: boolean) {
  if (exact || href === '/settings') return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}
