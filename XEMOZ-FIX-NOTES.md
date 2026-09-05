# Catatan Fix (build "opencode-xemoz-fixed")

## 1. TUI crash: MP3 tidak ada di repo

`packages/tui/src/attention.ts` meng-import 5 file audio dengan
`with { type: "file" }`:

```
@opencode-ai/ui/audio/bip-bop-01.mp3
@opencode-ai/ui/audio/bip-bop-03.mp3
@opencode-ai/ui/audio/staplebops-06.mp3
@opencode-ai/ui/audio/nope-03.mp3
@opencode-ai/ui/audio/yup-01.mp3
```

File-nya tidak pernah ada di `packages/ui/src/audio/`, jadi TUI langsung mati:

```
Cannot find module '@opencode-ai/ui/audio/bip-bop-01.mp3'
  from 'packages/tui/src/attention.ts'
```

Sekarang folder itu diisi placeholder MP3 hening (MPEG-1 Layer III, 32 kbps,
44.1 kHz, mono, ~1.3 detik). Efek sampingnya cuma satu: suara notifikasi TUI
jadi hening. Ganti dengan MP3 asli kalau mau ada bunyinya — nama file harus
tetap sama.

## 2. `react/jsx-dev-runtime` tidak ketemu saat jalan dari root repo

`bunfig.toml` hanya ada di `packages/opencode/`, bukan di root. Jadi kalau
entry point dijalankan dari root repo, `preload = ["@opentui/solid/preload"]`
tidak terbaca dan semua `.tsx` ditranspile pakai JSX runtime React:

```
Cannot find module 'react/jsx-dev-runtime' from 'packages/tui/src/config/index.tsx'
```

Dua cara mengatasi:

```bash
# cara A — dari dalam packages/opencode (bunfig.toml kebaca otomatis)
bun run --cwd packages/opencode src/index.ts

# cara B — dari root repo, preload di-pass manual
bun run --preload packages/opencode/node_modules/@opentui/solid/scripts/preload.js \
  packages/opencode/src/index.ts run "pesanmu"
```

## 3. `bun install` butuh `node-gyp` di PATH

Tanpa `node-gyp`, install gagal di `tree-sitter-powershell`:

```
Error: spawn node-gyp ENOENT
error: install script from "tree-sitter-powershell" exited with 1
```

```bash
npm i -g --prefix ~/.npm-global node-gyp
export PATH="$HOME/.npm-global/bin:$PATH"
bun install
```

## Verifikasi

Dijalankan di Ubuntu (node v20.20.2, bun 1.3.14):

```
$ opencode-xemoz run "Sebut 3 kota di Indonesia, pisahkan koma."
> build · gpt-5.5
Jakarta, Surabaya, Bandung.

$ opencode-xemoz run -c "Kota mana yang ibu kota? 1 kata."
> build · gpt-5.5
Jakarta.

$ opencode-xemoz models
xemoz-rest/gpt-5.5
```

TUI (`opencode-xemoz` tanpa argumen) juga sudah render normal.
