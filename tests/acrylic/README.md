# Acrylic Regression Fixtures

`illustrations/` に回帰確認用の透過 PNG を追加します。

アクキー処理を変更するときは、変更前にローカルサーバーを起動してから baseline を保存します。

```sh
npm run dev
npm run acrylic:baseline
```

変更後に同じサーバーへ against して比較します。

```sh
npm run acrylic:compare
```

差分がある場合もスクリプトは失敗扱いにしません。表示されたファイル名を確認し、人間が最終判断します。

`baseline/` と `current/` には、プレビューAPIのJSONに加えて以下の3DレイヤーPNGも保存されます。

- `acrylic.png`
- `edge.png`
- `side.png`
- `artwork.png`
- `back.png`
- `highlight.png`

SVGは既存のデバッグ出力を使い、イラストとカット線を重ねた `*.export.svg` として保存されます。

アクスタの台座・ツメ形状がアクキー用のキャラ余白設定に影響されないことだけを確認する場合は、ローカルサーバーを起動してから以下を実行します。

```sh
npm run acrylic:stand-claw-check
```

この確認では、`keychain.clearRadius` を複数値に変えても `standBaseFrame` とアクスタの主要レイヤーが変わらないかを比較します。結果と目視確認用PNGは `current/stand-claw-check/` に保存されます。差分がある場合もスクリプトは失敗扱いにせず、差分のあったイラスト、モード、項目を表示します。

別ポートのサーバーを使う場合は `ACRYLIC_TEST_BASE_URL` を指定します。

```sh
ACRYLIC_TEST_BASE_URL=http://127.0.0.1:3001 npm run acrylic:compare
```
