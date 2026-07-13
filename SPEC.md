# YukimiWorks 企業ホームページ 仕様書

## 概要

YukimiWorksのコーポレートホームページ。  
2000年代の個人サイトやドット絵UIを想起させる「平成レトロ・ピクセルWeb」を基調としつつ、現代のレスポンシブ対応、アクセシビリティ、SEO、フォーム機能を維持する。

トップページは、サイト全体を一つのデスクトップウィンドウのように見せる中央配置型レイアウトとする。淡いアイスブルー、二重線、点線、ピクセルアイコン、雪・星・ドット装飾を用い、来訪者が小さな発見や隠し演出を楽しめるサイトを目指す。

技術スタック、フォーム、メール送信の基本方式は維持し、ページ構成とデータ管理は本仕様に合わせて整理する。

トップページの視覚仕様は、プロジェクト内に配置する`yukimiworks-html-sample`を正解デザインとして扱い、レイアウト、寸法、余白、パネル構成、装飾、キャラクター位置を100%そのまま再現する。`SPEC.md`の記述とHTMLサンプルの実表示に差がある場合、トップページの視覚表現についてはHTMLサンプルを優先する。

## 技術スタック

| 項目 | 選定 |
|------|------|
| フレームワーク | Next.js 14（App Router） |
| スタイリング | Tailwind CSS + CSS Modules（アニメーション等） |
| アニメーション | Framer Motion |
| フォーム | React Hook Form + Zod（バリデーション） |
| メール送信 | Resend |
| デプロイ | Vercel |
| 言語 | TypeScript |

---

## デザイン方針

### コンセプト

- **方向性**: 参考画像の平成レトロ個人サイトを優先して再現し、現代的な実装基盤のみ内部で維持する
- **キーワード**: ピクセルUI、ドット絵、雪、アイスブルー、ウィンドウ枠、点線、隠し演出、時間帯変化
- **禁止事項**: メインサイトではグラスモーフィズム、大きなぼかしブロブ、全面的なピンク・パープルグラデーションを主表現として使用しない
- **文字表現**: メインサイトではロゴ、英字見出し、日本語本文、メニュー、フォーム、補助ラベル、フッターを含むすべての文字にドット系フォントを使用する。可読性を理由に通常フォントへ切り替えない
- **画像表現**: キャラクター、サービス、SNS、季節イベント用アイコンは専用PNGまたはSVGを使用し、環境依存の絵文字を主要UIに使用しない

### 参照実装と素材の取り扱い

- 実装時は`yukimiworks-html-sample`の`index.html`、`styles.css`、`app.js`、`README.md`、画像素材を必ず確認する
- トップページのデザインは`yukimiworks-html-sample`の実表示を100%再現する
- トップページの視覚仕様に競合がある場合は、以下の順で優先する
  1. `yukimiworks-html-sample`の実表示
  2. `yukimiworks-html-sample/styles.css`
  3. `yukimiworks-html-sample/index.html`
  4. 本仕様書
  5. 既存実装
- 完成サイトから`yukimiworks-html-sample`内のCSS、JavaScript、画像を直接参照してはならない
- サンプル内の素材は、`public/character/`、`public/icons/`、`public/effects/`など、実プロジェクト内の適切なフォルダへコピーして使用する
- サンプルのCSSとJavaScriptはNext.jsのコンポーネント、CSS Modules、`globals.css`、hooksへ移植する
- `../yukimiworks-html-sample/assets/...`のような外部フォルダ参照は禁止する
- キャラクターやピクセルアイコンを絵文字、CSS図形、別デザインの画像へ置き換えない

### 基本カラーパレット

| 用途 | CSS変数 | 基本値 |
|---|---|---|
| ページ外側背景 | `--site-outer-bg` | `#eaf4ff` |
| サイト本体背景 | `--site-bg` | `#fbfdff` |
| パネル背景 | `--site-surface` | `#ffffff` |
| 薄いパネル背景 | `--site-surface-soft` | `#f3f8ff` |
| 主アクセント | `--site-accent` | `#315acb` |
| 補助アクセント | `--site-accent-soft` | `#8fb6ff` |
| 主テキスト | `--site-text` | `#172554` |
| 副テキスト | `--site-text-muted` | `#566783` |
| 枠線 | `--site-border` | `#7ca2e8` |
| 点線 | `--site-dotted` | `#a9c5f6` |
| フォーカス | `--site-focus` | `#174fd6` |

### フォント

- メインサイト全体: `DotGothic16`を第一候補として使用する
- ロゴ、英字見出し、日本語本文、フォーム、カウンターを含めて同一のドット系フォントへ統一する
- フォールバックは`MS Gothic`、`Osaka-Mono`、`monospace`の順とする

### パネル・ウィンドウ表現

- 各セクションを独立したウィンドウ風パネルとして表示する
- 外枠は `1px` の青系ボーダーと内側の薄い線を組み合わせた二重線風とする
- タイトルバーは単色のごく薄いブルー背景とし、グラデーションを使用しない。見出し文字と雪装飾は別要素として実装し、見出し文字は濃い青、雪装飾は参考画像に近い淡い水色を使用する
- セクション間は点線で区切る
- 角丸は原則 `0〜4px` とし、現代的な大きい角丸は使用しない
- 影は薄い1〜2pxのピクセル影に限定し、大きなぼかし影は使用しない

### 装飾要素

| 要素 | 用途 | 実装 |
|---|---|---|
| 雪の結晶 | ロゴ周辺、タイトルバー、メニュー項目 | SVGまたはCSS、装飾画像には空の`alt` |
| 小さな星 | 深夜背景、ホバー、見出し | SVGまたはCSS |
| ドット | 背景パターン、区切り線 | `radial-gradient`または`border-style: dotted` |
| ピクセルアイコン | サービス、SNS、メニュー | 専用PNG/SVG |
| キャラクター | Welcomeパネル | 透過PNG、クリック可能なボタン要素として実装 |
| カウンター | サイドパネルの簡易訪問数表示 | 等幅フォント、1ブラウザ1日1回だけ加算する軽量集計 |

### サイト全体レイアウト

- ページ全体に淡いブルー背景を敷く
- デスクトップのコンテンツ最大幅は参考画像に合わせて約`1112px`とし、中央配置する
- 上部バナー、本文2カラム、フッターを同じ最大幅で直接配置する
- 全要素をまとめて囲う白い外側フレーム、外枠、背景板、ドロップシャドウは設置しない
- パネル間の隙間には白ではなくページ全体と同じ淡いブルー背景を見せる
- デスクトップ本文は左サイドバー `260〜280px`、右メインカラム `1fr`
- サイドバーとメインカラムの間隔は `14〜18px`
- モバイルは1カラムとし、メニュー、更新情報、本文の順に配置する
- 横スクロールは発生させない
- 各ページの主要コンテンツは同じサイトフレーム内に表示する

### レスポンシブ

- Mobile: `375px〜767px`
- Tablet: `768px〜1023px`
- Desktop: `1024px〜`
- デスクトップではサイドバーを表示する
- タブレット以下ではサイドバーを上部の折りたたみメニューまたは通常フローのパネルへ変換する
- キャラクター、吹き出し、アイコンはコンテナ幅に応じて縮小する

### アニメーション方針

- 基本は短いフェード、2〜4px程度の移動、1段階の画像差し替えに限定する
- 常時大きく動く背景や、読み取りを妨げるパララックスは使用しない
- Framer Motionは吹き出し、キャラクター表情、パネル表示、ホバー反応に使用する
- `prefers-reduced-motion: reduce` の場合は移動・点滅を無効化し、表示切り替えのみ行う
- 背景装飾には `pointer-events: none` を設定する

### 参考画像準拠の必須ルール

- `Menu`、`Welcome`、`Works`、`Link`、`What’s New`、`Counter`などのタイトル文字はすべてドット系フォントを使用する
- タイトル両側の雪マークはタイトル文字と同じ色にせず、参考画像に近い淡い水色で表示する
- 上部の`YukimiWorks`とキャッチコピーも同じドット系フォントを使用する
- メインサイト内の全テキストをドット系フォントへ統一し、可読性のための通常フォント併用は行わない
- パネルタイトル、上部バナー、本文パネルにグラデーションを使用しない
- キャラクターの近くに`CLICK`等の案内文字を表示しない
- キャラクタークリック時は横移動・回転・左右の揺れを行わず、数px下へ移動するだけとする
- Welcomeのキャラクター位置は常に固定し、吹き出し表示用のスペースを通常フローに確保しない
- 吹き出しは絶対配置のオーバーレイとし、他要素の上に表示する
- `Works / News`という結合見出しは使用しない。HTMLデザインサンプルでは当該結合パネル自体を配置しない
- パネル間の余白と左右カラム間の余白にはページ背景と同じ色を表示し、白い背景板を見せない
- 上部バナー、2カラム本文、フッター全体を囲う追加の外枠・背景板は設置しない
- デスクトップの列幅、パネル高さ、キャラクターサイズは参考画像の比率を優先する

### デザイン適用範囲

- 本節のレトロデザインは `/`、`/works`、`/portfolio`、`/links`、`/news`、`/about`、`/contact`、各詳細・フォームページ、`/cocoa/privacy-policy` に適用する

## ページ構成

```text
/（ルート）
├── 共通上部バナー
├── 左サイドバー
│   ├── Menu
│   ├── What's New
│   └── Counter / Since
└── メインカラム
    ├── Welcome（キャラクター・吹き出し）
    ├── Portfolio（最新ポートフォリオ）
    ├── Works（コンテンツ・ツール開発・アプリサービスの分類導線）
    └── Link / SNS

/works（成果物一覧ページ）
└── コンテンツ・ツール開発・アプリサービスの全成果物を表示し、分類で絞り込み可能

/works/[id]（成果物個別ページ）
└── 成果物詳細（画像・動画・タイトル・説明文）

/portfolio（ポートフォリオページ）
└── イラスト作品を一覧表示し、画像を追加して公開可能

/links（リンク一覧ページ）
└── 全リンクを表示。トップ表示対象は同一データのフラグで管理

/news（お知らせ一覧ページ）
└── 全お知らせをレトロパネル形式で表示

/news/[id]（お知らせ個別ページ）
└── 記事詳細（サムネイル・本文・インライン画像・動画）

/about（会社案内ページ）
└── 指定された会社紹介文を中央揃えで表示

/contact（お問い合わせ ハブページ）
└── 2種類のフォームへのパネル型リンク + その他連絡先

/contact/inquiry
└── 仕事のご依頼フォーム

/contact/app
└── アプリ・サービスお問い合わせフォーム

/cocoa/privacy-policy
└── Cocoaアプリ プライバシーポリシー
```

### トップページのデスクトップ構成

```text
┌──────────────────────────────────────────────────┐
│ YukimiWorks ロゴバナー                            │
│ 小さなアイデアを形にする                          │
├───────────────┬──────────────────────────────────┤
│ Menu          │ Welcome                          │
│ What's New    ├──────────────────────────────────┤
│ Counter       │ Portfolio（最新ポートフォリオ）  │
│               ├──────────────────────────────────┤
│               │ Works（分類導線）                │
│               ├──────────────────────────────────┤
│               │ Link / SNS                       │
├───────────────┴──────────────────────────────────┤
│ Footer                                           │
└──────────────────────────────────────────────────┘
```

- トップページは`yukimiworks-html-sample`のメイン画面を100%そのまま再現する
- サンプルの`Service`表記は、同じ見た目と行構成を保ったまま`Works`へ変更する
- トップページへ`Philosophy`、`Pickup Works`、`News`、`Contact`など、依頼にない追加パネルを配置しない
- トップページのWelcome、Portfolio、Works、Linkは同一デザインシステムで構成し、Welcome/Works/Linkはサンプル基準の余白感と構造を維持する
- サイドバーはサンプルと同じ通常フローを基本とし、視覚差が生じる`position: sticky`は使用しない

### サブページの共通構成

- トップページ以外でも、上部バナー、左サイドバー、フッターをトップページと同一デザイン・同一寸法で表示する
- 左サイドバーの`Menu`、`What's New`、`Counter`をそのまま維持する
- サブページではトップページ右カラムの`Welcome`、`Works`、`Link`部分のみをページ固有コンテンツへ置き換える
- サブページ専用のモダンなヘッダー、横型ナビゲーション、全幅カードレイアウトを作成しない
- フォームページも同じ右メインカラム内へ表示し、サイトフレーム自体の列幅を変更しない
- モバイル時の並び順と縮小方法もHTMLサンプルのレスポンシブ実装を基準とする

## 共通ヘッダー・サイトフレーム

全メインサイトページに同一のサイトフレームを配置する。既存の`Header.tsx`は、横長モダンナビゲーションではなく上部ロゴバナーとして再設計する。

### 上部ロゴバナー

- コンテンツ最大幅の最上部に独立したパネルとして配置する
- 背景は白またはごく薄いブルーの単色と微細なドットパターンとし、グラデーションは使用しない
- 外周は二重線風の青枠
- 中央に「YukimiWorks」をドット系フォントで表示する。参考画像の文字サイズ、字間、濃い青色へ近づける
- ロゴ左右に雪の結晶または小さな星を配置する
- ロゴ直下にキャッチコピーを同じドット系フォントで表示する
  - 通常: `小さなアイデアを形にする`
  - 昼食イベント: `腹が減っては仕事はできぬ`
  - お菓子イベント: `甘いものでもいかが？`
  - 深夜警告イベント: `はやく寝ろ`
- ロゴ全体はトップページへのリンクとする
- ヘッダーは原則通常フローに置き、画面上部への固定は行わない
- スマホ幅では`yukimiworks-html-sample`に合わせ、ヘッダー左右の雪装飾を表示しない

### デスクトップサイドバー

`components/layout/Sidebar.tsx`として実装する。

#### Menuパネル

- パネルタイトル: `Menu`
- ナビゲーション:
  - `Top` → `/`
  - `About` → `/about`
  - `Works` → `/works`
  - `Portfolio` → `/portfolio`
  - `News` → `/news`
  - `Link` → `/links`
  - `Contact` → `/contact`
- `Service`は廃止し、メニューおよびルーティングに含めない
- 現在ページには小さな矢印またはドットを表示する
- 各リンクの左に専用ピクセルアイコンまたは雪マークを置く
- キーボードフォーカス時は枠と背景色で明確に示す

#### What's Newパネル

- `/data/news.ts`の先頭2〜3件を表示する
- 日付と短いタイトルを表示し、クリックで記事詳細へ遷移する
- 下部に「過去の更新履歴」リンクを配置し、`/news`へ遷移する
- データがない場合は`更新情報はありません`と表示する

#### Counter / Sinceパネル

- `Since 2026.03.04`を表示する
- カウンター値は `data/siteConfig.ts` の初期値を起点に表示する
- 本番では Redis に総数を保存し、同じブラウザからは 1 日に 1 回だけ加算する
- 1 日判定はブラウザの `localStorage` に保存した東京日付キーで行う
- `localStorage` の削除、別ブラウザ、別端末は別訪問として扱う
- Redis 未設定時は `data/siteConfig.ts` の初期値をそのまま表示し、加算しない

### モバイルナビゲーション

- 上部バナー直下に`Menu`パネルを配置する
- ハンバーガーボタンで開閉可能な折りたたみ形式とする
- 開いたメニューはサイトフレーム内で展開し、黒いフルスクリーンオーバーレイは使用しない
- メニュー展開中は必要に応じて背景スクロールをロックする
- `aria-expanded`、`aria-controls`、フォーカス移動を実装する

### ファビコン

- `/public/logo/yukimi_works_favicon.png`を使用する

```ts
export const metadata: Metadata = {
  icons: {
    icon: '/logo/yukimi_works_favicon.png',
  },
};
```

### OGP設定

- OGP画像には`/public/logo/open_graph.png`を使用する
- OGP画像は新デザインに合わせ、アイスブルーの枠、ピクセルロゴ、キャッチコピーで作り直す

```ts
export const metadata: Metadata = {
  icons: {
    icon: '/logo/yukimi_works_favicon.png',
  },
  openGraph: {
    title: 'YukimiWorks | アプリ・コンテンツ制作',
    description: '小さなアイデアを形にするYukimiWorksの公式サイト',
    images: [{ url: '/logo/open_graph.png' }],
  },
};
```

### サイトフレームの実装

- `components/layout/SiteFrame.tsx`で上部バナー、サイドバー、メイン、フッターの構造を統合する。ただし`SiteFrame`自身には背景、枠、影を付けず、視覚的な外側コンテナとして見せない
- 時間帯テーマは`SiteFrame`最上位要素の`data-theme`属性で制御する
- 特殊イベント時は`data-event`属性を併用する

```html
<div class="mainSiteRoot" data-theme="day" data-event="none">
```

- 初期テーマのフラッシュを抑えるため、ブラウザ側で時刻を判定する小さな初期化スクリプトをHydration前に実行する
- Reactマウント後は`TimeThemeProvider`が状態を引き継ぐ

## Section 1: Welcome

**ID**: `#welcome`

### レイアウト

- メインカラム先頭のウィンドウパネルとして表示する
- タイトルバー: `Welcome`
- デスクトップは左にキャラクター、右に紹介文
- モバイルはキャラクターを上、紹介文を下に配置する
- キャラクターの基準位置とWelcomeパネルの高さは参考画像に合わせ、吹き出し用の余白を確保しない。吹き出しの有無でキャラクターや本文の位置を変えない

### コンテンツ

```text
YukimiWorksのホームページへようこそ。

当サイトでは小さなコンテンツから大きなサービスまで、
たくさんのアイデアを形にし、残しています。
```

- キャラクター通常画像: `/public/character/default.png`
- キャラクタークリック時画像: `/public/character/poked.png`
- 睡眠状態画像: `/public/character/sleeping.png`
- キャラクター画像はドット絵の劣化を避けるため、`next/image`を使う場合は`unoptimized`を付与する
- 通常表示は元画像`37px × 45px`を整数3倍の`111px × 135px`で表示することを基準とする
- キャラクター付近に`CLICK`、`click`、操作説明などの可視テキストを表示しない
- クリック可能領域は`button`として実装し、`aria-label="キャラクターに話しかける"`を設定する

### 通常吹き出し

表示候補:

```ts
export const baseWelcomeMessages = [
  'いらっしゃいませ',
  'こんにちは',
  '何かご用ですか',
  'ゆっくり見ていってください',
  '色々あります',
  '新しい作品が追加されました',
  'ご機嫌いかが',
] as const;
```

#### 表示タイミング

1. ページ表示直後に吹き出しを表示する
2. 初回吹き出しは約2.5秒表示する
3. 候補から1件をランダム表示する
4. 2回目以降も約2.5秒表示する
5. 消えた後、4〜9秒程度のランダムな待機時間を空ける
6. 以後同じ処理を繰り返す

- 同じメッセージが2回連続しないようにする
- `setInterval`ではなく再帰的な`setTimeout`を使用する
- タブが非表示の間はタイマーを一時停止または次回表示を延期する
- コンポーネント破棄時に全タイマーを解除する
- 吹き出しはキャラクター領域内の`position: absolute`で表示し、`z-index`を十分高く設定して全要素の上へ重ねる。他の文字やパネルを隠してもよい
- 吹き出しは通常レイアウトに参加させず、表示・非表示によるキャラクター、本文、パネル高さの移動を発生させない
- 吹き出しは`AnimatePresence`で短いフェードと2〜4px程度の移動を付ける
- 00:00〜04:59は`/character/sleeping.png`を表示し、吹き出しは`ZZZ`のみを繰り返す
- 00:00〜04:59にキャラクターをクリックした場合も、下へ沈む動きだけは行うが、画像は`/character/sleeping.png`のままとし、吹き出しも`ZZZ`以外を表示しない
- 時間帯に応じて以下の追加候補を混ぜる

```ts
earlyMorning: ['おはようございます', '今日も頑張ります', 'まだ眠い']
day: ['お腹空いた', 'お昼休みです', 'ちょっと休憩']
snackHour: ['ちょっと休憩', 'おやつの時間', 'サボり中です', '筋トレでもしよう']
evening: ['今日もお疲れ様', 'もう夕方です', '夕ご飯の準備をしないと', '今日のご飯は何にしようかな']
night: ['こんばんは', '夜ですね', 'もうこんな時間']
lateNight: ['そろそろ眠くなってきた']
sleeping: ['ZZZ']
```

- 通常候補の `こんにちは` は固定にせず、05:00〜06:59では `おはようございます`、19:00以降では `こんばんは` に置き換える

- 05:00〜06:59は`earlyMorning`
- 12:00〜12:59だけ`day`
- 15:00台はおやつ時間用メッセージを優先する
- 21:00以降は夜メッセージに`そろそろ眠くなってきた`を追加する
- 直近約6秒以内のタップが1回以上残っている間は、時間経過による通常吹き出しを表示しない

### キャラクタークリック演出

#### 表情変更

- クリック時は100%発動する
- 画像を`/character/poked.png`へ切り替える
- 約140ms後に`/character/default.png`へ戻す
- 表情変更中に再クリックされた場合は復帰タイマーをリセットし、最新クリックから約140ms後に戻す
- クリック時のキャラクター移動は横方向、回転、揺れを禁止する。クリック直後のみ`translateY(2px〜3px)`で約100〜150ms下へ沈ませ、表情画像の表示時間とは関係なく即座に元の位置へ戻す

#### 特殊メッセージ抽選

短時間連打数に応じて排他的に判定する。短時間連打は直近約6秒のクリック回数として扱う。

1. 30回以上の短時間連打時
   - 60%: `あなたも暇ですね`
2. 8回以上30回未満の短時間連打時
   - 20%: `怒りますよ`
   - 35%: `あまりつつかないでください`
   - 45%: `困りますお客様`

- 特殊メッセージは通常メッセージより優先する
- 特殊メッセージ表示中は通常吹き出しタイマーを一時停止する
- 特殊メッセージは約2.5秒表示する
- 複数クリックが重なった場合は最新の特殊メッセージで上書きする
- 画像差し替えは特殊メッセージが出ない場合も必ず実行する
- 不在状態ではクリックしても反応しない

### 不在イベント

- 不在は独立した特殊イベント `away` として扱う
- `away` は `05:00〜23:59` の間だけページ読み込みごとに0.5%で発生する
- 発生時はWelcomeパネルのキャラクターを非表示にし、キャラクターがいた位置に尻尾のない吹き出しで `お出かけ中` を固定表示する
- Counterパネル内のミニキャラクターも非表示にし、`お出かけ中` テキストへ置き換える
- 通常の `away` とは別に、低確率で取り込み中イベント `busy` へ置き換える

### 取り込み中イベント

- `busy` は通常不在イベントの派生として扱う
- デバッグでは `away` と分けて個別に強制表示できるようにする
- 発生時はWelcomeパネルとCounterパネルを通常不在と同様に非表示へ切り替える
- ヘッダー左外側をドラッグして少しだけ右へ引けるようにし、3層構造の左パネルだけが開く見た目にする
- 一定量引いた時点でそれ以上は開かず、`お取り込み中です！` を表示した直後に元の状態へ戻す

### 深夜不在イベント

- `00:00〜01:59` の間だけ、通常不在とは別に `late-night-away` をページ読み込みごとに0.5%で発生させてよい
- `02:00〜04:59` の睡眠時間帯では、深夜警告を除いて通常不在イベントも取り込み中イベントも発生させない
- 発生時はWelcomeパネルの固定文言とCounterパネルの固定文言を `....` にする
- ヘッダー左上をドラッグすると `public/effects/eyes2.png` が少し覗くようにする
- 深夜不在ではメッセージを表示しない

### コンポーネント

- `components/welcome/WelcomeCharacter.tsx`
- `components/welcome/CharacterBubble.tsx`
- `components/welcome/useCharacterInteraction.ts`
- メッセージ定義は`data/characterMessages.ts`で管理する

---

## Section 1.5: Portfolio

**ID**: `#portfolio`

### 構成

- タイトルバー: `Portfolio`
- トップページの`Works`の上に配置する
- 最新ポートフォリオを左詰めで、レスポンシブに横並び表示する
- 表示件数はパネル内に収まる範囲で最大8件とする
- 各項目は「サムネイルの下にタイトル」を縦積みで表示する
- 項目数が少ない場合、余り幅は空きスペースのままとする
- 各項目をクリックすると作品やコンテンツの個別リンク先へ直接遷移する
- パネル右端に `その他の作品 »` を表示し、`/portfolio` へ遷移させる

---

## Section 2: Works

**ID**: `#works`

### 構成

タイトルバー: `Works`

以下の3分類を、アイコン・タイトル・説明の横並び行として表示する。各行全体をリンクとし、`/works`を該当分類で絞り込んだ状態で開く。

| 分類値 | 表示名 | 通常アイコン例 | 説明 | 遷移先 |
|---|---|---|---|---|
| `contents` | コンテンツ | `/icons/default/contents.png` | Web記事・企画・ガイドなどの成果物 | `/works?category=contents` |
| `tools` | ツール開発 | `/icons/default/tools.png` | 業務効率化や日常を支援するツール | `/works?category=tools` |
| `apps` | アプリサービス | `/icons/default/apps.png` | Webサービス・モバイルアプリ | `/works?category=apps` |

- 各行の間を点線で区切る
- 行全体を`next/link`でラップする
- URLクエリの分類値とWorksページのフィルター状態を同期する
- アイコンは`image-rendering: pixelated`を必要に応じて指定する
- 昼食・お菓子イベント時はアイコンマッピングを切り替える
- `Service`というセクション名、ID、コンポーネント名は使用しない

---

## Section 3: Link

**ID**: `#link`

### 構成

- タイトルバー: `Link`
- `/data/links.ts`のうち`showOnHome: true`のリンクのみ表示する
- X、Instagramなどを、HTMLサンプルと同じ2列のアイコン・サービス名・短い説明の構成で表示する
- デスクトップの列数、余白、アイコンサイズ、タイトル位置はHTMLサンプルをそのまま再現する
- 通常時は各サービス固有のアイコンPNGを表示する
- 外部リンクには`target="_blank" rel="noopener noreferrer"`を設定する
- アイコンのみで意味を伝えず、サービス名をテキスト表示する
- トップ用とリンク一覧用に別データを持たず、`showOnHome`フラグで制御する
- HTMLサンプルに存在しない追加のContactパネルをトップページへ配置しない

### トップページに配置しないセクション

以下はトップページへ配置しない。

- Philosophy
- Pickup Works
- Newsプレビュー
- Contact導線

必要な内容は`/about`、`/works`、`/news`、`/contact`の各サブページで表示する。

## 時間帯テーマ・ランダムイベント仕様

### 基本方針

- 時刻判定は日本標準時`Asia/Tokyo`で行う
- ブラウザ表示中は1分ごとに時刻を再判定する
- 対象時間帯へ入った瞬間にもテーマを更新する
- 通常テーマと特殊イベントの結果は`data-theme`、`data-event`、CSS変数で制御する

### 通常時間帯テーマ

| 時間帯 | テーマ名 | 表現 |
|---|---|---|
| 05:00〜08:59 | `early-morning` | 明るいオレンジ、柔らかい朝焼け |
| 09:00〜16:59 | `day` | 基本のアイスブルー・白 |
| 17:00〜18:59 | `evening` | 濃いオレンジ、夕焼け色の枠・背景 |
| 19:00〜23:59 | `night` | ダークブルー、明るい青文字・枠 |
| 00:00〜04:59 | `late-night` | ダークブルー、小さな星粒背景 |

### 朝夕・深夜の画像表現

- `early-morning`ではキャラクター、Counter、各種アイコンなどのドット絵にだけ明るいオレンジ系の`mix-blend-mode: screen`を適用する
- `evening`ではキャラクターおよび対象ピクセル画像にオレンジ系の`mix-blend-mode: multiply`を適用する
- `late-night`では小さな星粒背景を多数配置し、全て同じ方向へゆっくり移動させる
- `late-night`ではキャラクターおよび対象ドット絵へ暗めの青を`mix-blend-mode: multiply`で重ねる
- 透明PNGの輪郭を自然に保てない場合は専用画像を用意して差し替える
- CSSで行う場合は画像の不透明部分だけをマスクとして使い、透過部分を除いた上でブレンドモードを適用し、クリック領域を妨げない

### 昼食イベント

- 有効時間: 12:00〜12:30
- 発動確率: 1%
- 発動時:
  - コンテンツ、ツール開発、アプリサービスのアイコンを食べ物PNGへ変更する
  - SNSリンクのアイコンは通常時と同じ `x.png` / `instagram.png` を使用する
  - ヘッダー左右の雪マークは `public/icons/food/contents.png` を左右1つずつ表示する
  - テーマカラーを鮮やかなオレンジと白の楽しい配色へ変更する
  - 背景へ縦方向の白ストライプを入れる
  - キャッチコピーを`腹が減っては仕事はできぬ`へ変更する
  - Welcome と Counter は不在状態として扱い、固定文言は `食事中` にする
- 食べ物画像は`/public/icons/food/`に配置する

### お菓子イベント

- 有効時間: 15:00〜15:30
- 発動確率: 1%
- 発動時:
  - 全体をはっきりしたピンクと白い斜め配置の水玉模様へ変更する
  - コンテンツ、ツール開発、アプリサービスのアイコンをお菓子PNGへ変更する
  - SNSリンクのアイコンは通常時と同じ `x.png` / `instagram.png` を使用する
  - ヘッダー左右の雪マークは `public/icons/sweets/apps.png` を左右1つずつ表示する
  - キャッチコピーを`甘いものでもいかが？`へ変更する
- お菓子画像は`/public/icons/sweets/`に配置する
- 水玉背景はCSSの`radial-gradient`で生成する

### 深夜警告イベント

- 有効時間: 02:00〜02:30
- 発動確率: 1%
- 発動時:
  - 背景を赤に変更する
  - 主要文字色を黒に変更する
  - 背景に `public/effects/eye.png` を斜め配置で反復表示する
  - キャラクター画像と各種サムネイル画像は `public/effects/eyes.png` に差し替える
  - キャッチコピーを`はやく寝ろ`へ変更する
  - ヘッダータイトルの `YukimiWorks` は `はやく　寝ろ` へ変更する
  - ヘッダーの文字以外のテキストを文字化け風文字列へ置換表示する
  - キャラクターをクリックしても下に沈む動きだけ行い、何も言わない
  - 時間経過でも吹き出しを表示しない
- 背景用画像は`/public/effects/eye.png`、キャラクター・サムネイル差し替え用画像は`/public/effects/eyes.png`に配置する
- フォーム入力欄は操作性維持のため白または薄い赤背景、黒文字、明確な枠線を維持する

### 抽選ルール

- 昼食イベント、お菓子イベント、不在イベントはページ読み込みごとに再抽選する
- 毎分のテーマ再判定では昼食・お菓子・不在イベントを再抽選しない
- 深夜警告イベントだけは、02:00〜02:30の間に一度発動したら`02:30`まで`localStorage`で保持し、全ページで同じ色と状態を共有する
- `localStorage`が使えない場合は現在タブ内のみメモリ保持とする

### 優先順位

1. `sleep-warning`
2. `snack`
3. `lunch`
4. `late-night-away`
5. `busy`
6. `away`
7. 通常時間帯テーマ

- 特殊イベントは同時に複数適用しない
- 深夜警告イベント中は通常の星粒背景を赤い目玉背景で上書きする

### 実装コンポーネント

- `components/theme/TimeThemeProvider.tsx`
- `components/theme/useTimeTheme.ts`
- `components/theme/ThemeDebugPanel.tsx`
- `data/themeConfig.ts`
- `data/iconSets.ts`
- `lib/japanTime.ts`

### Hydration対策

- サーバー出力は`day`を初期値とする
- Hydration前の小さなインラインスクリプトで`Asia/Tokyo`の時刻を判定し、`document.body.dataset.theme`を設定する
- Reactマウント後に同じ判定ロジックで状態を同期する
- 初期化スクリプトとReact側で判定関数を二重管理せず、共通化可能な定数・時間境界を使用する

### 動作確認用開発モード

時間帯ごとの表示と特殊イベントを手動確認するため、開発環境にデザインテストUIを実装する。

#### テストUIの配置

- 画面右下へ`position: fixed`で配置する
- 通常レイアウトへ参加させず、ヘッダー、2カラム、パネル高さ、フッター位置を変化させない
- 閉じた状態では小さなボタンまたは`details/summary`として表示する
- `z-index`を十分高く設定する
- モバイルでは`max-width: calc(100vw - 24px)`などを使用し、画面外へはみ出させない
- テストUIを操作してもフォーム入力値、現在のフォーカス、ページスクロール位置を不要にリセットしない

#### 時間帯プリセット選択

```text
自動
早朝（early-morning）
昼（day）
夕方（evening）
夜（night）
深夜（late-night）
```

#### 手動上書き

```text
テーマ
自動
早朝（early-morning）
昼（day）
夕方（evening）
夜（night）
深夜（late-night）

イベント
自動
なし（none）
不在（away）
取り込み中（busy）
深夜不在（late-night-away）
昼食（lunch）
お菓子（snack）
深夜警告（sleep-warning）
```

- 時間帯プリセットを主操作とし、テーマ・時間帯イベント・会話内容をまとめて確認できるようにする
- テーマとイベントは必要に応じて別々に手動上書きできる
- 不在確認はイベント手動上書きの `away` `busy` `late-night-away` を使い分ける
- 選択直後に表示へ反映する
- `自動`へ戻した場合は日本時間と日単位抽選による通常判定へ復帰する
- テストUIとクエリパラメータは同じ状態管理と判定関数を使用する
- テストUIは`components/theme/ThemeDebugPanel.tsx`として分離してよい

開発環境では以下のクエリパラメータによる強制表示にも対応する。

```text
?theme=early-morning
?theme=day
?theme=evening
?theme=night
?theme=late-night
?event=none
?event=lunch
?event=snack
?event=sleep-warning
```

- 強制指定とテストUIは`process.env.NODE_ENV !== 'production'`の場合のみ有効とする
- 本番環境ではクエリによる強制表示を無効化し、テストUIをDOMへ出力しない

## 制作実績一覧ページ（`/works`）

**パス**: `/works`

### 概要

- コンテンツ・ツール開発・アプリサービスの成果物を一元表示するページ
- 共通サイトフレーム内に表示する
- 「すべて」「コンテンツ」「ツール開発」「アプリサービス」の絞り込み機能を設ける
- トップページの3分類リンクから遷移した場合は、URLクエリに応じた分類を初期選択する

### カテゴリー一覧

| カテゴリー値 | 表示ラベル |
|---|---|
| `'contents'` | コンテンツ |
| `'tools'` | ツール開発 |
| `'apps'` | アプリサービス |

- 「すべて」タブを先頭に置く
- `works`配列に1件以上存在するカテゴリーのみ表示する。「すべて」は常に表示する
- 選択状態は`?category=contents`、`?category=tools`、`?category=apps`としてURLへ反映する
- 無効なカテゴリー値の場合は「すべて」として扱う
- ブラウザの戻る・進む操作でもフィルター状態を同期する
- カードの表示順は`works`配列の格納順とし、ソートしない

### レイアウト

- ページタイトルはレトロパネルのタイトルバー内に「成果物」、補助ラベルとして「Works」を表示する
- カードグリッド: 3列（広いデスクトップ） / 2列（標準デスクトップ・タブレット） / 1列（モバイル）
- カードグリッド全体を中央揃えで配置する
- 絞り込み結果が0件の場合は「該当する成果物はありません」と表示する
- 各カードクリックで`/works/[id]`へ遷移する

### データ構造（`/data/works.ts`）

```ts
export type WorkMedia = {
  type: 'image' | 'video';
  src: string;
  alt?: string;
};

export type WorkBodySegment =
  | { type: 'text'; value: string }
  | { type: 'link'; label: string; href: string };

export type WorkCategory = 'contents' | 'tools' | 'apps';

export type Work = {
  id: string;
  title: string;
  description: string;
  body?: WorkBodySegment[] | string;
  category: WorkCategory;
  tags: string[];
  thumbnail: string;
  media?: WorkMedia[];
  url?: string;
  featured?: boolean;
};

export const works: Work[] = [
  {
    id: 'test-work-01',
    title: 'テスト成果物',
    description: 'テスト用のサンプルエントリーです。',
    body: '成果物の詳細説明を記載します。',
    category: 'apps',
    tags: ['サンプル'],
    thumbnail: '/works/placeholder.svg',
    media: [
      {
        type: 'image',
        src: 'https://res.cloudinary.com/<your-cloud>/image/upload/placeholder.jpg',
        alt: 'テスト画像',
      },
    ],
    featured: true,
  },
];
```

- 新規成果物は`works`配列への追記だけで一覧・絞り込み・詳細ページへ反映する
- `category`は3分類のいずれかを必須とする
- 既存の`design-web`、`illust-art`、`book`、`goods`カテゴリーは廃止する
- イラスト作品は`works`ではなく`/data/portfolio.ts`で管理する

---

## 制作実績個別ページ（`/works/[id]`）

**パス**: `/works/[id]`

### 概要

- 制作実績一覧の各カードをクリックすると遷移する詳細ページ
- 共通サイトフレーム内に表示する
- `/data/works.ts` の `works` 配列から `id` に一致するデータを取得して表示する
- Next.js の `generateStaticParams` を使用して静的生成（SSG）する

### レイアウト・コンテンツ

```
[共通上部バナー・サイドバー]

[← 制作実績一覧へ戻る]  ← ページ左上に配置

        タイトル（中央揃え）

────────────────────────────────  ← タイトル直下に区切り線

  ┌────────────────────────────┐
  │   画像 or 動画（中央揃え）    │
  │   ※ media[] の順番で縦に並ぶ │
  └────────────────────────────┘

        詳細テキスト（中央揃え）

  [タグ一覧]

[共通フッター]
```

### 表示仕様

#### 左上の戻るボタン

- ページ左上（ヘッダー直下コンテンツ領域の左端）に「← 制作実績一覧へ戻る」ボタンを配置する
- `next/link` を使用し、`/works` へ遷移する
- ページ下部の戻るリンクは**廃止**し、左上の戻るボタンのみとする

#### タイトル

- ページ上部（戻るボタンの下）に大きく表示（`font-size: 2rem` 以上）
- **中央揃え**
- タイトルの直下に区切り線（`<hr>` または同等のボーダーライン）を配置する
  - スタイル例: `border: none; border-top: 1px solid rgba(0,0,0,0.15); margin: 16px auto; max-width: 800px;`

#### メディア表示（画像・動画）

- `Work.media[]` 配列の順に縦に並べて表示する
- 各メディアは**中央揃え**（`mx-auto` + `block`）
- 最大幅: `800px`（コンテナ幅に応じてレスポンシブ縮小）
- `type: 'image'` の場合: `<Image>` コンポーネント（`next/image`）を使用し、`alt` を必ず設定する。`src` はCloudinary URLのため、`next.config.js` の `images.remotePatterns` に `res.cloudinary.com` を許可する設定を追加すること
- `type: 'video'` の場合: `<video>` タグを使用し、`controls` 属性を付与する

#### 詳細テキスト

- `Work.body` を表示する（未定義の場合は `Work.description` を代替表示）
- **中央揃え**（`text-align: center`）
- 最大幅: `800px`、中央配置（`mx-auto`）のコンテナ内で中央揃えとする
- **改行対応**: テキスト内の改行文字（`\n`）は視覚的な改行として描画する（`whitespace-pre-wrap` またはセグメントごとに `<br>` を挿入）
- **インラインリンク対応**: `Work.body` が `WorkBodySegment[]` 配列の場合、各セグメントを順に描画する
  - `{ type: 'text', value: '...' }` → テキストとして描画（`\n` は改行）
  - `{ type: 'link', label: '...', href: '...' }` → `<a>` タグとして描画（アクセントカラーで下線付き、`target="_blank" rel="noopener noreferrer"`）
  - 文字列の場合は従来どおり `whitespace-pre-wrap` でそのまま描画する

#### タグ一覧

- `Work.tags` をバッジ形式で表示（Worksカードと共通スタイル）

### データ追加手順

新しい制作実績を追加する手順は以下のみ：

1. Cloudinaryに画像・動画をアップロードし、URLを取得する
2. `/data/works.ts` の `works` 配列に新しいオブジェクトを追記する（`media[].src` には取得したCloudinary URLを指定する）
3. ビルド（または `next dev` 再起動）する

ページファイルの新規作成・ルーティング設定等は一切不要。

---

## ポートフォリオページ（`/portfolio`）

**パス**: `/portfolio`

### 概要

- 旧`Profile`を廃止し、イラスト作品を公開する`Portfolio`へ変更する
- 共通サイトフレーム内に表示する
- 画像をデータ配列へ追加するだけで作品を公開できる構成とする
- 作品画像はローカルの`/public/portfolio/`またはCloudinary URLを使用できる

### レイアウト

- タイトルバー: `Portfolio`
- 作品をレスポンシブなギャラリー形式で表示する
- デスクトップ3列、タブレット2列、モバイル1列を基本とする
- 各作品は画像、タイトル、説明、制作年、タグを表示できる
- 画像クリックで拡大モーダルを表示する。モーダルはEscキーと閉じるボタンで閉じられる
- 作品が0件の場合は「作品はまだありません」と表示する

### データ構造（`/data/portfolio.ts`）

```ts
export type PortfolioItem = {
  id: string;
  title: string;
  image: string;
  alt: string;
  description?: string;
  year?: number;
  tags?: string[];
  featured?: boolean;
};

export const portfolioItems: PortfolioItem[] = [
  {
    id: 'sample-illustration-01',
    title: 'サンプルイラスト',
    image: '/portfolio/placeholder.svg',
    alt: 'サンプルイラスト',
    description: '後から実際の作品へ差し替えます。',
    tags: ['イラスト'],
  },
];
```

### 画像追加手順

1. `/public/portfolio/`へ画像を配置する、またはCloudinaryへアップロードする
2. `/data/portfolio.ts`へ作品オブジェクトを追記する
3. 必要に応じて`next.config.js`のリモート画像許可設定を確認する

---

## リンク一覧ページ（`/links`）

**パス**: `/links`

### 概要

- YukimiWorksに関係する全リンクをまとめて表示する
- トップページと独立したリンクデータを作らず、`/data/links.ts`を共用する
- `showOnHome`フラグが`true`の項目だけトップページへ表示する

### データ構造（`/data/links.ts`）

```ts
export type SiteLink = {
  id: string;
  label: string;
  url: string;
  description?: string;
  icon?: string;
  showOnHome: boolean;
  order?: number;
};

export const siteLinks: SiteLink[] = [
  {
    id: 'x',
    label: 'X',
    url: 'https://x.com/yukimiworks',
    description: '最新情報やお知らせを投稿しています。',
    icon: '/icons/default/x.png',
    showOnHome: true,
    order: 10,
  },
];
```

- `/links`では全件を表示する
- トップページでは`showOnHome: true`のみ表示する
- 表示順は`order`昇順、同値または未指定の場合は配列順とする
- 外部リンクには`target="_blank" rel="noopener noreferrer"`を設定する
- 公開前にダミーURLを正式URLへ差し替える

---

## お知らせ一覧ページ（`/news`）

**パス**: `/news`

### 概要

- 全お知らせ記事を網羅したページ
- 共通サイトフレーム内に表示する
- 制作実績一覧ページ（`/works`）と同一のデザインシステムを使用する

### レイアウト

- ページタイトルはレトロパネルのタイトルバー内に「お知らせ」、補助ラベルとして「News」を主アクセント色で表示する
- カードグリッド: 3列（広いデスクトップ） / 2列（標準デスクトップ・タブレット） / 1列（モバイル）
- **カードグリッド全体を中央揃えで配置する**（`mx-auto` + `justify-items-center` 等を使用）
- データが空の場合は「Coming Soon」表示
- **各カードクリックで `/news/[id]` のお知らせ個別ページへ遷移する**
- カテゴリーフィルタータブ: `news` 配列に実際に存在するカテゴリーのみタブとして表示する

### カテゴリー一覧

| カテゴリー値 | 表示ラベル |
|---|---|
| `'event'` | イベント |
| `'announcement'` | お知らせ |
| `'release'` | リリース情報 |
| `'other'` | その他 |

- 「すべて」タブを先頭に加え、全件表示を可能にする
- `news` 配列内に1件以上存在するカテゴリーのみフィルタータブとして表示する
- **カードの表示順は `news` 配列のインデックス順（格納順）に従う。ソートは行わない。**

### データ構造（`/data/news.ts`）

`works.ts` と同様に **エンジニアが直接編集し git で管理する**。CMSは使用しない。

```ts
export type NewsMedia = {
  type: 'image' | 'video';
  src: string;   // Cloudinary URL（例: https://res.cloudinary.com/<cloud>/image/upload/<id>.jpg）
  alt?: string;  // 画像の場合は必須
};

/**
 * body フィールドで使用するセグメント型。
 * プレーンテキスト（改行文字 \n を含めることで段落・改行を表現）と
 * インラインリンク・インラインメディアを混在させることができる。
 */
export type NewsBodySegment =
  | { type: 'text'; value: string }                    // \n で改行される。テキストは左揃え
  | { type: 'link'; label: string; href: string }      // インラインリンク
  | { type: 'media'; src: string; mediaType: 'image' | 'video'; alt?: string }; // 中央揃えで表示

export type NewsCategory =
  | 'event'           // イベント
  | 'announcement'    // お知らせ
  | 'release'         // リリース情報
  | 'other';          // その他

export type News = {
  id: string;
  title: string;
  date: string;                           // 表示用日付（例: '2026-04-01'）
  category: NewsCategory;
  thumbnail: string;                      // /public/news/xxx.png（一覧カード・メインページプレビュー用サムネイル）
  summary: string;                        // 一覧カード用の短い概要（1〜2行）。meta description のフォールバックにも使用する
  body?: NewsBodySegment[] | string;      // 個別ページ用の本文
                                          // 文字列の場合は \n で改行として扱う
                                          // NewsBodySegment[] の場合はセグメントを順に描画する
  featured?: boolean;                     // true のものがルートページのプレビューに表示される

  // --- SEO 用オプションフィールド（省略時はタイトル・summary・thumbnail で自動生成） ---
  seoTitle?: string;                      // <title> タグ上書き用。省略時は `${title} | YukimiWorks`
  seoDescription?: string;               // meta description 上書き用。省略時は summary（最大160文字）
  ogImage?: string;                       // OGP画像URL上書き用。省略時は thumbnail の絶対URL
                                          // Cloudinary URL 推奨（例: https://res.cloudinary.com/...）
  noIndex?: boolean;                      // true にすると <meta name="robots" content="noindex"> を付与
};

export const news: News[] = [
  // ── サンプル1: リリース情報 ─────────────────────────────────────────
  {
    id: 'release-sample-app-v1',
    title: '新作アプリ「〇〇」をリリースしました',
    date: '2026-04-01',
    category: 'release',
    thumbnail: '/news/placeholder.svg',
    summary: 'YukimiWorksの新作アプリ「〇〇」がApp Store・Google Playにて本日より配信開始しました。',
    body: [
      {
        type: 'text',
        value: 'YukimiWorksの新作アプリ「〇〇」が、本日よりApp Store・Google Playにて配信を開始しました。\n\n「〇〇」は〇〇をコンセプトに開発した〇〇向けアプリです。\nユーザーの皆さまにとって「あると嬉しい」体験を届けるため、デザインと使いやすさにこだわりました。',
      },
      {
        type: 'media',
        src: 'https://res.cloudinary.com/<your-cloud>/image/upload/news-sample-app.jpg',
        mediaType: 'image',
        alt: '新作アプリ スクリーンショット',
      },
      {
        type: 'text',
        value: '主な機能:\n・機能A\n・機能B\n・機能C\n\nぜひダウンロードしてお試しください。フィードバックもお待ちしています！',
      },
      {
        type: 'link',
        label: 'App Store でダウンロード',
        href: 'https://apps.apple.com/',
      },
    ],
    seoTitle: '新作アプリ「〇〇」リリース | YukimiWorks',
    seoDescription: 'YukimiWorksの新作アプリ「〇〇」がApp Store・Google Playにて配信開始。〇〇向けのアプリです。',
    featured: true,
  },

  // ── サンプル2: イベント告知 ─────────────────────────────────────────
  {
    id: 'event-sample-2026-spring',
    title: '2026年春イベント「〇〇」に出展します',
    date: '2026-03-20',
    category: 'event',
    thumbnail: '/news/placeholder.svg',
    summary: '2026年春に開催されるイベント「〇〇」にYukimiWorksが出展します。新作グッズ・デジタルコンテンツの先行販売も予定しています。',
    body: [
      {
        type: 'text',
        value: '2026年〇月〇日（〇）〜〇月〇日（〇）に開催される「〇〇」にYukimiWorksが出展します。\n\n【ブース情報】\n会場: 〇〇\nブース番号: 〇〇\n\n当日は新作グッズの販売や、開発中タイトルのデモプレイを予定しています。\nぜひお気軽にお立ち寄りください！',
      },
    ],
    seoTitle: '2026年春イベント「〇〇」出展のお知らせ | YukimiWorks',
    seoDescription: 'YukimiWorksが2026年春イベント「〇〇」に出展します。新作グッズ先行販売・デモプレイも予定。',
    featured: true,
  },

  // ── サンプル3: お知らせ ─────────────────────────────────────────────
  {
    id: 'announcement-sample-site-launch',
    title: 'YukimiWorks コーポレートサイトを公開しました',
    date: '2026-03-04',
    category: 'announcement',
    thumbnail: '/news/placeholder.svg',
    summary: 'YukimiWorksの公式コーポレートサイトを本日公開しました。制作実績や会社情報をご覧いただけます。',
    body: 'YukimiWorksのコーポレートサイトを本日公開しました。\n\n制作実績・会社概要・お問い合わせフォームなどをご用意しています。\nご不明な点やご依頼はお問い合わせフォームよりお気軽にご連絡ください。',
    seoTitle: 'コーポレートサイト公開のお知らせ | YukimiWorks',
    seoDescription: 'YukimiWorksの公式コーポレートサイトを公開しました。制作実績・会社情報・お問い合わせはこちらから。',
    featured: true,
  },
];
```

> **NOTE**: 初期状態では上記の3件のサンプルエントリーを登録する。いずれも `thumbnail` は `/public/news/placeholder.svg` のダミー画像を使用しており、後から実際のファイルに差し替える。`body` 内 `media` セグメントの `src` は **Cloudinary URL** を指定する。新しい記事を追加する際は `news` 配列にオブジェクトを追記するだけでよく、大規模な変更は不要。データ追加・変更は **エンジニアのみが行い、git でバージョン管理する**（`works.ts` と同じ運用）。`seoTitle`・`seoDescription`・`ogImage` は省略可能で、省略時は `title`・`summary`・`thumbnail` から自動生成される。

### データ追加手順

新しいお知らせを追加する手順は以下のみ：

1. 必要に応じてCloudinaryに画像・動画をアップロードし、URLを取得する
2. サムネイル画像を `/public/news/` に配置する
3. `/data/news.ts` の `news` 配列に新しいオブジェクトを追記する
4. ビルド（または `next dev` 再起動）する

ページファイルの新規作成・ルーティング設定等は一切不要。

---

## お知らせ個別ページ（`/news/[id]`）

**パス**: `/news/[id]`

### 概要

- お知らせ一覧の各カードをクリックすると遷移する詳細ページ
- 共通サイトフレーム内に表示する
- `/data/news.ts` の `news` 配列から `id` に一致するデータを取得して表示する
- Next.js の `generateStaticParams` を使用して静的生成（SSG）する

### レイアウト・コンテンツ

```
[共通ヘッダー]

[← お知らせ一覧へ戻る]  ← ページ左上に配置

        タイトル（中央揃え）
        日付・カテゴリー（中央揃え）

────────────────────────────────  ← タイトル直下に区切り線

  [サムネイル画像（中央揃え）]

        本文テキスト（左揃え）
        ※ body 内の media セグメントは中央揃えで表示

[共通フッター]
```

### 表示仕様

#### 左上の戻るボタン

- ページ左上（ヘッダー直下コンテンツ領域の左端）に「← お知らせ一覧へ戻る」ボタンを配置する
- `next/link` を使用し、`/news` へ遷移する

#### タイトル・日付

- ページ上部（戻るボタンの下）にタイトルを大きく表示（`font-size: 2rem` 以上）・**中央揃え**
- タイトル直下に日付（`YYYY年MM月DD日` 形式）とカテゴリーラベルを中央揃えで表示
- 日付・カテゴリーの直下に区切り線（`<hr>` または同等）を配置する

#### サムネイル

- `News.thumbnail` を中央揃えで表示する（`mx-auto` + `block`）
- 最大幅: `800px`（コンテナ幅に応じてレスポンシブ縮小）
- `<Image>` コンポーネント（`next/image`）を使用し、`alt` を必ず設定する

#### 本文テキスト

- `News.body` を表示する（未定義の場合は `News.summary` を代替表示）
- **テキストは左揃え**（`text-align: left`）
- 最大幅: `800px`、中央配置（`mx-auto`）のコンテナ内で左揃えとする
- **改行対応**: テキスト内の改行文字（`\n`）は視覚的な改行として描画する（`whitespace-pre-wrap` またはセグメントごとに `<br>` を挿入）
- **セグメント描画**:
  - `{ type: 'text', value: '...' }` → テキストとして描画（`\n` は改行）。**左揃え**
  - `{ type: 'link', label: '...', href: '...' }` → `<a>` タグとして描画（アクセントカラーで下線付き、`target="_blank" rel="noopener noreferrer"`）
  - `{ type: 'media', src: '...', mediaType: 'image' | 'video', alt?: '...' }` → **中央揃え**で表示。`mediaType: 'image'` の場合は `<Image>`（`next/image`）、`'video'` の場合は `<video controls>` を使用する。最大幅 `800px`

### SEO・メタデータ仕様

Next.js App Router の `generateMetadata` 関数を使用し、記事ごとに個別の `<title>`・`<meta>` タグ・OGP タグを動的に生成する。**`news.ts` のデータを変更するだけで SEO 設定も自動反映される。**

#### generateMetadata の実装方針

```ts
// app/news/[id]/page.tsx
import type { Metadata } from 'next';
import { news } from '@/data/news';

export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const article = news.find((n) => n.id === params.id);
  if (!article) return {};

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://yukimiworks.com';
  const title       = article.seoTitle       ?? `${article.title} | YukimiWorks`;
  const description = article.seoDescription ?? article.summary.slice(0, 160);
  // thumbnail が相対パス（/news/...）の場合は絶対 URL に変換
  const ogImage = article.ogImage
    ?? (article.thumbnail.startsWith('http')
        ? article.thumbnail
        : `${siteUrl}${article.thumbnail}`);

  return {
    title,
    description,
    ...(article.noIndex && { robots: { index: false, follow: false } }),
    openGraph: {
      title,
      description,
      url: `${siteUrl}/news/${article.id}`,
      type: 'article',
      publishedTime: article.date,
      images: [{ url: ogImage }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}
```

#### 環境変数

| 変数名 | 説明 |
|--------|------|
| `NEXT_PUBLIC_SITE_URL` | サイトの公開 URL（例: `https://yukimiworks.com`）。OGP の絶対 URL 生成に使用する |

- `.env.local` に追加し、Vercel の Environment Variables にも登録すること
- 未設定時は `https://yukimiworks.com` にフォールバックする

#### 生成されるタグ一覧

| タグ | 生成ルール |
|------|-----------|
| `<title>` | `seoTitle` → 省略時 `{title} \| YukimiWorks` |
| `<meta name="description">` | `seoDescription` → 省略時 `summary`（最大160文字） |
| `<meta name="robots">` | `noIndex: true` のときのみ `noindex,nofollow` を付与 |
| `og:title` | `<title>` と同値 |
| `og:description` | `<meta description>` と同値 |
| `og:url` | `{NEXT_PUBLIC_SITE_URL}/news/{id}` |
| `og:type` | `article` 固定 |
| `og:image` | `ogImage` → 省略時 `thumbnail` を絶対 URL に変換 |
| `article:published_time` | `date` フィールドの値 |
| `twitter:card` | `summary_large_image` 固定 |
| `twitter:title` / `twitter:description` / `twitter:image` | OGP と同値 |

#### JSON-LD 構造化データ（`Article` スキーマ）

個別ページの `<head>` に `Article` 型の JSON-LD を埋め込み、Google 検索でのリッチリザルト表示を狙う。

```tsx
// app/news/[id]/page.tsx — Page コンポーネント内の return 冒頭に追加
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: article.title,
  description: article.seoDescription ?? article.summary,
  datePublished: article.date,
  image: ogImage,  // generateMetadata と同じロジックで生成した絶対 URL
  publisher: {
    '@type': 'Organization',
    name: 'YukimiWorks',
    url: siteUrl,
  },
};

return (
  <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
    {/* ...ページ本体 */}
  </>
);
```

#### canonical URL

`<link rel="canonical">` は Next.js の `generateMetadata` の `alternates.canonical` で設定する。

```ts
return {
  // ...既存の設定
  alternates: {
    canonical: `${siteUrl}/news/${article.id}`,
  },
};
```



## 会社案内ページ（`/about`）

**パス**: `/about`

### 概要

- 共通サイトフレーム内に表示する
- 上部バナー、左側のMenu、What's New、Counter、フッターはトップページと同じデザインを維持する
- 右メインカラムのWelcome、Works、Link部分をAboutコンテンツへ置き換える
- 現時点では1つのレトロパネルにまとめて表示する

### Aboutパネル

- タイトルバー: `About`
- 本文は中央揃え
- 指定された改行を保持する
- 番号付き部分をブラウザ標準の`ol`へ変換し、本文全体は中央揃えを維持しつつ、番号の左端が揃うように`ol`自体は中央配置・中身は左揃えで表示する
- `white-space: pre-line`または同等の実装を使用できる
- パネル、タイトルバー、本文余白はHTMLサンプルの右カラム用パネルと同じデザインシステムを使用する

```text
合同会社YukimiWorksは
クリエイターゆきみによって
立ち上げられた会社です。

YukimiWorks以下の目的で運営されています。
1.小さなアイデアを一つ一つ形にすること。
2.ユーザーに楽しんでもらえるコンテンツを作ること。
3.斬新な発想を実現させること。
4.サービスを便利なインフラとして提供すること。

楽しく便利な社会を実現するため
時に収益性を度外視し社会課題に臨みます。

皆様の暖かいご支援お待ちしております。

神奈川県横浜市西区浅間町1丁目4番3号ウィザードビル402
代表者 ゆきみ
```

- 以前の会社概要、会社情報表、組織形態、4カード形式の経営理念は現段階では表示しない
- 代表者名は`ゆきみ`とし、旧記載の氏名を表示しない

## お問い合わせページ（`/contact`）— ハブページ

**パス**: `/contact`

### 概要

- 共通サイトフレーム内に表示する
- フォーム本体は置かず、2種類の問い合わせ先への導線を表示する
- クリエイター募集は廃止し、導線・フォーム・APIを設けない

### 構成

```text
┌─────────────────────────────────────────┐
│ 仕事のご依頼                             │
│ アプリ・サービス開発・デザインなど       │
│                                      →  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ アプリ・サービスに関するお問い合わせ     │
│ ご質問・ご要望・不具合報告               │
│                                      →  │
└─────────────────────────────────────────┘

その他連絡先
X / Discord
```

### ページタイトル

- タイトルバー: `お問い合わせ / Contact`

### ハブリンク仕様

- 2つを縦に並べる
- 最大幅`640px`、中央配置
- 各リンク全体を`next/link`でラップする
- 白背景、青系1pxボーダー、内側線、点線区切りを使用する
- ホバー時は2px上昇し、短いピクセル影を表示する
- フォーカス時は2pxの明確なアウトラインを表示する

| タイトル | サブテキスト | 遷移先 |
|---|---|---|
| 仕事のご依頼 | アプリ・サービス開発・デザインなどのご依頼はこちら | `/contact/inquiry` |
| アプリ・サービスに関するお問い合わせ | YukimiWorksのアプリ・サービスへのご質問・ご要望はこちら | `/contact/app` |

### その他連絡先

- `/data/links.ts`を参照し、問い合わせ補助として指定したリンクを表示できる
- URLは外部リンクとして開く
- リンク色は`var(--site-text)`、ホバー時は`var(--site-accent)`

---

## 仕事のご依頼フォームページ（`/contact/inquiry`）

**パス**: `/contact/inquiry`

### 概要

- 共通サイトフレーム内に表示する
- `/contact` ハブページから遷移する仕事のご依頼専用フォームページ

### 構成

```
[← お問い合わせトップへ戻る]  ← ページ左上に配置

        仕事のご依頼          ← 中央揃えタイトル

[お問い合わせフォーム（Block A）]
```

- ページ左上（ヘッダー直下コンテンツ領域の左端）に「← お問い合わせトップへ戻る」ボタンを配置する（`next/link` で `/contact` へ遷移）

### フォームデザイン共通仕様

- フォーム全体をレトロウィンドウ風パネル内に配置する
- ラベルは`DotGothic16`または本文フォントの太字を使用する
- 入力欄は白背景、青系1pxボーダー、角丸0〜3px
- フォーカス時は`outline: 2px solid var(--site-focus)`を表示する
- 送信ボタンは立体的なピクセルボタン風とし、押下時に1px下へ移動する
- 時間帯テーマで色は変化するが、入力欄とエラーメッセージのコントラストは維持する

### フォーム仕様（Block A: 仕事のご依頼）

- フォームの最大幅は **`560px`**、中央配置（`mx-auto`）
- フォームは**左揃え**で配置する（ラベル・入力欄ともに左揃えを維持）
- フォーム項目:

| フィールド名 | 種別 | バリデーション |
|---|---|---|
| メールアドレス | メール入力欄（`inputMode="email"`、アプリ側バリデーション） | 必須・メール形式 |
| お名前・会社名 | `<input type="text">` | 任意 |
| お名前・会社名（ふりがな） | `<input type="text">` | 任意 |
| ご依頼内容 | `<textarea>` | 必須 |
| 送信ボタン | `<button type="submit">` | ― |

#### 送信ボタン仕様

- サイズ: `padding: 16px 48px` 以上
- **中央揃えで配置する**（フォーム左揃えの例外として、送信ボタンのみ中央揃え）

#### バリデーション

- `react-hook-form` + `zod` を使用
- エラーメッセージは各フィールド直下にインライン表示

#### フォーム送信先

- Resendによるメール送信を実装する（詳細は「メール送信」セクション参照）
- APIルート: `POST /api/contact/inquiry`

#### フォーム送信時の挙動

- **送信中**: カーソルを `cursor: wait` に変更し、送信ボタンを `disabled` にする
- **送信成功**: 完了モーダルを表示する（「メール送信が完了しました。返信をお待ちください。」）。モーダルを閉じたらフォームをリセットする
- **送信失敗**: エラーモーダルまたはフォーム上部にインラインエラーを表示する（「送信に失敗しました。再送信しても改善しない場合はお問い合わせトップのその他連絡先からご連絡ください。」）
- メール形式エラーはブラウザ標準UIを使わず、フォーム内の赤文字エラー表示に統一する

---

## アプリ・サービスに関するお問い合わせフォームページ（`/contact/app`）

**パス**: `/contact/app`

### 概要

- 共通サイトフレーム内に表示する
- `/contact` ハブページから遷移するアプリ・サービスへのお問い合わせ専用フォームページ
- 対象サービスをコンボボックスで選択できる形式とし、サービス一覧は `/data/appServices.ts` で管理する

### 構成

```
[← お問い合わせトップへ戻る]  ← ページ左上に配置

        アプリ・サービスに関するお問い合わせ    ← 中央揃えタイトル

[お問い合わせフォーム（Block C）]
```

- ページ左上（ヘッダー直下コンテンツ領域の左端）に「← お問い合わせトップへ戻る」ボタンを配置する（`next/link` で `/contact` へ遷移）

### フォーム仕様（Block C: アプリ・サービスに関するお問い合わせ）

- フォームの最大幅は **`560px`**、中央配置（`mx-auto`）
- フォームは**左揃え**で配置する（ラベル・入力欄ともに左揃えを維持）
- フォーム項目:

| フィールド名 | 種別 | バリデーション |
|---|---|---|
| 対象サービス | `<select>`（コンボボックス） | 必須 |
| メールアドレス | メール入力欄（`inputMode="email"`、アプリ側バリデーション） | 必須・メール形式 |
| お問い合わせ内容 | `<textarea>` | 必須 |
| 送信ボタン | `<button type="submit">` | ― |

#### 対象サービス コンボボックス仕様

- `/data/appServices.ts` の `appServices` 配列から選択肢を動的に生成する
- 先頭に「選択してください」等のプレースホルダー選択肢（`value: ''`）を置き、選択必須とする
- データ構造（`/data/appServices.ts`）:

```ts
export type AppService = {
  value: string;  // フォーム送信値（例: 'cocoa'）
  label: string;  // 表示名（例: 'Cocoa'）
};

export const appServices: AppService[] = [
  { value: 'cocoa', label: 'Cocoa' },
  // 新しいサービスを追加する際はここにオブジェクトを追記するだけでよい
];
```

#### 送信ボタン仕様

- サイズ: `padding: 16px 48px` 以上
- **中央揃えで配置する**（フォーム左揃えの例外として、送信ボタンのみ中央揃え）

#### バリデーション

- `react-hook-form` + `zod` を使用
- エラーメッセージは各フィールド直下にインライン表示

#### フォーム送信先

- Resendによるメール送信を実装する（詳細は「メール送信」セクション参照）
- APIルート: `POST /api/contact/app`

#### フォーム送信時の挙動

- **送信中**: カーソルを `cursor: wait` に変更し、送信ボタンを `disabled` にする
- **送信成功**: 完了モーダルを表示する（「メール送信が完了しました。返信をお待ちください。」）。モーダルを閉じたらフォームをリセットする
- **送信失敗**: エラーモーダルまたはフォーム上部にインラインエラーを表示する（「送信に失敗しました。再送信しても改善しない場合はお問い合わせトップのその他連絡先からご連絡ください。」）
- メール形式エラーはブラウザ標準UIを使わず、フォーム内の赤文字エラー表示に統一する

### APIルート（`/app/api/contact/app/route.ts`）

```ts
// app/api/contact/app/route.ts
import { NextResponse } from 'next/server';
import { sendMail } from '@/lib/mailer';

export async function POST(req: Request) {
  const to = process.env.CONTACT_TO_APP;
  if (!to) {
    console.error('[contact/app] CONTACT_TO_APP が設定されていません。');
    return NextResponse.json({ message: '送信に失敗しました。' }, { status: 500 });
  }

  const body = await req.json();
  const { service, email, message } = body;

  const result = await sendMail({
    to,
    subject: `【アプリお問い合わせ】${service} へのお問い合わせ`,
    html: `
      <p><strong>対象サービス:</strong> ${service}</p>
      <p><strong>メール:</strong> ${email}</p>
      <p><strong>お問い合わせ内容:</strong><br>${message}</p>
    `,
  });

  if (!result.success) {
    return NextResponse.json({ message: '送信に失敗しました。' }, { status: 500 });
  }

  return NextResponse.json({
    message: result.dummy
      ? '[DUMMY] メール送信はスキップされました（RESEND_API_KEY 未設定）。フォームデータはコンソールを確認してください。'
      : '送信を受け付けました。ありがとうございます。',
    dummy: result.dummy ?? false,
  });
}
```

---

## Cocoaアプリ プライバシーポリシーページ（`/cocoa/privacy-policy`）

**パス**: `/cocoa/privacy-policy`

### 概要

- 共通サイトフレーム内に表示する
- Cocoaアプリ向けのプライバシーポリシー専用ページ
- アプリストアのプライバシーポリシーURLとして登録するための静的ページ

### レイアウト・コンテンツ

```
[共通ヘッダー]

        プライバシーポリシー       ← 中央揃えタイトル

  ────────────────────────────── ← 区切り線

  本アプリは、ユーザーの個人情報を収集しません。

  本アプリは完全オフラインで動作し、入力されたデータは端末内にのみ保存されます。

  開発者は、ユーザーが入力した情報、画像、ファイル、利用履歴等を
  取得・送信・共有しません。

  本アプリでは、広告、アクセス解析、外部SDK、第三者へのデータ提供は行いません。

  ただし、アプリストア、OS、端末メーカー等が独自に取得する情報については、
  本アプリの管理対象外です。

  お問い合わせ：
  [アプリ・サービスに関するお問い合わせ → /contact/app へのリンク]

  制定日：2026年5月18日

[共通フッター]
```

### レイアウト仕様

- タイトルバーに「プライバシーポリシー / Privacy Policy」を表示する
- タイトルバー直下を点線で区切る
- 本文ブロックは最大幅 `800px`・中央配置（`mx-auto`）・左揃えテキスト
- 各ポリシー項目は段落（`<p>`）ごとに適切な余白（`margin-bottom: 1.2em` 程度）を設ける
- 本文フォント: `var(--font-body)`・主テキスト色（`var(--site-text)`）

### お問い合わせリンク

- 「アプリ・サービスに関するお問い合わせ」と表示し、`/contact/app` へ遷移する `next/link` リンクを配置する
- スタイル: 主アクセント色（`var(--site-accent)`）・下線付き

### 制定日

- 「制定日：2026年5月18日」をページ末尾に表示する
- スタイル: 副テキスト色（`var(--site-text-muted)`）・小さめフォントサイズ（`font-size: 0.875rem` 程度）

### アニメーション

- スクロールインでコンテンツを下から上にフェードイン（Framer Motion `whileInView`、他ページと共通）

---

## メール送信

### 概要

フォーム送信時のメール通知にResendを使用する。APIキーの管理・フォールバック処理を共通化する。

### 環境変数

| 変数名 | 説明 |
|--------|------|
| `RESEND_API_KEY` | Resendのシークレットキー |
| `CONTACT_TO_INQUIRY` | 仕事のご依頼フォームの転送先メールアドレス |
| `CONTACT_TO_APP` | アプリ・サービスお問い合わせフォームの転送先メールアドレス |
| `MAIL_FROM_NAME` | 送信元の表示名（例: `YukimiWorks`） |
| `MAIL_FROM_DOMAIN` | 送信元ドメイン（例: `yukimiworks.com`）。送信元アドレスは `（MAIL_FROM_NAME） <noreply@（MAIL_FROM_DOMAIN）>` の形式で組み立てる |
| `NEXT_PUBLIC_SITE_URL` | サイトの公開 URL（例: `https://yukimiworks.com`）。お知らせ個別ページの OGP・canonical URL 生成に使用する |

- **ローカル開発**: プロジェクトルートに `.env.local` を作成し、以下のように記載して読み込む（`.env.local` は `.gitignore` に含める）

```
RESEND_API_KEY=re_xxxxxxxxxxxx
CONTACT_TO_INQUIRY=info@yukimiworks.com
CONTACT_TO_APP=app-support@yukimiworks.com
MAIL_FROM_NAME=YukimiWorks
MAIL_FROM_DOMAIN=yukimiworks.com
NEXT_PUBLIC_SITE_URL=https://yukimiworks.com
```

- **本番環境**: Vercelのプロジェクト設定 → Environment Variables に上記6変数をすべて登録する
- `CONTACT_TO_INQUIRY` または `CONTACT_TO_APP` が未設定の場合、該当APIルートは HTTP 500 を返し、サーバーログにエラーを出力する

### 共通ユーティリティ（`/lib/mailer.ts`）

Resendクライアントの初期化・メール送信処理を `lib/mailer.ts` に集約し、全APIルートから使い回す。

```ts
// lib/mailer.ts
import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;

/**
 * メールを送信する。
 * RESEND_API_KEY が未設定の場合はダミー処理を行い、
 * 送信内容をコンソールに出力して処理済みとして返す。
 */
export async function sendMail(options: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<{ success: boolean; dummy?: boolean }> {
  if (!apiKey) {
    // キー未設定時のダミー処理
    console.warn('[mailer] RESEND_API_KEY が設定されていません。ダミー送信を実行します。');
    console.info('[mailer] ダミー送信内容:', options);
    return { success: true, dummy: true };
  }

  const fromName   = process.env.MAIL_FROM_NAME   ?? 'YukimiWorks';
  const fromDomain = process.env.MAIL_FROM_DOMAIN ?? 'yukimiworks.com';
  const from = `${fromName} <noreply@${fromDomain}>`;

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from, // 送信元アドレス（Resendで検証済みドメインを使用）
    ...options,
  });

  if (error) {
    console.error('[mailer] 送信エラー:', error);
    return { success: false };
  }
  return { success: true };
}
```

### APIルート（`/app/api/contact/inquiry/route.ts`）

```ts
// app/api/contact/inquiry/route.ts
import { NextResponse } from 'next/server';
import { sendMail } from '@/lib/mailer';

export async function POST(req: Request) {
  const to = process.env.CONTACT_TO_INQUIRY;
  if (!to) {
    console.error('[contact/inquiry] CONTACT_TO_INQUIRY が設定されていません。');
    return NextResponse.json({ message: '送信に失敗しました。' }, { status: 500 });
  }

  const body = await req.json();
  const { email, name, nameKana, message } = body;

  const result = await sendMail({
    to,
    subject: `【仕事のご依頼】${name ?? email} 様よりお問い合わせ`,
    html: `
      <p><strong>メール:</strong> ${email}</p>
      <p><strong>お名前・会社名:</strong> ${name ?? '（未入力）'}</p>
      <p><strong>ふりがな:</strong> ${nameKana ?? '（未入力）'}</p>
      <p><strong>ご依頼内容:</strong><br>${message}</p>
    `,
  });

  if (!result.success) {
    return NextResponse.json({ message: '送信に失敗しました。' }, { status: 500 });
  }

  return NextResponse.json({
    message: result.dummy
      ? '[DUMMY] メール送信はスキップされました（RESEND_API_KEY 未設定）。フォームデータはコンソールを確認してください。'
      : '送信を受け付けました。ありがとうございます。',
    dummy: result.dummy ?? false,
  });
}
```

### フロントエンド側の送信フィードバック

各問い合わせフォームでは、APIレスポンスに応じて以下のとおり表示を切り替える。

#### 送信成功（`dummy: false`）

完了モーダルを表示する。

```
メール送信が完了しました。返信をお待ちください。
```

- モーダルを閉じたらフォームをリセットする

#### 送信成功（`dummy: true`、開発用ダミーモード）

モーダルを表示し、通常の成功と視覚的に区別できるよう以下のメッセージを表示する。

```
[開発用ダミーモード]
RESEND_API_KEY が設定されていないため、メールは送信されませんでした。
送信内容はブラウザのコンソールおよびサーバーログに出力されています。
```

#### 送信失敗

エラーメッセージをモーダルまたはフォーム上部のインラインエラーとして表示する。

```
送信に失敗しました。再送信しても改善しない場合は下記のその他連絡先からご連絡ください。
```

---

## フッター

```text
YukimiWorks
Copyright (C) 2026 YukimiWorks All Rights Reserved.
当サイト内の文章・画像の無断転載を禁じます。
```

- サイトフレーム最下部に配置する
- 中央揃え
- 背景は`var(--site-surface-soft)`、上部に青系1pxボーダー
- サイト名の左右に小さな雪または星を表示する
- 本文も小さめのドット系フォントを使用する
- 年は固定値ではなく現在年、または設立年から現在年の範囲を表示してもよい
- 深夜・夜テーマでは明るい文字色へ切り替える

## ファイル構成（推奨）

```text
yukimiworks-hp/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── works/
│   ├── portfolio/
│   ├── links/
│   ├── news/
│   ├── about/
│   ├── contact/
│   ├── cocoa/
│   ├── api/contact/
│   └── globals.css
├── components/
│   ├── layout/
│   │   ├── SiteFrame.tsx
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── MobileMenu.tsx
│   │   └── Footer.tsx
│   ├── panels/
│   ├── welcome/
│   ├── theme/
│   ├── sections/
│   │   ├── Welcome.tsx
│   │   ├── WorksCategoryLinks.tsx
│   │   ├── Philosophy.tsx
│   │   ├── PickupWorks.tsx
│   │   ├── NewsPreview.tsx
│   │   ├── LinkPanel.tsx
│   │   └── Contact.tsx
│   └── ui/
│       ├── WorkCard.tsx
│       ├── WorksFilter.tsx
│       ├── PortfolioCard.tsx
│       ├── PortfolioModal.tsx
│       ├── LinkCard.tsx
│       ├── NewsCard.tsx
│       ├── InquiryForm.tsx
│       └── AppServiceForm.tsx
├── data/
│   ├── works.ts
│   ├── portfolio.ts
│   ├── links.ts
│   ├── news.ts
│   ├── appServices.ts
│   ├── characterMessages.ts
│   ├── themeConfig.ts
│   ├── iconSets.ts
│   └── siteConfig.ts
├── lib/
│   ├── mailer.ts
│   ├── validations.ts
│   └── japanTime.ts
├── public/
│   ├── logo/
│   ├── character/
│   ├── icons/
│   ├── effects/
│   ├── works/
│   ├── portfolio/
│   └── news/
└── SPEC.md
```

- `app/career-program/`、`components/career-program/`、`data/careerProgram.ts`、`CareerApplyForm.tsx`は削除対象とする
- `components/sections/Service.tsx`は`WorksCategoryLinks.tsx`へ置き換える
- `app/contact/creator/`と`app/api/contact/creator/`は削除対象とする

### 画像ファイル要件

- キャラクター画像は同一キャンバスサイズ・同一基準位置で作成し、差し替え時のレイアウト移動を防ぐ
- 通常、食べ物、お菓子の各アイコンセットは同じキー名と同等サイズで揃える
- ピクセルアートは可能な限り整数倍で表示する
- 小サイズ画像には`image-rendering: pixelated`を適用してよいが、ロゴや文字画像が読みにくくなる場合は適用しない
- `eyes.png`はタイル表示を前提とした継ぎ目の目立たない画像にする

> `.env.local`は既存仕様どおりプロジェクトルートに作成し、Git管理対象外とする。メール送信・OGP用環境変数は変更しない。

## CSS変数（globals.css）

```css
:root {
  --site-outer-bg: #eaf4ff;
  --site-bg: #fbfdff;
  --site-surface: #ffffff;
  --site-surface-soft: #f3f8ff;
  --site-accent: #315acb;
  --site-accent-soft: #8fb6ff;
  --site-text: #172554;
  --site-text-muted: #566783;
  --site-border: #7ca2e8;
  --site-dotted: #a9c5f6;
  --site-focus: #174fd6;
  --site-shadow: rgba(49, 90, 203, 0.18);

  --font-pixel: 'DotGothic16', 'MS Gothic', 'Osaka-Mono', monospace;
  --font-jp-pixel: 'DotGothic16', 'MS Gothic', 'Osaka-Mono', monospace;
  --font-body: 'DotGothic16', 'MS Gothic', 'Osaka-Mono', monospace;
  --font-mono: 'DotGothic16', 'MS Gothic', 'Osaka-Mono', monospace;

  --radius-panel: 2px;
  --radius-control: 2px;
  --transition-base: 160ms ease;
}

[data-theme='early-morning'] {
  --site-outer-bg: #ffe9f0;
  --site-bg: #fff8fa;
  --site-surface-soft: #fff0f5;
  --site-accent: #b85f86;
  --site-accent-soft: #edabc2;
  --site-text: #563247;
  --site-border: #d98eaa;
  --site-dotted: #efb7ca;
}

[data-theme='day'] {
  --site-outer-bg: #eaf4ff;
  --site-bg: #fbfdff;
  --site-surface-soft: #f3f8ff;
  --site-accent: #315acb;
  --site-accent-soft: #8fb6ff;
  --site-text: #172554;
  --site-border: #7ca2e8;
  --site-dotted: #a9c5f6;
}

[data-theme='evening'] {
  --site-outer-bg: #f5a45f;
  --site-bg: #fff4e7;
  --site-surface-soft: #ffe2c1;
  --site-accent: #b94718;
  --site-accent-soft: #f08a45;
  --site-text: #4b2111;
  --site-border: #d9662a;
  --site-dotted: #ef9a64;
}

[data-theme='night'],
[data-theme='late-night'] {
  --site-outer-bg: #07142f;
  --site-bg: #0d1e43;
  --site-surface: #122854;
  --site-surface-soft: #172f5f;
  --site-accent: #9bbcff;
  --site-accent-soft: #5f8fe9;
  --site-text: #f1f6ff;
  --site-text-muted: #c0cee8;
  --site-border: #7096dc;
  --site-dotted: #4f72b4;
  --site-focus: #ffffff;
}

[data-event='snack'] {
  --site-outer-bg: #f23886;
  --site-bg: #f95a9b;
  --site-surface: #ffffff;
  --site-surface-soft: #ffd7e8;
  --site-accent: #b8004f;
  --site-text: #4a0020;
  --site-border: #ffffff;
}

[data-event='sleep-warning'] {
  --site-outer-bg: #9e0000;
  --site-bg: #d00000;
  --site-surface: #e31a1a;
  --site-surface-soft: #ef3333;
  --site-accent: #000000;
  --site-accent-soft: #000000;
  --site-text: #000000;
  --site-text-muted: #140000;
  --site-border: #000000;
  --site-dotted: #000000;
  --site-focus: #ffffff;
}
```

### 背景パターン例

```css
[data-theme='late-night'] .siteOuter {
  background-image:
    radial-gradient(circle, rgba(255, 255, 255, 0.78) 1px, transparent 1.5px),
    radial-gradient(circle, rgba(146, 187, 255, 0.62) 1px, transparent 1.5px);
  background-position: 0 0, 17px 13px;
  background-size: 43px 43px, 59px 59px;
}

[data-event='snack'] .siteOuter {
  background-image: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.92) 3px,
    transparent 4px
  );
  background-size: 24px 24px;
}

[data-event='sleep-warning'] .siteOuter {
  background-image: url('/effects/eyes.png');
  background-repeat: repeat;
  background-size: 64px 64px;
}

[data-event='sleep-warning'] .pixelArtSilhouette {
  filter: brightness(0);
}
```

- 旧`--color-*`変数を使用している既存コンポーネントは、新しい`--site-*`変数へ段階的に置換する

## アクセシビリティ

- 全画像に適切な`alt`を設定する。純粋な装飾画像は`alt=""`とする
- キャラクターは`button`要素として実装し、Enter・Spaceでもクリック演出を発動できるようにする
- 吹き出しは通常メッセージでは`aria-live="off"`、クリックに対する特殊メッセージでは`aria-live="polite"`を使用する
- ランダムな通常吹き出しをスクリーンリーダーへ繰り返し読み上げさせない
- フォーカスリングは全テーマで視認できる色を使用する
- 本文コントラストは原則WCAG AAを満たす
- 深夜警告イベントの赤背景でも、リンク、フォーム、エラーメッセージの識別性を維持する
- メインサイトでは可読性が下がる箇所も含めてドット系フォントを維持し、`Noto Sans JP`へ自動的に切り替えない
- 色だけで状態を表現せず、現在ページ、エラー、選択状態には形状・ラベル・下線を併用する
- メニュー、フォーム、カード、モーダルはキーボード操作可能とする
- `prefers-reduced-motion: reduce`では吹き出しの移動、表情の揺れ、パネルスライドを停止する
- 特殊背景は`pointer-events: none`とし、クリックやスクロールを妨げない
- キャラクターのクリック領域は最低44px四方を確保する

### ランダム演出に関する配慮

- 特殊イベントによって本文内容やフォーム入力値を変更しない
- テーマ変更は視覚表現と指定されたキャッチコピー・アイコンの差し替えに限定する
- フォーム入力中に時間帯が変わっても入力値とフォーカスを維持する
- 背景色が急変する場合も点滅は行わない
- 開発用の強制イベント指定は本番で無効化する

## 実装優先順位

| 優先度 | 項目 |
|---|---|
| 高 | `SiteFrame`、上部バナー、サイドバー、`RetroPanel`、新CSS変数、レスポンシブ基盤 |
| 高 | Welcomeキャラクター、通常吹き出し、クリック表情、特殊メッセージ抽選 |
| 高 | `TimeThemeProvider`、日本時間判定、通常6テーマ、Hydration対策 |
| 中 | 昼食・お菓子・深夜警告イベント、アイコンセット切り替え、開発用テストUIと強制表示 |
| 中 | HTMLサンプル準拠のWorks分類導線とLinkパネル、サブページ右カラムのレトロパネル化 |
| 中 | `/works`、`/portfolio`、`/links`、`/news`、`/about`、`/contact`、各フォーム・詳細ページの共通デザイン移行 |
| 中 | OGP画像、キャラクター・アイコン・目玉背景などの画像素材作成 |
| 低 | 装飾カウンター、細かなホバー演出、追加イースターエッグ |

### 実装完了条件

- トップページが`yukimiworks-html-sample`の実表示と視覚的に一致する
- トップページの右カラムがWelcome、Portfolio、Works、Linkで構成される
- サンプル素材を`yukimiworks-html-sample`から直接参照せず、プロジェクト内へ配置している
- サブページで上部バナー、左サイドバー、フッターがトップページと同じ状態で維持される
- サブページでは右メインカラムのみがページ固有コンテンツへ置き換わる
- `/about`が指定文章、指定改行、中央揃え、代表者`ゆきみ`で表示される
- 開発環境の画面右下にレイアウトを崩さない時間帯・イベントテストUIが表示される
- 本番環境ではテストUIがDOMへ出力されない
- デスクトップ、タブレット、モバイルで横スクロールが発生しない
- 初回吹き出しがページ表示直後に表示され、約2.5秒で閉じる
- 通常吹き出しが一定時間で消え、数秒のランダム間隔後に再表示される
- キャラクタークリックで毎回画像が切り替わり、約140ms後に戻る
- 特殊メッセージの抽選範囲が排他的で、同時に複数表示されない
- 日本時間に基づいて6つの通常テーマが切り替わる
- 昼食・お菓子・不在イベントはページ読み込みごとに再抽選される
- 深夜警告イベントは発動後02:30まで全ページで維持される
- `sleep-warning > snack > lunch > away > normal`の優先順位が守られる
- テーマ変更後もフォーム入力、フォーカス、リンク操作が維持される
- `prefers-reduced-motion`で主要な移動アニメーションが停止する
- 全文がドット系フォントで表示される
- `Menu`や`Welcome`の雪装飾がタイトル文字より淡い色で表示される
- キャラクター付近に`CLICK`等の不要な文字が表示されない
- キャラクタークリック時に横移動・回転が発生しない
- 吹き出しの表示・非表示でキャラクター位置とWelcomeパネル高さが変化しない
- パネルタイトルと上部バナーにグラデーションが存在しない
- パネル間の隙間がページ背景と同色で表示される
- サイト全体を囲う追加の白い外側フレームが存在しない
- `Works / News`という結合見出しが表示されない
- `Service`メニュー・セクション・ルートが存在しない
- トップの3分類リンクから`/works`へ遷移し、対応フィルターが初期選択される
- `/works`内のフィルター操作とURLクエリが同期する
- `Profile`表記がなく、`Portfolio`でイラスト作品を追加・表示できる
- `/links`は全リンク、トップページは`showOnHome: true`のみを同一データから表示する
- 不在イベント時はWelcomeとCounterのキャラクターが消え、固定メッセージへ置き換わる
- Contactには「仕事のご依頼」「アプリ・サービスに関するお問い合わせ」の2種類だけが表示される
- キャリアプログラム関連ページ、フォーム、API、環境変数、データ、コンポーネントが存在しない

*最終更新: 2026年7月 改訂8（トップPortfolio追加・会話ロジック再設計・時間帯イベント再定義・不在イベント追加）*
