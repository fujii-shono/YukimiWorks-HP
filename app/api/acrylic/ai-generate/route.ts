import { NextResponse } from 'next/server';
import { resolveAcrylicGenerationOptions } from '@/lib/acrylicGenerationOptions';

export const runtime = 'nodejs';

type AcrylicAiGenerationRequest = {
  fileName?: unknown;
  artworkDataUrl?: unknown;
  productMode?: unknown;
  shapeMode?: unknown;
  generationOptions?: unknown;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: AcrylicAiGenerationRequest;
  try {
    body = (await request.json()) as AcrylicAiGenerationRequest;
  } catch {
    return jsonError('リクエストを読み込めませんでした');
  }

  if (typeof body.fileName !== 'string') return jsonError('ファイル名が不正です');
  if (typeof body.artworkDataUrl !== 'string') return jsonError('PNGデータが不正です');
  if (body.productMode !== 'keychain' && body.productMode !== 'stand') return jsonError('作成タイプが不正です');
  if (
    (body.productMode === 'keychain' && body.shapeMode !== 'with-hole' && body.shapeMode !== 'without-hole') ||
    (body.productMode === 'stand' && body.shapeMode !== 'simple' && body.shapeMode !== 'stable')
  ) {
    return jsonError('形状モードが不正です');
  }

  const generationOptions = resolveAcrylicGenerationOptions(body.generationOptions);

  return NextResponse.json(
    {
      message: 'AI生成APIは未実装です。設定値の受け取りだけ完了しています。',
      fileName: body.fileName,
      productMode: body.productMode,
      shapeMode: body.shapeMode,
      generationOptions,
    },
    { status: 501, headers: { 'Cache-Control': 'no-store' } },
  );
}
