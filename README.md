# YukimiWorks

Next.js 14 で構築した YukimiWorks コーポレートサイトです。

## 開発

```bash
npm install
npm run dev
```

利用可能な検証コマンド:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## 環境変数

`.env.local` に必要な値を設定します。

```env
RESEND_API_KEY=re_xxxxxxxxxxxx
CONTACT_TO_INQUIRY=info@yukimiworks.com
CONTACT_TO_APP=app-support@yukimiworks.com
MAIL_FROM_NAME=YukimiWorks
MAIL_FROM_DOMAIN=yukimiworks.com
NEXT_PUBLIC_SITE_URL=https://yukimiworks.com
UPSTASH_REDIS_REST_URL=https://<your-redis-endpoint>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<your-redis-rest-token>
```

`UPSTASH_REDIS_REST_URL` と `UPSTASH_REDIS_REST_TOKEN` は、カウンターを Redis に保存するために使用します。
既存の接続情報をそのまま使う場合は、`KV_REST_API_URL` と `KV_REST_API_TOKEN` も後方互換で読み込みます。
Vercel の Redis integration が `UPSTASH_REDIS_REST_KV_REST_API_URL` のような長い名前を作っても、コード側で読み込めるようにしてあります。
カウンターは更新するので、`READ_ONLY_TOKEN` ではなく書き込み用 token を使います。

## カウンターの仕組み

- カウンター総数は Redis の `site:counter:total` に保存します
- 同じブラウザからは 1 日に 1 回だけ加算します
- 1 日判定は `localStorage` の `yukimi-counter-last-counted-date` に保存した東京日付キーで行います
- `localStorage` を消した場合、別ブラウザ、別端末は別訪問として扱います
- Redis 未設定環境では `data/siteConfig.ts` の初期値を表示し、加算は行いません

## Vercel 本番設定

1. Vercel ダッシュボードで対象プロジェクトを開きます。
2. `Storage` ではなく、Marketplace から Redis integration を追加します。
3. 作成した Redis をこのプロジェクトへ接続します。
4. 接続後、Vercel の Environment Variables に `UPSTASH_REDIS_REST_URL` と `UPSTASH_REDIS_REST_TOKEN` が入っていることを確認します。
5. あわせて以下も Environment Variables に登録します。

```text
RESEND_API_KEY
CONTACT_TO_INQUIRY
CONTACT_TO_APP
MAIL_FROM_NAME
MAIL_FROM_DOMAIN
NEXT_PUBLIC_SITE_URL
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

6. 必要なら `siteConfig.decorativeCounter` を開始値として調整します。
7. 再デプロイすると、初回アクセス時に Redis へ `site:counter:total` が作成されます。

## 備考

- カウンター API は `app/api/counter/route.ts` にあります
- Redis アクセス処理は `lib/counter.ts` にあります
