'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGroup, motion } from 'framer-motion';
import { isSettingsActive, settingsNav } from '@/components/settings/nav';

const pillSpring = { type: 'spring' as const, stiffness: 520, damping: 40, mass: 0.6 };

export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <LayoutGroup id="settings-tabs">
      <nav className="set-tabs" aria-label="Menu pengaturan">
        {settingsNav.map((item) => {
          const active = isSettingsActive(pathname, item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="chip"
              aria-current={active ? 'page' : undefined}
              aria-pressed={active}
            >
              {active && (
                <motion.span
                  layoutId="settabs-pill"
                  className="set-tabs__pill"
                  transition={pillSpring}
                  initial={false}
                />
              )}
              <span className="set-tabs__label">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </LayoutGroup>
  );
}
