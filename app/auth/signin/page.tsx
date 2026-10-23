import { SignInForm } from './signin-form';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <SignInForm initialError={error ?? null} />;
}
