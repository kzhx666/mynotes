import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  // 放行规则：学生分享页、登录API、前端静态资源全部放行
  if (path.startsWith('/s/') || path === '/login' || path.startsWith('/api/login') || path.startsWith('/uploads/')) {
    return NextResponse.next();
  }
  // 后台区域：如果没有 token，强制踢回登录页
  const token = request.cookies.get('auth_token');
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
