# qpdf-wasm

ブラウザ上で qpdf ( --qdf ) を実行するための簡易セットです。

Emscripten コンテナで qpdf を wasm 化し、`dist/` 以下に成果物 (`out/qpdf.js` / `out/qpdf.wasm`) とシンプルな UI ページを用意しています。

「[スライドホスティングサイトでの文字化けの悩みをさらに調べていたら、より良さそうな対処方法を発見した - kmuto’s blog](https://kmuto.hatenablog.com/entry/2025/11/23/111400)」に準拠したPDF正規化（`--qdf`）と、必要に応じて再圧縮をブラウザ上で行うことを目的にしています。

## 使い方

### 1. WASM ビルドを再生成したい場合

```sh
# docker が必要です
docker build -f Dockerfile.wasm -t qpdf-wasm-build .
docker create --name qpdf-wasm-tmp qpdf-wasm-build
rm -rf dist && mkdir dist
docker cp qpdf-wasm-tmp:/out ./dist
docker rm qpdf-wasm-tmp
```

### 2. 開発/動作確認

任意の静的サーバで `dist/` を配信します。

```sh
cd dist
python -m http.server 8000  # 例
```

ブラウザで <http://localhost:8000> を開き、PDF を選択して「qpdf --qdf を実行」を押すと変換済み PDF をダウンロードできます。

### 3. GitHub Pages に配置する場合

`dist/` を公開ディレクトリとしてそのままデプロイしてください（`index.html` がエントリポイントで `out/qpdf.js/wasm` を同階層 `out/` から読み込みます）。

## Copyright

> qpdf is copyright (c) 2005-2021 Jay Berkenbilt, 2022-2025 Jay Berkenbilt and Manfred Holger
>
> Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the
> License. You may obtain a copy of the License at
>
> https://www.apache.org/licenses/LICENSE-2.0
>
> Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "
> AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific
> language governing permissions and limitations under the License.
>
> You may also see the license in the file [LICENSE.txt](LICENSE.txt) in the source distribution.
>
> Versions of qpdf prior to version 7 were released under the terms of version 2.0 of the Artistic License. At your
> option, you may continue to consider qpdf to be licensed under those terms. Please see the manual for additional
> information. The Artistic License appears in the file [Artistic-2.0](Artistic-2.0) in the source distribution.
