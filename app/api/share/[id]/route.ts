import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    // 仅查询指定 ID 的笔记，绝不泄露其他数据
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    
    if (!note) {
      return NextResponse.json({ error: '课件不存在' }, { status: 404 });
    }
    return NextResponse.json(note);
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
