import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('file[]'); 

    if (!files || files.length === 0) {
      return NextResponse.json({ msg: '没有接收到文件', code: 1, data: {} });
    }

    const succMap: Record<string, string> = {};
    // 【核心修改】：不放 public 了，直接存在项目根目录的私有 uploads 文件夹里
    const uploadDir = join(process.cwd(), 'uploads');

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    for (const file of files) {
      if (file instanceof Blob) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const originalName = (file as any).name || 'image.png';
        const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${uniqueSuffix}-${safeName}`;
        const filepath = join(uploadDir, filename);

        await writeFile(filepath, buffer);
        
        // 【核心修改】：返回全新的动态读取 API 路径
        succMap[originalName] = `/api/uploads/${filename}`;
      }
    }

    return NextResponse.json({
      msg: '',
      code: 0,
      data: { errFiles: [], succMap: succMap }
    });
  } catch (e: any) {
    console.error('上传图片失败:', e);
    return NextResponse.json({ msg: '服务器错误: ' + e.message, code: 1, data: {} });
  }
}
