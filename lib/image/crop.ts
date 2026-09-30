const THUMBNAIL_ASPECT_RATIO = 16 / 9;
const MAX_THUMBNAIL_WIDTH = 1600;

function extensionForMimeType(mimeType: string) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

function outputMimeTypeFor(file: File) {
  if (file.type === 'image/png' || file.type === 'image/webp') return file.type;
  return 'image/jpeg';
}

function loadImage(file: File) {
  return new Promise<{ image: HTMLImageElement; release: () => void }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, release: () => URL.revokeObjectURL(url) });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('画像を読み込めませんでした。別の画像を選択してください。'));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('画像のトリミングに失敗しました。'));
    }, mimeType, mimeType === 'image/png' ? undefined : 0.9);
  });
}

/** 一覧カードと同じ 16:9 の中心トリミング画像を作成する。 */
export async function cropImageToThumbnail(file: File) {
  const { image, release } = await loadImage(file);

  try {
    const { naturalWidth, naturalHeight } = image;
    if (!naturalWidth || !naturalHeight) throw new Error('画像サイズを取得できませんでした。');

    const sourceAspectRatio = naturalWidth / naturalHeight;
    const sourceWidth = sourceAspectRatio > THUMBNAIL_ASPECT_RATIO
      ? naturalHeight * THUMBNAIL_ASPECT_RATIO
      : naturalWidth;
    const sourceHeight = sourceAspectRatio > THUMBNAIL_ASPECT_RATIO
      ? naturalHeight
      : naturalWidth / THUMBNAIL_ASPECT_RATIO;
    const sourceX = (naturalWidth - sourceWidth) / 2;
    const sourceY = (naturalHeight - sourceHeight) / 2;
    const outputWidth = Math.min(MAX_THUMBNAIL_WIDTH, Math.round(sourceWidth));
    const outputHeight = Math.round(outputWidth / THUMBNAIL_ASPECT_RATIO);
    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('画像のトリミングに失敗しました。');

    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, outputWidth, outputHeight);
    const blob = await canvasToBlob(canvas, outputMimeTypeFor(file));
    const mimeType = blob.type || outputMimeTypeFor(file);
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'thumbnail';
    return new File([blob], `${baseName}.${extensionForMimeType(mimeType)}`, { type: mimeType, lastModified: file.lastModified });
  } finally {
    release();
  }
}
