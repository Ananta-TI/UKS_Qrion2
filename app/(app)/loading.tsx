/**
 * Loading boundary untuk seluruh area (app). Header dirender oleh layout
 * (AppFrame) sehingga tidak perlu diulang di sini — cukup kerangka isi
 * halaman agar transisi tidak menggeser layout saat halaman selesai dimuat.
 */
export default function Loading() {
  return (
    <>
      <div className="view page-skeleton" aria-busy="true">
        <span className="sr-only">Memuat halaman…</span>
        <div className="kpis">
          {Array.from({ length: 4 }, (_, i) => (
            <div className="stat" key={i}>
              <div className="skel skel--line" style={{ width: '55%' }} />
              <div className="skel skel--value" />
              <div className="skel skel--line" style={{ width: '38%' }} />
            </div>
          ))}
        </div>
        <div className="page-skeleton__cards">
          <div className="card page-skeleton__panel">
            <div className="skel skel--line" style={{ width: '34%' }} />
            <div className="skel skel--chart" />
          </div>
          <div className="card page-skeleton__panel">
            <div className="skel skel--line" style={{ width: '46%' }} />
            <div className="skel skel--chart" />
          </div>
        </div>
      </div>
    </>
  );
}
