'use client';

import { useEffect, useState } from 'react';
import { Bell, CalendarClock, Mail, Package, Stethoscope, Volume2 } from 'lucide-react';
import { SettingsShell } from '@/components/settings/settings-shell';

const storageKey = 'uks:notifications';

const defaults = {
  newVisit: true,
  lowStock: true,
  expiring: true,
  dailyDigest: false,
  emailAlerts: false,
  sound: false,
};

type PrefKey = keyof typeof defaults;

const items: {
  key: PrefKey;
  group: 'Aktivitas' | 'Ringkasan';
  title: string;
  desc: string;
  icon: typeof Bell;
}[] = [
  {
    key: 'newVisit',
    group: 'Aktivitas',
    title: 'Kunjungan baru',
    desc: 'Beri tahu saat siswa dicatat masuk ke UKS.',
    icon: Stethoscope,
  },
  {
    key: 'lowStock',
    group: 'Aktivitas',
    title: 'Stok menipis',
    desc: 'Peringatan saat stok obat menyentuh batas minimum.',
    icon: Package,
  },
  {
    key: 'expiring',
    group: 'Aktivitas',
    title: 'Obat mendekati kedaluwarsa',
    desc: 'Pengingat 30 hari sebelum tanggal kedaluwarsa.',
    icon: CalendarClock,
  },
  {
    key: 'dailyDigest',
    group: 'Ringkasan',
    title: 'Ringkasan harian',
    desc: 'Rekap kunjungan dan stok setiap akhir hari.',
    icon: Bell,
  },
  {
    key: 'emailAlerts',
    group: 'Ringkasan',
    title: 'Salinan email',
    desc: 'Kirim peringatan penting ke email akun sekolah.',
    icon: Mail,
  },
  {
    key: 'sound',
    group: 'Ringkasan',
    title: 'Suara notifikasi',
    desc: 'Bunyikan nada singkat saat notifikasi masuk.',
    icon: Volume2,
  },
];

export default function SettingsNotificationsPage() {
  const [prefs, setPrefs] = useState(defaults);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Record<PrefKey, boolean>>;
        const next = { ...defaults };
        for (const key of Object.keys(defaults) as PrefKey[]) {
          if (typeof parsed[key] === 'boolean') next[key] = parsed[key] as boolean;
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPrefs(next);
      }
    } catch {}
    setReady(true);
  }, []);

  function toggle(key: PrefKey) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  }

  function reset() {
    setPrefs(defaults);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }

  const groups = ['Aktivitas', 'Ringkasan'] as const;

  return (
    <SettingsShell
      actions={
        <span className="spill spill--teal">
          <i />
          Disimpan otomatis
        </span>
      }
    >
      <div className="set-grid set-grid--single">
        {groups.map((group) => (
          <section className="card set-notif" key={group}>
            <div className="card__head">
              <div className="card__title">
                <Bell className="ico" />
                <span>
                  Notifikasi {group.toLowerCase()}
                  <span className="card__sub">
                    {group === 'Aktivitas'
                      ? 'Pilih kejadian yang perlu masuk ke lonceng.'
                      : 'Atur rekap dan kanal pengingat.'}
                  </span>
                </span>
              </div>
            </div>

            <div className="set-rows">
              {items
                .filter((item) => item.group === group)
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <div className="set-row" key={item.key}>
                      <span className="set-row__ico">
                        <Icon className="ico" strokeWidth={1.7} />
                      </span>
                      <div className="set-row__text">
                        <b>{item.title}</b>
                        <small>{item.desc}</small>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={prefs[item.key]}
                        aria-label={item.title}
                        className="set-switch"
                        onClick={() => toggle(item.key)}
                        disabled={!ready}
                      />
                    </div>
                  );
                })}
            </div>
          </section>
        ))}

        <div className="set-foot set-foot--plain">
          <span className="set-hint">
            <Bell className="ico" />
            Preferensi ini tersimpan di browser ini dan tidak mengubah data sekolah.
          </span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={reset}>
            Kembalikan default
          </button>
        </div>
      </div>
    </SettingsShell>
  );
}
