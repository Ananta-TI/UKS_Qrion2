'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, PlusCircle, LogOut, ShieldCheck } from 'lucide-react';

export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const onSchools = pathname === '/admin' || (pathname.startsWith('/admin/schools') && pathname !== '/admin/schools/new');

  return (
    <div className="adm">
      <aside className="adm__side">
        <Link href="/admin" className="adm__brand">
          <span className="adm__mark">
            <ShieldCheck className="ico" strokeWidth={1.8} />
          </span>
          <span>
            <b>Qrion</b>
            <small>Super Admin</small>
          </span>
        </Link>

        <nav className="adm__nav" aria-label="Navigasi super admin">
          <Link href="/admin" aria-current={onSchools ? 'page' : undefined}>
            <Building2 className="ico" strokeWidth={1.7} />
            <span>Sekolah</span>
          </Link>
          <Link href="/admin/schools/new" aria-current={pathname === '/admin/schools/new' ? 'page' : undefined}>
            <PlusCircle className="ico" strokeWidth={1.7} />
            <span>Tambah Sekolah</span>
          </Link>
        </nav>

        <span className="adm__spacer" />

        <div className="adm__me">
          <small>Masuk sebagai</small>
          <b title={email}>{email}</b>
          <Link href="/auth/signout" className="adm__out">
            <LogOut className="ico" strokeWidth={1.7} /> Keluar
          </Link>
        </div>
      </aside>

      <main className="adm__main">{children}</main>
    </div>
  );
}
