## 対応する仕様

- `SPEC.md` 全体
- 特にトップページ再現、共通サイトフレーム、時間帯テーマ、各一覧・詳細ページ、問い合わせフォーム、SEO、アクセシビリティ
- 加えて、最新依頼によるトップページ構成変更、About の番号整列、キャラクター会話ロジック全面更新、時間帯イベント仕様変更、不在イベント追加

## 実装方針

- Next.js 14 App Router + TypeScript を新規構成する
- `yukimiworks-html-sample` の構造と寸法を基準に、トップページの見た目を CSS と再利用コンポーネントへ移植する
- サイト全体は `SiteFrame` を共通化し、ヘッダー、サイドバー、フッター、右カラム差し替えで全ページを構成する
- 時間帯テーマと特殊イベントは共通 hook / provider / データ定義で管理し、開発環境のみデバッグ UI とクエリ強制表示を有効にする
- キャラクター会話は時間帯別メッセージ、短時間連打判定、睡眠状態、不在イベントを含む状態機械として再設計する
- データ駆動を優先し、`works`、`news`、`links`、`portfolio`、`appServices` を配列管理して一覧と詳細へ反映する
- 問い合わせフォームは `react-hook-form` + `zod` + API Route + `lib/mailer.ts` で実装する
- サンプルフォルダの CSS / JS / 画像は直接参照せず、必要素材を `public` 配下へ移して利用する
- 依頼内容で仕様と異なる点は `SPEC.md` も合わせて更新する

## 変更予定のファイルと理由

- `package.json` ほか設定一式: Next.js / TypeScript / lint / build の実行基盤
- `app/**`: ルーティング、各ページ、API Route、グローバル CSS
- `components/**`: 共通レイアウト、レトロパネル、各ページ UI、テーマ UI、フォーム UI
- `data/**`: ページ表示とテーマ制御の元データ
- `lib/**`: 日本時間判定、バリデーション、メール送信
- `public/**`: ロゴ、キャラクター、アイコン、背景、ダミー画像などの実運用素材
- `next.config.js` または `next.config.mjs`: Cloudinary 画像許可など
- `SPEC.md`: 新しいトップ構成、会話仕様、イベント仕様の正式化

## 影響範囲

- 全ページのレイアウト、レスポンシブ、SEO メタデータ
- テーマ切り替えとイベント時の配色、アイコン、背景
- トップページのパネル順序と追加ポートフォリオプレビュー
- About 本文の番号表示形式
- キャラクターの画像差し替え、クリック無反応条件、吹き出し出現条件、連打判定
- 一覧ページのフィルターと URL クエリ同期
- 詳細ページの静的生成と構造化データ
- 問い合わせフォームの入力、送信、モーダル、API 応答
- 開発環境限定 UI の出し分け

## 検証方法

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `npm run dev` で主要ページ、モバイル幅、テーマ切り替え、フォーム送信 UI、キャラクター演出を手動確認

## 懸念点・制約・未確定事項

- 既存コードがほぼ存在しないため、実装は新規構築が中心になる
- 依存関係の取得にはネットワークアクセスが必要になる可能性が高い
- OGP 画像とファビコンは仕様に合わせた静的素材を新規作成する
- `SPEC.md` は今回の依頼で更新対象になるため、依頼差分のみ明示的に反映する

---

## 追加対応: カウンター実装

### 対応する仕様

- `SPEC.md` の Counter / Since パネル
- ユーザー追加依頼: 1 ブラウザ 1 日 1 回だけ計測し、Vercel 本番設定を README に記載する

### 実装方針

- カウンター総数は Upstash Redis に保存する
- クライアント側は `localStorage` に東京日付キーを保持し、その日未送信のときだけ `/api/counter` へ加算リクエストを送る
- Redis 未設定環境では `data/siteConfig.ts` の初期値を返して動作を壊さない

### 変更予定のファイルと理由

- `app/api/counter/route.ts`: 現在値取得と加算 API
- `lib/counter.ts`: Redis REST アクセスと初期値・表示整形の共通化
- `components/layout/Sidebar.tsx`: 表示更新と 1 日 1 回送信ロジック
- `README.md`: Redis の接続手順と環境変数設定
- `SPEC.md`: カウンター仕様の正式化

### 検証方法

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

---

## 追加対応: 深夜警告中のリンク制御

### 対応する仕様

- `SPEC.md` の深夜警告イベント
- ユーザー依頼: 深夜警告状態では `/` 以外の遷移先をトップページへ集約する

### 実装方針

- 深夜警告状態を参照する共通リンクコンポーネントを追加し、通常のページ遷移リンクは `/` 以外なら `/` へ向け替える
- すでに `/` 以外のページにいる状態で深夜警告へ切り替わった場合や直接アクセスした場合に備えて、共通レイアウトで `/` へ戻すガードを追加する
- ページ内アンカーや `mailto:` などの非ページ遷移リンクは対象外にして、アクセシビリティと基本操作を維持する

### 変更予定のファイルと理由

- `components/ui/RestrictedLink.tsx`: 深夜警告時の遷移先制御を共通化するため
- `components/theme/SleepWarningRouteGuard.tsx`: 深夜警告中の非トップページ滞在を防ぐため
- `components/layout/SiteFrame.tsx`: 全ページへガードを適用するため
- `app/**`, `components/**`: 既存のページ遷移リンクを共通リンクへ置き換えるため

### 検証方法

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

---

## 追加対応: ポートフォリオ HTML 作品

### 対応する仕様

- ユーザー依頼: `public/portfolio/hikage.png` を使い、時間帯で背景色と装飾が切り替わる HTML 作品を追加する

### 実装方針

- `data/portfolio.ts` に HTML 作品として 1 件追加する
- `components/portfolio/` に専用レンダラーを追加し、夜間は暗い背景と月・星、昼間は白背景と下部の十字星を描画する
- 粒と月は背景 canvas / 前面 canvas に分けて描画し、`hikage.png` と同じ矩形フレーム内に収めてはみ出しを防ぐ
- 粒データは定数化し、数・位置・サイズ・点滅タイミングを手で調整しやすい形で管理する
- ぼかし、影、発光アニメーションは使わず、粒ごとの単純なフェードだけに絞ってスマホ負荷を下げる
- HTML 作品は画像と違って自然なサイズを持たないため、一覧とモーダルで専用の表示枠を必ず与える
- `fill` と `height: 100%` の連鎖に頼らず、作品側が `aspect-ratio` か `width` / `height` を持つようにする

### 変更予定のファイルと理由

- `data/portfolio.ts`: 作品データを登録するため
- `components/portfolio/PortfolioHtmlComponents.tsx`: HTML 作品レンダラーの登録先として使うため
- `components/portfolio/HikageScene.tsx`: 作品本体の描画ロジックを実装するため
- `app/globals.css`: 背景、月、星、十字星の見た目を定義するため

### 検証方法

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

---

## 追加対応: ポートフォリオ個別ページ

### 対応する仕様

- ユーザー依頼: ポートフォリオ作品をモーダルに加えて個別ページでも閲覧できるようにする
- ユーザー依頼: モーダル詳細の右下に「ブラウザで見る」ボタンを追加する
- ユーザー依頼: 個別ページではタイトル、HTML または画像、詳細の順に表示し、詳細は常時表示にする

### 実装方針

- 作品ごとの個別ページは `app/portfolio/[id]/page.tsx` を追加し、既存の `portfolioItems` を元に静的生成する
- モーダル表示の既存動線は維持し、詳細欄の右下に個別ページへの遷移ボタンだけを追加する
- 個別ページ側ではモーダルのアコーディオンを使い回さず、作品情報を常時表示する専用レイアウトにする
- 画像作品と HTML 作品の両方を既存の `PortfolioMedia` で再利用し、見た目の差異はページ用スタイルで吸収する

### 変更予定のファイルと理由

- `data/portfolio.ts`: 個別ページルートに使う URL を作品 ID ベースへ正規化するため
- `components/ui/PortfolioGallery.tsx`: モーダル詳細内に「ブラウザで見る」導線を追加するため
- `app/portfolio/[id]/page.tsx`: ポートフォリオ個別ページ本体を実装するため
- `app/globals.css`: 新しい導線ボタンと個別ページ表示用スタイルを追加するため

### 影響範囲

- `/portfolio` のギャラリー一覧とモーダル詳細 UI
- `/portfolio/[id]` の新規静的ページ
- ポートフォリオ作品データの内部リンク先

### 検証方法

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

### 懸念点・制約・未確定事項

- 既存データの `href` は一覧トップを指しているため、作品 ID ごとの個別ページへ揃える必要がある
- HTML 作品はサムネイルと本体表示でサイズ制御が異なるため、個別ページでの横幅制御を CSS で確認する

---

## 追加対応: ポートフォリオ HTML 作品「猿でもシェイクスピア」

### 対応する仕様

- ユーザー依頼: `public/portfolio/saru-demo/saru.png` をサムネイルに使い、`saru-demo` の HTML 作品を追加する
- ユーザー依頼: レベル切り替え、文字固定、シェイク、クリア判定、クリアモーダルを持つゲームを実装する
- ユーザー依頼: 一番下に `Xに投稿` ボタンを置き、スクリーンショット投稿可否の実装条件を事前に整理する

### 実装方針

- `portfolio` 側の HTML 作品として追加し、既存の HTML 作品レンダラーに新しい専用コンポーネントを登録する
- ゲーム状態はクライアントコンポーネント内で完結させ、レベルごとの目標語、固定可能数、UI文言を定数で管理する
- 文字はカタカナ 1 文字ずつのボックスとして表示し、固定可能なレベルのみクリックで固定 / 解除できるようにする
- `シェイク` 時は固定されていない文字だけをランダム再抽選し、完成時には小さなモーダルを表示する
- `Xに投稿` は直接の画像添付投稿がクライアント単体では困難なため、今回は制約を明示するボタン挙動に留める

### 変更予定のファイルと理由

- `data/portfolio.ts`: 新しい HTML 作品データを登録するため
- `components/portfolio/PortfolioHtmlComponents.tsx`: 新しい HTML 作品レンダラーを登録するため
- `components/portfolio/SaruDemoScene.tsx`: ゲーム本体を実装するため
- `app/globals.css`: ゲーム用レイアウト、文字ボックス、モーダル、案内ボタンの見た目を追加するため
- `plan.md`: 今回の実装方針と制約を記録するため

### 影響範囲

- `/portfolio` 一覧のカード、モーダル、個別ページ
- HTML 作品レンダラーの型と分岐
- モバイル時の HTML 作品表示高さとボタン配置

### 検証方法

- `npm run lint`
- `npx tsc --noEmit`

---

## 追加対応: Portfolio カテゴリ統合

### 対応する仕様

- ユーザー依頼: `Games` ページとメニューはなくし、`Portfolio` にイラスト・HTMLアート・ゲームのカテゴリを持たせる
- ユーザー依頼: カテゴリは `kind` とは別管理にし、`Portfolio` 一覧で絞り込みできるようにする
- ユーザー依頼: `saru-demo` は `Portfolio` 側に残し、既存リンクを維持する

### 実装方針

- `portfolioItems` に表示用カテゴリを追加し、`kind` は描画方式の判定専用として分離する
- `PortfolioGallery` にカテゴリフィルター UI を追加し、一覧のカード表示だけを切り替える
- `Games` のメニュー・専用データ・専用ページは削除し、`saru-demo` は `/portfolio/saru-demo` で引き続き表示する

### 変更予定のファイルと理由

- `data/portfolio.ts`: カテゴリ定義と各作品のカテゴリ設定を追加するため
- `components/ui/PortfolioGallery.tsx`: カテゴリ絞り込み UI を追加するため
- `components/layout/Sidebar.tsx`: `Games` メニューを削除するため
- `app/globals.css`: カテゴリフィルターの見た目を追加するため
- `app/games/page.tsx`, `app/games/[id]/page.tsx`, `data/games.ts`: 不要になったため削除するため

### 影響範囲

- サイドバーのメニュー表示
- `/portfolio` 一覧の絞り込み UI
- `/games` ルートの削除

### 検証方法

- `npm run lint`
- `npm run build`

---

## 追加対応: Portfolio HTMLアート `kokoro`

### 対応する仕様

- ユーザー依頼: `public/portfolio/kokoro` の素材を使って HTMLアート作品を `Portfolio` に追加する
- ユーザー依頼: `base.png` の上に `eye1.png`、下に `wing.png`、`bg.png` の順で重ねる
- ユーザー依頼: 背景は朝・昼は白、夜・深夜は `rgb(187,184,230)` とし、時間判定は既存テーマと同じにする
- ユーザー依頼: `wing` の位置は手動調整しやすくする

### 実装方針

- `data/portfolio.ts` に HTMLアート作品として `kokoro` を追加する
- `components/portfolio/` に専用レンダラーを追加し、`useTimeTheme` の `theme` を参照して背景色を切り替える
- `base`、`eye1`、`bg` は同寸法なので、同じフレームへ絶対配置してぴったり重ねる
- `wing` は別寸法のため、相対位置・相対幅の定数で管理して手調整しやすくする

### 変更予定のファイルと理由

- `data/portfolio.ts`: 作品データとレンダラー ID を追加するため
- `components/portfolio/PortfolioHtmlComponents.tsx`: 新しい HTMLアートレンダラーを登録するため
- `components/portfolio/KokoroScene.tsx`: 作品本体を実装するため
- `app/globals.css`: `kokoro` 用レイアウトと重ね順のスタイルを追加するため

### 検証方法

- `npm run lint`
- `npm run build`
