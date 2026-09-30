# YukimiWorks

Next.js 14 で構築した YukimiWorks コーポレートサイトです。

## 開発

```bash
npm install
npm run dev
```

Firebase を含むローカル確認は、後述の「Firebase ローカルテスト」を参照してください。

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
NEXT_PUBLIC_FIREBASE_USE_EMULATORS=false
NEXT_PUBLIC_FIREBASE_API_KEY=<Firebase Web API key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<project-id>.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<project-id>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<project-id>.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<sender-id>
NEXT_PUBLIC_FIREBASE_APP_ID=<app-id>
FIREBASE_PROJECT_ID=<project-id>
FIREBASE_CLIENT_EMAIL=<service-account-email>
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
X_CLIENT_ID=<X OAuth 2.0 Client ID>
X_CLIENT_SECRET=<X OAuth 2.0 Client Secret>
X_OAUTH_CALLBACK_URL=https://yukimiworks.com/api/x/callback
X_POST_DRY_RUN=false
UPSTASH_REDIS_REST_URL=https://<your-redis-endpoint>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<your-redis-rest-token>
REDIS_KEY_PREFIX=dev
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
```

Firebase のブラウザ用設定値は Firebase Console の「プロジェクトの設定 > マイアプリ > SDK の設定と構成」で確認できます。Firebase Web API key はブラウザへ配布される識別情報であり、管理者権限を与える秘密鍵ではありません。データの保護は、このリポジトリの `firestore.rules` と `storage.rules` で行います。

## Firebase ローカルテスト

Firebase プロジェクトをまだ作成していなくても、Authentication、Firestore、Storage を Local Emulator Suite で確認できます。Java 21 以降が必要です。`npm run dev` では、Firebase関連の環境変数が未設定でも自動的にLocal Emulator Suiteへ接続します。

1. Firebase用の環境変数はローカルテストでは不要です。`.env.local` が既にある場合も変更せずに進められます。実Firebaseプロジェクトへローカル接続する場合だけ、`NEXT_PUBLIC_FIREBASE_USE_EMULATORS=false` と本番Firebaseの設定値を追加してください。

```bash
# .env.local がない場合だけ、既存の他機能用設定の雛形としてコピーする
cp .env.example .env.local
```

2. ターミナルを2つ開き、片方でエミュレーター、もう片方で Next.js を起動します。

```bash
npm run firebase:emulators
```

```bash
npm run dev
```

一時データでよければ、次の1コマンドでも起動できます。この場合、終了時にエミュレーターのデータは保存されません。

```bash
npm run dev:firebase
```

3. `http://localhost:3000` を開き、Menu の上にある「ログイン」から「Googleでログイン」を押します。Auth Emulator の疑似Googleログイン画面が開くため、任意のメールアドレスと表示名でテストユーザーを作成します。実在するGoogleアカウントは使用しません。
4. Emulator UI `http://127.0.0.1:4000` を開きます。Firestore の `users/{uid}` に、次の初期値を持つ文書が作成されます。

```text
displayName: Google側の表示名
plan: none
coins: 10
purchasedWorkIds: []
role: user
```

5. ローカルで管理者にするには、Emulator UI の Firestore で対象文書の `role` を文字列 `admin` に変更します。画面はリアルタイムで更新され、「設定 > 管理画面へ」から `/admin` を開けるようになります。
6. 管理画面では「メッセージ」「ポートフォリオ」「成果物」「日記」「ニュース」から項目を選択します。各一覧からFirebase追加分の新規追加・編集・削除ができます。コード内の既存データは管理画面には表示されず、そのまま公開表示を維持します。成果物・日記・ニュースの本文は文章・表示テキスト付きリンク・メディアを複数追加し、上下移動で表示順を指定できます。コンテンツ画像は1枚10MB、動画は1本100MB、本文メディアは最大8件です。未来の公開日時を指定した項目は「公開予約」となり、その時刻まで公開画面に表示されません。

`npm run firebase:emulators` は終了時のデータを `.firebase-data/` に保存し、次回起動時に読み込みます。このフォルダはGit管理されません。

終了済みのFirestore Emulatorが孤立プロセスとして8080番ポートに残った場合、`npm run firebase:emulators`は起動前にそのプロセスだけを自動終了します。手動で孤立プロセスだけを回収する場合は`npm run firebase:cleanup`を使用してください。他の実行中プロセスが同じポートを使用している場合は、誤終了を避けるため自動終了せず、PIDとコマンドを表示します。

## Firebase 本番プロジェクト設定

1. Firebase Console でプロジェクトを作成し、Webアプリを追加します。
2. Authentication の Sign-in method で Google を有効にします。
3. Firestore Database と Storage を作成します。初期ルールは後の手順でこのリポジトリのルールへ置き換えます。
4. `.env.local` と Vercel の Environment Variables に上記の `NEXT_PUBLIC_FIREBASE_*` を登録し、本番では `NEXT_PUBLIC_FIREBASE_USE_EMULATORS=false` にします。
5. Firebase CLI でログインし、対象プロジェクトを選択します。

```bash
npx firebase login
npx firebase use --add
```

6. Firestore と Storage の Security Rules をデプロイします。

```bash
npm run firebase:deploy:rules
```

7. 本番サイトから最初のGoogleログインを行います。
8. Firebase Console の Firestore で `users/{対象uid}` を開き、`role` を `user` から `admin` に変更します。管理者権限はログイン画面やクライアントコードから付与できません。

管理者のプランやコインを直接調整する場合も、同じユーザー文書で次の値を変更します。

- `plan`: `none` / `blue` / `night`
- `coins`: 0以上の整数
- `purchasedWorkIds`: 作品ID文字列の配列

一般ユーザーが変更できるのは `displayName` だけです。`role`、`plan`、`coins`、`purchasedWorkIds` は Security Rules で本人からの更新を拒否します。メッセージ、各コンテンツ、画像・動画の作成・更新・削除も、`role: admin` のユーザーだけに許可されます。

### Firebase Admin SDK（本番）

公開ページのFirebaseコンテンツ取得とX接続・投稿APIではFirebase Admin SDKを使用します。X関連APIはFirebase IDトークンと`role: admin`もサーバー側で検証します。Firebase Consoleの「プロジェクトの設定 > サービス アカウント」からサービスアカウントキーを発行し、JSON内の値をVercelのProduction環境へ登録してください。

- `project_id` → `FIREBASE_PROJECT_ID`
- `client_email` → `FIREBASE_CLIENT_EMAIL`
- `private_key` → `FIREBASE_PRIVATE_KEY`（改行は`\\n`のまま登録可能）

秘密鍵JSON本体やこれらの値はGitへ追加しません。Local Emulator Suiteでは上記3項目は不要です。

## X投稿連携

「Xにも投稿する」を選んだメッセージは、Firestoreへの保存成功直後にXへ投稿します。サイト上の公開日時が未来でも、X投稿は予約されず保存時に即時実行されます。同じメッセージにX投稿IDが記録済みの場合、編集保存しても重複投稿しません。投稿失敗時はメッセージ自体を残し、管理画面の編集画面でもう一度保存すると再試行します。

本文はサイト上では最大300文字です。X投稿を選択した場合は、URLをXの短縮URLとして1件23文字に換算した投稿文字数も画面に表示します。280文字を超えると注意を表示し、保存してもX APIは呼び出しません。メッセージ一覧には「長文のため投稿しませんでした」と記録されます。URLを含まない日本語・絵文字も投稿文字数として換算します。

1. X Developer Consoleで対象AppのOAuth 2.0を有効にし、App Typeを`Web App`にします。
2. 権限に`tweet.read`、`tweet.write`、`users.read`、`offline.access`、`media.write`を許可します。
3. Callback URIへローカル用の`http://localhost:3000/api/x/callback`を完全一致で登録します。本番では`https://yukimiworks.com/api/x/callback`も登録します。
4. AppのKeys and tokensでOAuth 2.0 Client ID / Client Secretを確認し、ローカルの`.env.local`へ次を追加します。

```env
X_CLIENT_ID=<Development AppのClient ID>
X_CLIENT_SECRET=<Development AppのClient Secret>
X_OAUTH_CALLBACK_URL=http://localhost:3000/api/x/callback
```

5. Firebaseエミュレーターと`npm run dev`を再起動し、疑似Googleユーザーを`role: admin`にします。
6. `/admin?section=messages`の「Xアカウントを接続」を押し、投稿テストに使う鍵付きXアカウントで認可します。Developer Consoleへログインしているアカウントではなく、この認可画面で選んだアカウントが投稿先です。
7. 新規メッセージで「Xにも投稿する」にチェックして保存し、鍵付きアカウントのタイムラインと管理画面の「X投稿済み」を確認します。

Firebaseでは画像を1枚10MBまで保存できますが、Xへ添付できる静止画は1枚5MBまでです。X投稿を選ぶ場合は5MB以下のJPG、PNG、GIF、WEBPを使用してください。APIキー、Client Secret、アクセストークン、更新トークンはブラウザへ返しません。

### X投稿ドライラン

`.env.local` で `X_POST_DRY_RUN=true` にすると、X APIや画像アップロードを呼ばず、Firestore上ではX投稿済みとして記録します。管理画面には「ドライラン中」と表示されます。実際にXへ投稿する環境では `false` へ変更してください。

### X投稿リンクの訪問分析

投稿フォームの「アクセス計測リンク」に同一サイト内のURLを入力すると、`NEXT_PUBLIC_SITE_URL/go/{token}` 形式のリンクが本文へ挿入されます。送信時にURLは変更されないため、表示されるX投稿文字数で事前に確認できます。

識別リンク経由の訪問者数は、管理画面の「アクセス分析」で確認できます。合計は同一ブラウザを1人として数え、詳細に直近30日と直近12ヶ月の推移を表示します。Cookieを削除した場合や別端末は別人として扱われます。IPアドレスとUser-Agentは保存しません。

`UPSTASH_REDIS_REST_URL` と `UPSTASH_REDIS_REST_TOKEN` は、カウンターを Redis に保存するために使用します。
既存の接続情報をそのまま使う場合は、`KV_REST_API_URL` と `KV_REST_API_TOKEN` も後方互換で読み込みます。
Vercel の Redis integration が `UPSTASH_REDIS_REST_KV_REST_API_URL` のような長い名前を作っても、コード側で読み込めるようにしてあります。
カウンターは更新するので、`READ_ONLY_TOKEN` ではなく書き込み用 token を使います。
`REDIS_KEY_PREFIX=dev` を設定すると、カウンターのRedisキーは `dev:site:counter:total` と `dev:site:counter:last-milestone` になり、本番用の既存キー `site:counter:*` へ書き込みません。
本番環境では未設定、または `REDIS_KEY_PREFIX=prod` のままにすると従来の本番キーを使います。

募金機能では `STRIPE_SECRET_KEY` で Checkout Session の作成と決済済みセッション確認を行い、`STRIPE_WEBHOOK_SECRET` で Stripe Webhook の署名検証を行います。
Stripe 側の Webhook endpoint は `/api/bokin/webhook` に設定し、イベントは `checkout.session.completed` を送信してください。
本番公開時は `sk_test_...` ではなく本番用の `sk_live_...` と、本番 endpoint 用の `whsec_...` を Vercel の Production 環境に設定します。

## カウンターの仕組み

- カウンター総数は Redis の `site:counter:total` に保存します
- `REDIS_KEY_PREFIX=dev` の場合は開発用キー `dev:site:counter:total` と `dev:site:counter:last-milestone` を使います
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
NEXT_PUBLIC_FIREBASE_USE_EMULATORS
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
X_CLIENT_ID
X_CLIENT_SECRET
X_OAUTH_CALLBACK_URL
X_POST_DRY_RUN
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

6. Stripe ダッシュボードで Webhook endpoint `https://<本番ドメイン>/api/bokin/webhook` を追加し、`checkout.session.completed` を選択します。
7. 必要なら `siteConfig.decorativeCounter` を開始値として調整します。
8. 再デプロイすると、初回アクセス時に Redis へ `site:counter:total` が作成されます。

## 備考

- カウンター API は `app/api/counter/route.ts` にあります
- Redis アクセス処理は `lib/counter.ts` にあります
