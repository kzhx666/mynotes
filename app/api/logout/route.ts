import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  // 销毁 Cookie
  response.cookies.set('auth_token', '', { maxAge: -1, path: '/' });
  return response;
}
