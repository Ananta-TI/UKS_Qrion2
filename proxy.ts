import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware hanya memverifikasi sesi dari claims JWT (ES256, verifikasi lokal).
 * Pengecekan role dan status sekolah dilakukan di layout server, sehingga
 * setiap navigasi tidak lagi menunggu query database di middleware.
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // API memeriksa sesinya sendiri dan membalas JSON 401/403.
  if (pathname.startsWith('/api')) {
    return NextResponse.next({ request: { headers: request.headers } });
  }

  // Halaman auth tidak perlu diverifikasi; page-nya yang mengarahkan user
  // yang sudah punya sesi ke halaman yang tepat.
  if (pathname.startsWith('/auth')) {
    return NextResponse.next({ request: { headers: request.headers } });
  }

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

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub ?? null;

  if (!userId) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/signin';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)'],
};
