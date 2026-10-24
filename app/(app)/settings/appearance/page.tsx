import { getPreferences } from '@/lib/preferences';
import AppearanceForm from './appearance-form';

export default async function SettingsAppearancePage() {
  const prefs = await getPreferences();
  return <AppearanceForm initialPrefs={prefs} />;
}
