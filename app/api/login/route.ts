import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { password } = await request.json();
  if (password === process.env.ADMIN_PASSWORD) {
    const response = NextResponse.json({ success: true });
    response.cookies.set('auth_token', 'verified', { httpOnly: true, maxAge: 60*60*24*30, path: '/' });
    return response;
  }
  return NextResponse.json({ success: false }, { status: 401 });
}
