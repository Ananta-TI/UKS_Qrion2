import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith('/auth');

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/signin';
    return NextResponse.redirect(url);
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .maybeSingle();

    const role = profile?.role ?? 'staff';
    const isAdminRoute = pathname.startsWith('/admin');

    if (isAdminRoute && role !== 'super_admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    if (role !== 'super_admin' && profile?.school_id && !isAuthRoute) {
      const { data: school } = await supabase
        .from('schools')
        .select('is_active')
        .eq('id', profile.school_id)
        .maybeSingle();

      if (school && school.is_active === false) {
        const url = request.nextUrl.clone();
        url.pathname = '/auth/signout';
        return NextResponse.redirect(url);
      }
    }

    if (role === 'super_admin' && !isAdminRoute && !isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }

    if (pathname === '/auth/signin') {
      const url = request.nextUrl.clone();
      url.pathname = role === 'super_admin' ? '/admin' : '/';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)'],
};
