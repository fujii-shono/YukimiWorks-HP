import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { getBackAlleyOgpData } from '@/lib/firebase/backAlley.server';
import { getFirebaseAdminServices } from '@/lib/firebase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_CONTROL = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400';

async function createR18Image() {
  const badge = Buffer.from(`
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="#000000" />
      <rect x="456" y="244" width="288" height="142" rx="12" fill="#ffb6d1" stroke="#f06b9f" stroke-width="8" />
      <text x="600" y="342" fill="#8d174b" font-family="Arial, sans-serif" font-size="82" font-weight="700" text-anchor="middle">R18</text>
    </svg>
  `);
  return sharp(badge).png().toBuffer();
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const item = await getBackAlleyOgpData(params.id);
  if (!item) return new NextResponse(null, { status: 404 });

  try {
    if (item.kind === 'r18') {
      return new NextResponse(await createR18Image(), {
        headers: { 'Content-Type': 'image/png', 'Cache-Control': CACHE_CONTROL },
      });
    }

    const { storage } = getFirebaseAdminServices();
    const file = storage.bucket().file(item.imagePath);
    const [downloadResult, metadataResult] = await Promise.all([file.download(), file.getMetadata()]);
    const [image] = downloadResult;
    const [metadata] = metadataResult;
    const contentType = metadata.contentType?.split(';')[0].trim().toLowerCase();
    if (!contentType?.startsWith('image/')) return new NextResponse(null, { status: 404 });

    return new NextResponse(new Uint8Array(image).buffer, {
      headers: { 'Content-Type': contentType, 'Cache-Control': CACHE_CONTROL },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.warn('[back-alley-ogp] image could not be loaded', error);
    return new NextResponse(null, { status: 404 });
  }
}
