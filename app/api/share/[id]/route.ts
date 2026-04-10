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
      // 如果是文件夹，则提取它名下的所有子笔记（按你在后台拖拽的排序规则排列）
      const children = db.prepare('SELECT id, title, content, sort_order FROM notes WHERE parent_id = ? AND is_folder = 0 ORDER BY sort_order ASC, created_at ASC').all(id);
      return NextResponse.json({ ...item, type: 'folder', children });
    } else {
      // 维持原有单篇笔记逻辑
      return NextResponse.json({ ...item, type: 'note' });
    }
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
