import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const allowedFiles = new Set(['1.png', 'a.png', 'b.png']);

export async function GET(_: Request, { params }: { params: { fileName: string } }) {
  // private-contentは開発時の手元確認専用。本番ビルド・本番サーバーでは一切配信しない。
  if (process.env.NODE_ENV === 'production' || !allowedFiles.has(params.fileName)) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const imagePath = path.join(process.cwd(), 'private-content', 'back-alley', 'r18', 'portfolio', 'bunny', params.fileName);
    const image = await readFile(imagePath);
    return new NextResponse(image, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
