import { NextResponse } from 'next/server';
import db from '@/lib/db';

// 强制动态渲染，绝不缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const item = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as any;
    
    if (!item) {
      return NextResponse.json({ error: '内容不存在或已被删除' }, { status: 404 });
    }

    if (item.is_folder === 1) {
      const children = db.prepare('SELECT id, title, content, sort_order FROM notes WHERE parent_id = ? AND is_folder = 0 ORDER BY sort_order ASC, id ASC').all(id);
      return NextResponse.json({ ...item, type: 'folder', children });
    } else {
      return NextResponse.json({ ...item, type: 'note' });
    }
  } catch (e: any) {
    console.error('Share API Error:', e);
    return NextResponse.json({ error: '服务器错误: ' + e.message }, { status: 500 });
  }
}
