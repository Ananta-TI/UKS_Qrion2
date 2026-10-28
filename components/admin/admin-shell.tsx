'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Building2, PlusCircle, LogOut } from 'lucide-react';

export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const onSchools = pathname === '/admin' || (pathname.startsWith('/admin/schools') && pathname !== '/admin/schools/new');

  return (
    <div className="adm">
      <aside className="adm__side">
        <Link href="/admin" prefetch={false} className="adm__brand">
          <Image src="/icon.png" alt="Qrion" width={40} height={40} className="adm__logo" priority />
          <span>
            <b>Qrion</b>
            <small>Super Admin</small>
          </span>
        </Link>

        <nav className="adm__nav" aria-label="Navigasi super admin">
          <Link href="/admin" prefetch={false} aria-current={onSchools ? 'page' : undefined}>
            <Building2 className="ico" strokeWidth={1.7} />
            <span>Sekolah</span>
          </Link>
          <Link
            href="/admin/schools/new"
            prefetch={false}
            aria-current={pathname === '/admin/schools/new' ? 'page' : undefined}
          >
            <PlusCircle className="ico" strokeWidth={1.7} />
            <span>Tambah Sekolah</span>
          </Link>
        </nav>

        <span className="adm__spacer" />

        <div className="adm__me">
          <small>Masuk sebagai</small>
          <b title={email}>{email}</b>
          <form action="/auth/signout" method="post" className="adm__outform">
            <button type="submit" className="adm__out">
              <LogOut className="ico" strokeWidth={1.7} /> Keluar
            </button>
          </form>
        </div>
      </aside>

      <main className="adm__main">{children}</main>
    </div>
  );
}
