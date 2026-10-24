export type ThemePref = 'light' | 'dark' | 'system';
export type Accent = 'ocean' | 'mono' | 'sage' | 'coral' | 'amber';
export type Density = 'comfortable' | 'compact';
export type CalendarStart = 'sunday' | 'monday';

export type UserPreferences = {
  theme: ThemePref;
  accent: Accent;
  density: Density;
  calendar: CalendarStart;
};

export const defaultPreferences: UserPreferences = {
  theme: 'light',
  accent: 'ocean',
  density: 'comfortable',
  calendar: 'monday',
};

export const accentKeys: Accent[] = ['ocean', 'mono', 'sage', 'coral', 'amber'];
export const themeKeys: ThemePref[] = ['light', 'dark', 'system'];
export const densityKeys: Density[] = ['comfortable', 'compact'];
export const calendarKeys: CalendarStart[] = ['monday', 'sunday'];

export function sanitizePreferences(input: Partial<UserPreferences> | null | undefined): UserPreferences {
  return {
    theme: themeKeys.includes(input?.theme as ThemePref)
      ? (input?.theme as ThemePref)
      : defaultPreferences.theme,
    accent: accentKeys.includes(input?.accent as Accent)
      ? (input?.accent as Accent)
      : defaultPreferences.accent,
    density: densityKeys.includes(input?.density as Density)
      ? (input?.density as Density)
      : defaultPreferences.density,
    calendar: calendarKeys.includes(input?.calendar as CalendarStart)
      ? (input?.calendar as CalendarStart)
      : defaultPreferences.calendar,
  };
}

/** Preferensi disimpan di metadata akun Supabase, jadi setiap akun punya pilihannya sendiri. */
export function readPreferences(metadata: unknown): UserPreferences {
  const raw = (metadata as Record<string, unknown> | null)?.ui_prefs;
  if (!raw || typeof raw !== 'object') return { ...defaultPreferences };
  return sanitizePreferences(raw as Partial<UserPreferences>);
}
