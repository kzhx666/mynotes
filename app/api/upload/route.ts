import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';

export async function POST(request: Request) {
  const data = await request.formData();
  const files: File[] = data.getAll('file[]') as File[];

  if (!files || files.length === 0) return NextResponse.json({ msg: '无文件', code: 1 });

  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const resData: any = { errFiles: [], succMap: {} };

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    await writeFile(path.join(uploadDir, filename), buffer);
    resData.succMap[file.name] = `/uploads/${filename}`;
  }

  return NextResponse.json({ msg: '上传成功', code: 0, data: resData });
}
