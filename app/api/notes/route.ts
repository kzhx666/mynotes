import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  // 按文件夹、自定义排序、时间 综合排序
  const notes = db.prepare('SELECT * FROM notes ORDER BY is_folder DESC, sort_order ASC, updated_at DESC').all();
  return NextResponse.json(notes);
}

export async function PUT(request: Request) {
  const { id, title, content, parent_id, is_folder, sort_order } = await request.json();
  db.prepare('UPDATE notes SET content = ?, title = ?, parent_id = ?, is_folder = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(content || '', title, parent_id || null, is_folder ? 1 : 0, sort_order || 0, id);
  return NextResponse.json({ success: true });
}

export async function POST(request: Request) {
  const { title, parent_id, is_folder } = await request.json();
  const id = Math.random().toString(36).substr(2, 9);
  db.prepare('INSERT INTO notes (id, title, content, parent_id, is_folder, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, title, is_folder ? '' : '# ' + title, parent_id || null, is_folder ? 1 : 0, 0);
  return NextResponse.json({ id });
}

export async function DELETE(request: Request) {
  const { id } = await request.json();
  db.prepare('DELETE FROM notes WHERE id = ? OR parent_id = ?').run(id, id);
  return NextResponse.json({ success: true });
}
