import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const corporateLogo = await readFile(resolve(projectRoot, 'public/brand/yukimi-works.svg'));
const circleScreenshot = resolve(projectRoot, 'scripts/assets/toketa-ice-og-source.png');

const corporateText = Buffer.from(`
<svg width="650" height="130" viewBox="0 0 650 130" xmlns="http://www.w3.org/2000/svg">
  <style>
    .company-name { font: 600 72px "Helvetica Neue", Arial, sans-serif; letter-spacing: 0.015em; fill: #1f1b2d; }
  </style>
  <text class="company-name" x="0" y="92">YukimiWorks</text>
</svg>`);

await sharp({
  create: {
    width: 1200,
    height: 630,
    channels: 4,
    background: '#ffffff',
  },
})
  .composite([
    { input: await sharp(corporateLogo).resize(330, 330).png().toBuffer(), left: 95, top: 150 },
    { input: corporateText, left: 475, top: 250 },
  ])
  .webp({ quality: 82, effort: 6, smartSubsample: true })
  .toFile(resolve(projectRoot, 'public/brand/yukimi-works-og.webp'));

await sharp(circleScreenshot)
  .extract({ left: 85, top: 0, width: 960, height: 504 })
  .resize(1200, 630, { kernel: sharp.kernel.nearest })
  .webp({ quality: 90, effort: 6, smartSubsample: false })
  .toFile(resolve(projectRoot, 'public/logo/toketa-ice-og.webp'));
