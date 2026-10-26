'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGroup, motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { isSettingsActive, settingsNav } from '@/components/settings/nav';

const pillSpring = { type: 'spring' as const, stiffness: 520, damping: 40, mass: 0.6 };

export function SettingsRail() {
  const pathname = usePathname();

  return (
    <aside className="setrail" aria-label="Menu pengaturan">
      <LayoutGroup id="settings-rail">
        <nav className="setrail__nav">
          {settingsNav.map((item) => {
            const Icon = item.icon;
            const active = isSettingsActive(pathname, item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className="setrail__item"
                aria-current={active ? 'page' : undefined}
              >
                {active && (
                  <motion.span
                    layoutId="setrail-pill"
                    className="setrail__pill"
                    transition={pillSpring}
                    initial={false}
                  />
                )}
                <span className="setrail__ico">
                  <Icon className="ico" strokeWidth={1.7} />
                </span>
                <span className="setrail__text">
                  <b>{item.label}</b>
                  <small>{item.desc}</small>
                </span>
              </Link>
            );
          })}
        </nav>
      </LayoutGroup>
      <p className="setrail__note">
        <Lock className="ico" /> Preferensi tersimpan di akun ini.
      </p>
    </aside>
  );
}
