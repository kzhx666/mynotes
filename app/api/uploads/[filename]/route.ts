import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join, extname } from 'path';
import { existsSync } from 'fs';

export async function GET(request: Request, { params }: { params: { filename: string } }) {
  try {
    const filename = params.filename;
    // 去私有 uploads 文件夹里找图
    const filepath = join(process.cwd(), 'uploads', filename);

    if (!existsSync(filepath)) {
      return new NextResponse('图片不存在', { status: 404 });
    }

    // 将图片转换成二进制流发送给前端
    const fileBuffer = await readFile(filepath);
    
    // 智能识别图片格式
    const ext = extname(filename).toLowerCase();
    let mimeType = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.svg') mimeType = 'image/svg+xml';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable' // 开启浏览器长效缓存，秒加载
      },
    });
  } catch (e) {
    return new NextResponse('读取图片失败', { status: 500 });
  }
}
