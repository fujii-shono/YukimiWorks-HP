const THUMBNAIL_ASPECT_RATIO = 16 / 9;
const MAX_THUMBNAIL_WIDTH = 1600;
const BANNER_ASPECT_RATIO = 3;

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

async function cropImage(file: File, aspectRatio: number, positionX: number, positionY: number) {
  const { image, release } = await loadImage(file);

  try {
    const { naturalWidth, naturalHeight } = image;
    if (!naturalWidth || !naturalHeight) throw new Error('画像サイズを取得できませんでした。');

    const sourceAspectRatio = naturalWidth / naturalHeight;
    const sourceWidth = sourceAspectRatio > aspectRatio
      ? naturalHeight * aspectRatio
      : naturalWidth;
    const sourceHeight = sourceAspectRatio > aspectRatio
      ? naturalHeight
      : naturalWidth / aspectRatio;
    const sourceX = (naturalWidth - sourceWidth) * Math.min(100, Math.max(0, positionX)) / 100;
    const sourceY = (naturalHeight - sourceHeight) * Math.min(100, Math.max(0, positionY)) / 100;
    const outputWidth = Math.min(MAX_THUMBNAIL_WIDTH, Math.round(sourceWidth));
    const outputHeight = Math.round(outputWidth / aspectRatio);
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

/** 一覧カードと同じ 16:9 の中心トリミング画像を作成する。 */
export function cropImageToThumbnail(file: File) {
  return cropImage(file, THUMBNAIL_ASPECT_RATIO, 50, 50);
}

/** リンク集用の3:1バナーを指定位置でトリミングする。 */
export function cropImageToBanner(file: File, positionX: number, positionY: number) {
  return cropImage(file, BANNER_ASPECT_RATIO, positionX, positionY);
}
