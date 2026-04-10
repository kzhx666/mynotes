import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const item = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as any;
    
    if (!item) {
      return NextResponse.json({ error: '内容不存在或已被删除' }, { status: 404 });
    }

    if (item.is_folder === 1) {
      // 修复：移除了导致数据库崩溃的 created_at 字段，仅按 sort_order 和 id 排序
      const children = db.prepare('SELECT id, title, content, sort_order FROM notes WHERE parent_id = ? AND is_folder = 0 ORDER BY sort_order ASC, id ASC').all(id);
      return NextResponse.json({ ...item, type: 'folder', children });
    } else {
      // 维持原有单篇笔记逻辑
      return NextResponse.json({ ...item, type: 'note' });
    }
  } catch (e: any) {
    // 将错误打印到终端日志，方便以后排查问题
    console.error('Share API Error:', e);
    return NextResponse.json({ error: '服务器错误: ' + e.message }, { status: 500 });
  }
}
