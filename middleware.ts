import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 【核心白名单】：放行登录页、登录API、学生分享页、公开分享API、本地图片和静态资源
  if (
    path === '/login' ||
    path === '/api/login' ||
    path.startsWith('/s/') ||
    path.startsWith('/api/share/') || 
    path.startsWith('/uploads/') ||
    path.startsWith('/_next/') ||
    path === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // 拦截其他所有请求，检查 Token (保护后台编辑器)
  const token = request.cookies.get('auth_token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
