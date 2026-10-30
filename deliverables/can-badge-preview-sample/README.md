# 缶バッジ3Dプレビュー 移植サンプル

YukimiWorksの缶バッジ3Dプレビューを、ReactやNext.jsに依存しないHTML・CSS・JavaScriptに分離したサンプルです。外部ライブラリ、外部3Dモデル、アップロードAPIは使用しません。

## 含まれるファイル

- `index.html` — 完成した組み込み例
- `styles.css` — プレビューとサンプルページのスタイル
- `can-badge-preview.js` — WebGL描画、画像読み込み、ドラッグ・慣性回転

## サンプルの起動

ZIPを展開し、展開先でローカルHTTPサーバーを起動します。

```sh
python3 -m http.server 8080
```

ブラウザで `http://localhost:8080/` を開いてください。ファイルを直接開いても動作しますが、本番と同じHTTP環境での確認を推奨します。

## 外部サイトへの組み込み

1. `styles.css` と `can-badge-preview.js` を外部サイトの公開フォルダーへ配置します。
2. `index.html` の `.can-badge-tool` 要素全体を、表示したいページへコピーします。
3. HTMLの `<head>` でCSSを読み込み、`</body>` の直前または `defer` 付きでJavaScriptを読み込みます。

```html
<link rel="stylesheet" href="/assets/can-badge/styles.css" />
<script src="/assets/can-badge/can-badge-preview.js" defer></script>
```

JavaScriptは `[data-can-badge-preview]` を持つすべての要素を自動初期化します。同じページに複数設置しても、それぞれ独立して動作します。

## DOMの必須要素

`data-can-badge-preview` の内部に、以下の属性を持つ要素が必要です。タグ構成を変更する場合も、これらの属性は残してください。

- `data-can-badge-input`
- `data-can-badge-select`
- `data-can-badge-drag-area`
- `data-can-badge-canvas`
- `data-can-badge-error`
- `data-can-badge-status`

## 動作条件と注意

- WebGL、Canvas、Pointer Events、`requestAnimationFrame` が使える現行ブラウザが必要です。
- 選択した画像はブラウザ内だけでテクスチャ化され、サーバーへ送信されません。
- 画像は縦横比を保ったまま缶バッジ前面へ配置され、円形外は描画されません。
- Content Security Policyを使うサイトでは、配置先のJavaScriptとCSSを許可してください。選択画像の読み込みに `blob:` URLを使用します。
