import { redirect } from 'next/navigation';

export default async function StudentDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  // Detail siswa dipindahkan ke halaman kunjungan (rekam medis): /visits/[id]
  const { id } = await params;
  redirect(`/visits/${id}`);
}
