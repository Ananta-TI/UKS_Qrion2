'use client';

import { useEffect, useState, useTransition } from 'react';
import { LayoutGroup, motion } from 'framer-motion';
import {
  CalendarDays,
  CalendarRange,
  Check,
  LayoutList,
  List,
  Monitor,
  Moon,
  Palette,
  Rows3,
  Sun,
} from 'lucide-react';
import { SettingsShell } from '@/components/settings/settings-shell';
import { useToast } from '@/components/ui/toast';
import {
  defaultPreferences,
  type Accent,
  type CalendarStart,
  type Density,
  type ThemePref,
  type UserPreferences as Prefs,
} from '@/lib/user-prefs';
import { savePreferences } from '../preferences-actions';

const defaults: Prefs = defaultPreferences;
const pillSpring = { type: 'spring' as const, stiffness: 520, damping: 40, mass: 0.6 };

const themes: { key: ThemePref; label: string; desc: string; icon: typeof Sun }[] = [
  { key: 'light', label: 'Terang', desc: 'Selalu terang', icon: Sun },
  { key: 'dark', label: 'Gelap', desc: 'Selalu gelap', icon: Moon },
  { key: 'system', label: 'Sistem', desc: 'Ikut perangkat', icon: Monitor },
];

const accents: { key: Accent; label: string; color: string; dark: string }[] = [
  { key: 'ocean', label: 'Ocean', color: '#cfe4f7', dark: '#2e5f8a' },
  { key: 'mono', label: 'Mono', color: '#e4e4e7', dark: '#27272a' },
  { key: 'sage', label: 'Sage', color: '#cfe6d8', dark: '#2a7f4d' },
  { key: 'coral', label: 'Coral', color: '#f3cabb', dark: '#c9542b' },
  { key: 'amber', label: 'Amber', color: '#f2e0b4', dark: '#a87300' },
];

const densities: { key: Density; label: string; desc: string; icon: typeof List }[] = [
  { key: 'comfortable', label: 'Nyaman', desc: 'Jarak antar kartu lebih lega.', icon: LayoutList },
  { key: 'compact', label: 'Padat', desc: 'Lebih banyak data di satu layar.', icon: List },
];

const calendars: { key: CalendarStart; label: string; desc: string; icon: typeof CalendarDays }[] = [
  { key: 'monday', label: 'Senin', desc: 'Awal minggu kerja.', icon: CalendarRange },
  { key: 'sunday', label: 'Minggu', desc: 'Awal minggu kalender.', icon: CalendarDays },
];

function applyTheme(theme: ThemePref) {
  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.themePref = theme;
}

function applyPrefs(prefs: Prefs) {
  applyTheme(prefs.theme);
  document.documentElement.dataset.accent = prefs.accent;
  document.documentElement.dataset.density = prefs.density;
}

export default function AppearanceForm({ initialPrefs }: { initialPrefs: Prefs }) {
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs);
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    if (prefs.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [prefs.theme]);

  /** Terapkan langsung di layar, lalu simpan ke akun yang sedang login. */
  function update(patch: Partial<Prefs>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    applyPrefs(next);

    startTransition(async () => {
      setSaving(true);
      const result = await savePreferences(patch);
      setSaving(false);
      if (!result.ok) {
        toast.error(result.error ?? 'Preferensi gagal disimpan ke akun ini.');
      }
    });
  }

  const chooseTheme = (theme: ThemePref) => update({ theme });
  const chooseAccent = (accent: Accent) => update({ accent });
  const chooseDensity = (density: Density) => update({ density });
  const chooseCalendar = (calendar: CalendarStart) => update({ calendar });

  function reset() {
    update(defaults);
  }

  return (
    <SettingsShell
      actions={
        <span className="spill spill--iris">
          <i />
          {saving ? 'Menyimpan…' : 'Tersimpan di akun ini'}
        </span>
      }
    >
      <div className="set-grid">
        <div className="set-stack">
          <section className="card">
            <div className="card__head">
              <div className="card__title">
                <Sun className="ico" />
                <span>
                  Tema
                  <span className="card__sub">Pilih tampilan dasar aplikasi.</span>
                </span>
              </div>
              <button type="button" className="btn btn--ghost btn--xs" onClick={reset}>
                Reset
              </button>
            </div>

            <div className="set-themes">
              {themes.map((theme) => {
                const Icon = theme.icon;
                const active = prefs.theme === theme.key;
                return (
                  <button
                    key={theme.key}
                    type="button"
                    className={active ? 'set-theme is-active' : 'set-theme'}
                    onClick={() => chooseTheme(theme.key)}
                    aria-pressed={active}
                  >
                    <span className={`set-theme__preview set-theme__preview--${theme.key}`}>
                      <span className="set-theme__rail" />
                      <span className="set-theme__canvas">
                        <span className="set-theme__bar" />
                        <span className="set-theme__cards">
                          <i />
                          <i />
                          <i />
                        </span>
                        <span className="set-theme__line" />
                        <span className="set-theme__line set-theme__line--short" />
                      </span>
                    </span>
                    <span className="set-theme__label">
                      <span>
                        <Icon className="ico" />
                        {theme.label}
                      </span>
                      {active ? <Check className="ico" /> : <small>{theme.desc}</small>}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="card">
            <div className="card__head">
              <div className="card__title">
                <Palette className="ico" />
                <span>
                  Warna aksen 
                  <span className="card__sub"> Gunakan warna yang paling nyaman dilihat.</span>
                </span>
              </div>
            </div>

            <LayoutGroup id="set-accents">
              <div className="set-accents">
                {accents.map((accent) => {
                  const active = prefs.accent === accent.key;
                  return (
                    <button
                      key={accent.key}
                      type="button"
                      className={active ? 'set-accent is-active' : 'set-accent'}
                      onClick={() => chooseAccent(accent.key)}
                      aria-pressed={active}
                    >
                      {active && (
                        <motion.span
                          layoutId="set-accent-pill"
                          className="set-accent__pill"
                          transition={pillSpring}
                          initial={false}
                        />
                      )}
                      <span
                        className="set-accent__dot"
                        style={{
                          background: `conic-gradient(from 90deg, ${accent.color} 0 50%, ${accent.dark} 50% 100%)`,
                        }}
                      />
                      <b>{accent.label}</b>
                      {active && <Check className="ico" />}
                    </button>
                  );
                })}
              </div>
            </LayoutGroup>
          </section>

          <section className="card">
            <div className="card__head">
              <div className="card__title">
                <Rows3 className="ico" />
                <span>
                  Kerapatan
                  <span className="card__sub">Atur jarak antarelemen di seluruh halaman.</span>
                </span>
              </div>
            </div>

            <LayoutGroup id="set-density">
              <div className="set-choices">
                {densities.map((density) => {
                  const Icon = density.icon;
                  const active = prefs.density === density.key;
                  return (
                    <button
                      key={density.key}
                      type="button"
                      className={active ? 'set-choice is-active' : 'set-choice'}
                      onClick={() => chooseDensity(density.key)}
                      aria-pressed={active}
                    >
                      {active && (
                        <motion.span
                          layoutId="set-density-pill"
                          className="set-choice__pill"
                          transition={pillSpring}
                          initial={false}
                        />
                      )}
                      <span className="set-choice__ico">
                        <Icon className="ico" />
                      </span>
                      <span className="set-choice__text">
                        <b>{density.label}</b>
                        <small>{density.desc}</small>
                      </span>
                      {active && <Check className="ico" />}
                    </button>
                  );
                })}
              </div>
            </LayoutGroup>
          </section>

          <section className="card">
            <div className="card__head">
              <div className="card__title">
                <CalendarDays className="ico" />
                <span>
                  Awal minggu
                  <span className="card__sub">Berlaku pada kalender dan ringkasan laporan.</span>
                </span>
              </div>
            </div>

            <LayoutGroup id="set-calendar">
              <div className="set-choices">
                {calendars.map((calendar) => {
                  const Icon = calendar.icon;
                  const active = prefs.calendar === calendar.key;
                  return (
                    <button
                      key={calendar.key}
                      type="button"
                      className={active ? 'set-choice is-active' : 'set-choice'}
                      onClick={() => chooseCalendar(calendar.key)}
                      aria-pressed={active}
                    >
                      {active && (
                        <motion.span
                          layoutId="set-calendar-pill"
                          className="set-choice__pill"
                          transition={pillSpring}
                          initial={false}
                        />
                      )}
                      <span className="set-choice__ico">
                        <Icon className="ico" />
                      </span>
                      <span className="set-choice__text">
                        <b>{calendar.label}</b>
                        <small>{calendar.desc}</small>
                      </span>
                      {active && <Check className="ico" />}
                    </button>
                  );
                })}
              </div>
            </LayoutGroup>
          </section>
        </div>

        <aside className="card set-live">
          <div className="card__head">
            <div className="card__title">
              <Monitor className="ico" />
              <span>
                Pratinjau langsung
                <span className="card__sub">Contoh tampilan dashboard UKS.</span>
              </span>
            </div>
          </div>

          <div className="set-live__window">
            <div className="set-live__top">
              <span className="set-live__brand">
                <i />
                UKS
              </span>
              <span className="set-live__dots">
                <i />
                <i />
                <i />
              </span>
            </div>
            <div className="set-live__body">
              <div className="set-live__stat">
                <small>Kunjungan hari ini</small>
                <b>18</b>
                <span className="set-live__trend">+12%</span>
              </div>
              <div className="set-live__chart" aria-hidden="true">
                <i style={{ height: '38%' }} />
                <i style={{ height: '62%' }} />
                <i style={{ height: '48%' }} />
                <i style={{ height: '78%' }} />
                <i style={{ height: '56%' }} />
                <i style={{ height: '88%' }} />
              </div>
              <div className="set-live__row">
                <span className="set-live__avatar">AR</span>
                <span>
                  <b>Alya Rahma</b>
                  <small>Keluhan ringan · 08:42</small>
                </span>
                <span className="set-live__tag">Selesai</span>
              </div>
              <div className="set-live__row">
                <span className="set-live__avatar">BP</span>
                <span>
                  <b>Bima Pratama</b>
                  <small>Stok obat · 09:15</small>
                </span>
                <span className="set-live__tag set-live__tag--muted">Dipantau</span>
              </div>
            </div>
          </div>

          <p className="set-hint">
            <Palette className="ico" />
            Tema, aksen, dan kerapatan langsung diterapkan tanpa memuat ulang halaman.
          </p>
        </aside>
      </div>
    </SettingsShell>
  );
}
