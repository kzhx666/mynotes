import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST() {
  const user = process.env.DAV_USER;
  const pass = process.env.DAV_PASSWORD;
  const auth = Buffer.from(`${user}:${pass}`).toString('base64');
  const dbPath = path.join(process.cwd(), 'data', 'notes.db');

  try {
    const fileBuffer = fs.readFileSync(dbPath);
    const dateStr = new Date().toISOString().replace(/T/, '_').replace(/:/g, '').split('.')[0];
    const folderUrl = `https://dav.jianguoyun.com/dav/MyNotes_Backup/`;
    const fileUrl = `${folderUrl}MyNotes_${dateStr}.db`;

    await fetch(folderUrl, { method: 'MKCOL', headers: { 'Authorization': `Basic ${auth}` } });
    const res = await fetch(fileUrl, {
      method: 'PUT',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/octet-stream' },
      body: fileBuffer
    });

    return res.ok ? NextResponse.json({ success: true, message: '已同步至坚果云 MyNotes_Backup' }) : NextResponse.json({ success: false }, { status: 500 });
  } catch (e: any) { return NextResponse.json({ success: false, message: e.message }, { status: 500 }); }
}
