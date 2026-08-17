import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const path = request.nextUrl.pathname;

  // Public routes — skip ALL auth checks and return immediately
  if (
    path.startsWith('/privacy') ||
    path.startsWith('/terms') ||
    path.startsWith('/support') ||
    path.startsWith('/onboarding')   // wizard handles its own auth internally
  ) {
    return supabaseResponse;
  }

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  console.log(`[Middleware] Path: ${path}, User: ${user?.email || 'none'}, Error: ${userErr?.message || 'none'}`);

  // Public routes — always accessible without authentication
  const isPublicRoute = path.startsWith('/privacy') ||
                        path.startsWith('/terms') ||
                        path.startsWith('/support');

  const isProtectedRoute = !isPublicRoute && (
    path.startsWith('/dashboard') || 
    path.startsWith('/search') || 
    path.startsWith('/bookings') || 
    path.startsWith('/messages') ||
    path.startsWith('/profile') ||
    path.startsWith('/settings') ||
    path.startsWith('/availability') ||
    path.startsWith('/notifications')
  );

  const isAdminRoute = path.startsWith('/admin');

  if (!user && (isProtectedRoute || isAdminRoute)) {
    console.log(`[Middleware] Redirecting unauthenticated user from ${path} to /login`);
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAdminRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      console.log(`[Middleware] Redirecting non-admin user ${user.email} to /dashboard`);
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  const isAuthRoute = path.startsWith('/login') || path.startsWith('/register') || path.startsWith('/forgot-password');
  if (user && isAuthRoute) {
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    console.log(`[Middleware] Auth Route check: Profile: ${JSON.stringify(profile)}, Error: ${profErr?.message || 'none'}`);

    if (profile) {
      console.log(`[Middleware] Redirecting authenticated user ${user.email} from auth route ${path} to /dashboard`);
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    } else {
      console.log(`[Middleware] User exists but has no profile row. Allowing to stay on ${path}`);
    }
  }

  return supabaseResponse;
}
