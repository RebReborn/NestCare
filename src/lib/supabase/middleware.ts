import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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

  // 1. Always allow system/static asset endpoints and maintenance route
  if (
    path.startsWith('/maintenance') ||
    path.startsWith('/api') ||
    path.startsWith('/_next') ||
    path.includes('.')
  ) {
    return supabaseResponse;
  }

  // 2. Fetch authenticated user
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  // 3. Maintenance Mode Enforcement Check
  // Allows admins and /admin routes to continue uninterrupted
  if (!path.startsWith('/admin')) {
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('is_maintenance_mode')
      .limit(1)
      .maybeSingle();

    if (settings?.is_maintenance_mode) {
      let isAdmin = false;
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.role === 'admin') {
          isAdmin = true;
        }
      }

      if (!isAdmin) {
        console.log(`[Middleware] Redirecting non-admin user from ${path} to /maintenance due to active maintenance mode`);
        const url = request.nextUrl.clone();
        url.pathname = '/maintenance';
        return NextResponse.redirect(url);
      }
    }
  }

  // 4. Public legal/support routes — accessible without auth
  const isPublicRoute = path.startsWith('/privacy') ||
                        path.startsWith('/terms') ||
                        path.startsWith('/support') ||
                        path.startsWith('/onboarding');

  const isProtectedRoute = !isPublicRoute && (
    path.startsWith('/dashboard') || 
    path.startsWith('/search') || 
    path.startsWith('/bookings') || 
    path.startsWith('/messages') ||
    path.startsWith('/profile') ||
    path.startsWith('/settings') ||
    path.startsWith('/availability') ||
    path.startsWith('/notifications') ||
    path.startsWith('/transactions')
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
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) {
      console.log(`[Middleware] Redirecting authenticated user ${user.email} from auth route ${path} to /dashboard`);
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
