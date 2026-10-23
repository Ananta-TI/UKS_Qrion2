import Link from 'next/link';
import { ArrowUpRight, CreditCard, FileSpreadsheet, MessageCircle, Plug, Webhook } from 'lucide-react';
import { SettingsShell } from '@/components/settings/settings-shell';

const integrations = [
  {
    icon: MessageCircle,
    title: 'Pengingat WhatsApp',
    desc: 'Kirim ringkasan kunjungan dan pengingat obat ke orang tua atau wali.',
    tone: 'spill--teal',
  },
  {
    icon: FileSpreadsheet,
    title: 'Google Sheets',
    desc: 'Sinkronkan data siswa, kunjungan, dan inventaris ke spreadsheet sekolah.',
    tone: 'spill--iris',
  },
  {
    icon: CreditCard,
    title: 'BPJS & faskes rujukan',
    desc: 'Simpan nomor rujukan dan status klaim pada catatan kunjungan.',
    tone: 'spill--amber',
  },
  {
    icon: Webhook,
    title: 'API & webhook',
    desc: 'Hubungkan UKS dengan sistem akademik atau aplikasi sekolah lain.',
    tone: 'spill--coral',
  },
];

export default function SettingsIntegrationsPage() {
  return (
    <SettingsShell
      actions={
        <span className="spill">
          <i />
          Segera hadir
        </span>
      }
    >
      <div className="set-grid set-grid--single">
        <section className="card">
          <div className="card__head">
            <div className="card__title">
              <Plug className="ico" />
              <span>
                Integrasi layanan
                <span className="card__sub">Hubungkan UKS dengan layanan yang dipakai sekolah.</span>
              </span>
            </div>
          </div>

          <div className="set-ints">
            {integrations.map((item) => {
              const Icon = item.icon;
              return (
                <div className="set-int" key={item.title}>
                  <span className={`set-int__ico ${item.tone}`}>
                    <Icon className="ico" strokeWidth={1.7} />
                  </span>
                  <div className="set-int__text">
                    <b>{item.title}</b>
                    <small>{item.desc}</small>
                  </div>
                  <span className="badge badge--plain">Segera hadir</span>
                </div>
              );
            })}
          </div>

          <div className="set-note">
            <Plug className="ico" />
            <div>
              <b>Butuh integrasi tertentu?</b>
              <p>Ceritakan alur kerja sekolah Anda; tim Qrion akan membantu menilai kebutuhan integrasinya.</p>
            </div>
            <Link href="/support" className="btn btn--ghost btn--sm">
              Ajukan integrasi
              <ArrowUpRight className="ico" />
            </Link>
          </div>
        </section>

        <section className="card">
          <div className="card__head">
            <div className="card__title">
              <Plug className="ico" />
              <span>
                Ketersediaan
                <span className="card__sub">Integrasi dirilis bertahap dan diaktifkan oleh admin Qrion.</span>
              </span>
            </div>
          </div>
          <div className="note">
            <Plug className="ico" />
            <span>
              Tidak ada kredensial pihak ketiga yang disimpan sampai integrasi diaktifkan. Anda tetap dapat
              mengekspor data kapan saja dari menu Data.
            </span>
          </div>
        </section>
      </div>
    </SettingsShell>
  );
}
