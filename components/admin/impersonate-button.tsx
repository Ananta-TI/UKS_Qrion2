'use client';

import { useState } from 'react';
import { LogIn, Building2, ShieldAlert, X } from 'lucide-react';

interface ImpersonateButtonProps {
  schoolId: string;
  schoolName: string;
  accountEmail: string;
  action: (formData: FormData) => Promise<void>;
}

export function ImpersonateButton({
  schoolId,
  schoolName,
  accountEmail,
  action,
}: ImpersonateButtonProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn--soft btn--xs"
      >
        <LogIn className="ico" /> Login
      </button>

      {open && (
        <div className="overlay" style={{ zIndex: 100 }}>
          <div
            className="sheet"
            style={{ width: 'min(440px, 100%)' }}
            role="dialog"
            aria-modal="true"
          >
            <div className="sheet__head">
              <div>
                <div className="sheet__title text-lg">Masuk ke Akun Sekolah</div>
                <div className="sheet__sub">Konfirmasi pergantian sesi admin UKS</div>
              </div>
              <button
                type="button"
                className="ibtn"
                onClick={() => setOpen(false)}
                aria-label="Tutup"
                disabled={submitting}
              >
                <X className="ico" />
              </button>
            </div>

            <div className="sheet__body">
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                Anda akan masuk dan mengelola aplikasi UKS atas nama akun sekolah berikut:
              </p>

              <div className="p-3.5 rounded-2xl bg-[var(--well)] border border-[var(--line)]">
                <div className="flex items-center gap-2.5 font-semibold text-sm text-[var(--text)]">
                  <Building2 className="w-4 h-4 text-[var(--iris)] shrink-0" />
                  <span>{schoolName}</span>
                </div>
                <div className="text-xs text-[var(--muted)] mt-1.5 flex items-center gap-1.5">
                  <span>Akun:</span>
                  <b className="text-[var(--text)] font-medium">{accountEmail}</b>
                </div>
              </div>

              <div className="note" style={{ fontSize: '11.5px', marginTop: 4 }}>
                <ShieldAlert className="ico" />
                <div>
                  Aktivitas yang Anda lakukan di dashboard akan tercatat sebagai tindakan admin sekolah ini.
                </div>
              </div>
            </div>

            <div className="sheet__foot">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                Batal
              </button>
              <form
                action={async (formData) => {
                  setSubmitting(true);
                  try {
                    await action(formData);
                  } catch {
                    setSubmitting(false);
                  }
                }}
              >
                <input type="hidden" name="school_id" value={schoolId} />
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={submitting}
                >
                  <LogIn className="ico" /> {submitting ? 'Memproses…' : 'Ya, Masuk Sekarang'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
