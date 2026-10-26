import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export type Crumb = { label: string; href?: string };

export function AppShell({
  title,
  crumbs,
  actions,
  children,
}: {
  title: string;
  crumbs?: Crumb[];
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const trail: Crumb[] = crumbs ?? [{ label: 'UKS', href: '/' }, { label: title }];

  return (
    <>
      <div className="phead page-enter">
        <div className="phead__lead">
          <nav className="crumbs" aria-label="Breadcrumb">
            {trail.map((c, i) => {
              const last = i === trail.length - 1;
              return (
                <span key={i} className="inline-flex items-center gap-1.5">
                  {c.href && !last ? (
                    <Link href={c.href} prefetch={false}>{c.label}</Link>
                  ) : (
                    <span aria-current={last ? 'page' : undefined}>{c.label}</span>
                  )}
                  {!last && <ChevronRight className="ico" style={{ width: 14, height: 14, opacity: 0.6 }} />}
                </span>
              );
            })}
          </nav>
          <h1 className="top__title">{title}</h1>
        </div>
        {actions ? <div className="phead__actions">{actions}</div> : null}
      </div>

      <div className="view page-enter">{children}</div>
    </>
  );
}
