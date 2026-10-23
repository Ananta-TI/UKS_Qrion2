import { AppShell } from '@/components/layout/app-shell';
import { SettingsTabs } from './settings-tabs';

export function SettingsShell({
  children,
  actions,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <AppShell
      title="Pengaturan"
      crumbs={[{ label: 'UKS', href: '/' }, { label: 'Pengaturan' }]}
      actions={actions}
    >
      <SettingsTabs />
      {children}
    </AppShell>
  );
}
