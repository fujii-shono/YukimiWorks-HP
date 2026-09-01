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
- `artwork.png`
- `back.png`
- `highlight.png`

SVGは既存のデバッグ出力を使い、イラストとカット線を重ねた `*.export.svg` として保存されます。

別ポートのサーバーを使う場合は `ACRYLIC_TEST_BASE_URL` を指定します。

```sh
ACRYLIC_TEST_BASE_URL=http://127.0.0.1:3001 npm run acrylic:compare
```
