# YukimiWorks HTMLデザインサンプル

Codexへデザイン意図と動作仕様を渡すための、依存関係の少ない静的HTMLサンプルです。

## ファイル

- `index.html`: 参考画像準拠の構造
- `styles.css`: レイアウト、全ドット文字、時間帯テーマ、特殊イベント
- `app.js`: 吹き出し、キャラクタークリック、確率イベント、デバッグ
- `assets/character-default.png`: 指定されたメインキャラクター
- `assets/character-poked-placeholder.png`: クリック表情用の仮画像
- `assets/icons/`: 仮ドット絵
- `assets/effects/eyes.png`: 深夜警告用の仮背景

## 参考画像準拠の重要事項

- 全文を`DotGothic16`で表示します。可読性のため通常フォントへ切り替えません。
- `Menu`、`Welcome`などの見出し文字と、両側の雪マークは別色です。
- 見出し、パネル、ヘッダーにグラデーションを使用しません。
- 全体を囲む白いフレーム、外枠、影はありません。各パネル間の隙間にはページ背景が見えます。
- Welcomeキャラクターの表示位置は吹き出しの有無で変わりません。
- 吹き出しは絶対配置のオーバーレイで、他の要素を隠しても構いません。
- キャラクター付近に`CLICK`などの案内文字を表示しません。
- キャラクタークリック時は横移動させず、クリック直後の約120msだけ3px下へ沈み、すぐ元の位置へ戻ります。表情画像は約2.5秒維持します。
- トップサンプルに`Works / News`結合パネルは置きません。

## 確認方法

`index.html`をブラウザで開いてください。ローカルサーバーを使う場合は、このフォルダで次を実行できます。

```bash
python3 -m http.server 8000
```

デバッグパネルを表示する場合は次のように開きます。

```text
index.html?debug=1
index.html?debug=1&theme=night
index.html?debug=1&event=lunch
index.html?debug=1&event=snack
index.html?debug=1&event=sleep-warning
```

## Next.jsへ移植するときの分割例

- `SiteFrame.tsx`: 最大幅とページ背景のみを管理。外側の装飾フレームは作らない
- `Header.tsx`: 上部ロゴバナー
- `Sidebar.tsx`: Menu、What’s New、Counter
- `RetroPanel.tsx`: 単色タイトルバーと1px枠
- `WelcomeCharacter.tsx`: キャラクター、吹き出し、クリック処理
- `TimeThemeProvider.tsx`: 日本時間テーマとイベント

`app.js`のタイマー処理はReactへ移植する際、`useEffect`のクリーンアップで必ず解除してください。
