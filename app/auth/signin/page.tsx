import { redirect } from 'next/navigation';
import { SignInForm } from './signin-form';
import { getSessionProfile } from '@/lib/auth';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { profile } = await getSessionProfile();
  if (profile) redirect(profile.role === 'super_admin' ? '/admin' : '/');

  const { error } = await searchParams;
  return <SignInForm initialError={error ?? null} />;
}
