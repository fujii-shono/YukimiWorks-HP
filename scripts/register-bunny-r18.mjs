import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const target = process.argv.includes('--production') ? 'production' : process.argv.includes('--emulator') ? 'emulator' : null;
if (!target) throw new Error('登録先として --emulator または --production を指定してください。');

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-yukimiworks';
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;

if (target === 'emulator') {
  process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ||= '127.0.0.1:9199';
}

const app = getApps()[0] || (target === 'emulator'
  ? initializeApp({ projectId, storageBucket })
  : (() => {
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      if (!process.env.FIREBASE_PROJECT_ID || !clientEmail || !privateKey) {
        throw new Error('本番登録にはFIREBASE_PROJECT_ID、FIREBASE_CLIENT_EMAIL、FIREBASE_PRIVATE_KEYが必要です。');
      }
      return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId, storageBucket });
    })());

const sourceDirectory = path.join(process.cwd(), 'private-content', 'back-alley', 'r18', 'portfolio', 'bunny');
const sourceImages = [
  { fileName: '1.png', key: 'image', alt: 'Bunnyの初期イラスト' },
  { fileName: 'a.png', key: 'top', alt: 'Bunnyで上を選んだ後のイラスト' },
  { fileName: 'b.png', key: 'bottom', alt: 'Bunnyで下を選んだ後のイラスト' },
];
const prefix = 'protected/back-alley/r18/portfolio/bunny';
const uploaded = await Promise.all(sourceImages.map(async ({ fileName, key, alt }) => {
  const storagePath = `${prefix}/${fileName}`;
  const content = await readFile(path.join(sourceDirectory, fileName));
  if (target === 'production') {
    await getStorage(app).bucket(storageBucket).file(storagePath).save(content, { contentType: 'image/png', resumable: false });
  }
  return [key, { type: 'image', path: storagePath, alt }];
}));

const images = Object.fromEntries(uploaded);
const publishedAt = Timestamp.now();
const db = getFirestore(app);
await db.collection('backAlleyR18PortfolioItems').doc('bunny').set({
  title: 'どちらを引く？',
  description: '',
  tags: ['HTML', 'クリックイベント', 'イラスト', 'R18'],
  image: images.image,
  interaction: {
    type: 'two-choice',
    prompt: 'あなたの番だ。どちらを引く？',
    top: { label: '上', image: images.top },
    bottom: { label: '下', image: images.bottom },
  },
  r18: true,
  featured: true,
  publishedAt,
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
}, { merge: true });
await db.collection('backAlleyR18Index').doc('bunny').set({
  title: 'どちらを引く？',
  description: '',
  featured: true,
  publishedAt,
  updatedAt: FieldValue.serverTimestamp(),
});

console.log(target === 'emulator'
  ? 'BunnyをEmulatorへ登録しました。画像はprivate-contentから直接読み込みます。'
  : 'Bunnyを本番へ登録しました。画像は保護Storageから配信されます。');
