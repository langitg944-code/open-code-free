<div align="center">

# 🚀 OpenCode Free Access

### ⚡ AI Coding Assistant Gratis Tanpa API Key ⚡

[![Made with Bun](https://img.shields.io/badge/Made_with_Bun-000?style=for-the-badge&logo=bun&logoColor=F9F1E1)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Platform](https://img.shields.io/badge/Platform-Termux%20%7C%20Ubuntu%20%7C%20Debian-blue?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)]()

**AI Assistant yang jalan di terminal kamu — gratis, tanpa ribet, tanpa API key!**

[Instalasi](#-instalasi) • [Fitur](#-fitur) • [Konfigurasi](#-konfigurasi) • [Troubleshooting](#-troubleshooting)

</div>

---

## ✨ Tentang Project Ini

OpenCode Free Access adalah modifikasi dari [OpenCode](https://github.com/anomalyco/opencode) yang menggunakan **Xemoz REST API** sebagai AI engine. Dirancang khusus untuk:

- 📱 **Pengguna Termux** — jalan mulus di Android lewat proot Ubuntu
- 💻 **Pengguna Linux** — Ubuntu, Debian, dan distro lainnya
- 🆓 **Gratis selamanya** — tanpa perlu API key atau subscription

> **Dibuat oleh [Sky](https://github.com/langitg944-code)** — karena coding seharusnya bisa diakses semua orang.

---

## 🎯 Fitur Utama

| Fitur | Status | Keterangan |
|-------|--------|------------|
| 🤖 AI Text Generation | ✅ | Generate kode, penjelasan, dan solusi |
| 💬 Multi-turn Conversation | ✅ | Ingat konteks percakapan sebelumnya |
| 🔄 Auto Retry | ✅ | Otomatis retry kalau pesan kepanjangan |
| ⚡ Fast Response | ✅ | Response time ~3-5 detik |
| 🛠️ Tool Calling | ❌ | API belum support |
| 🖼️ Image Input | ❌ | Text only |

---

## 📦 Instalasi

### 🐧 Untuk Ubuntu / Debian / Linux

Sat command, langsung jalan:

```bash
git clone https://github.com/langitg944-code/open-code-free.git && \
cd open-code-free && \
curl -fsSL https://bun.sh/install | bash && \
export PATH="$HOME/.bun/bin:$PATH" && \
bun install && \
echo '✅ Instalasi selesai! Jalankan: bun run packages/opencode/src/index.ts'
```

**Cara pakai:**
```bash
cd open-code-free
bun run packages/opencode/src/index.ts
```

---

### 📱 Untuk Termux (Android)

#### Langkah 1: Setup Proot Ubuntu
```bash
# Di Termux biasa
pkg update && pkg upgrade -y
pkg install proot-distro -y
proot-distro install ubuntu
proot-distro login ubuntu
```

#### Langkah 2: Install OpenCode (di dalam proot Ubuntu)
```bash
# Setelah masuk proot Ubuntu
apt update && apt upgrade -y
apt install git curl unzip -y

# Clone dan install
git clone https://github.com/langitg944-code/open-code-free.git
cd open-code-free
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"
bun install
```

#### Langkah 3: Jalankan
```bash
bun run packages/opencode/src/index.ts
```

---

### ⚡ Quick Install Script (Termux)

Kalau mau lebih cepet, pake script otomatis:

```bash
# Di dalam proot Ubuntu
curl -fsSL https://raw.githubusercontent.com/langitg944-code/open-code-free/main/setup-termux.sh | bash
```

---

## 🎮 Cara Pakai

### Basic Usage
```bash
# Jalankan OpenCode
bun run packages/opencode/src/index.ts

# Atau langsung tanya sesuatu
bun run packages/opencode/src/index.ts run "Buatkan fungsi Python untuk fibonacci"
```

### Contoh Pertanyaan

```
> Buatkan kode Python untuk sorting array
> Jelaskan apa itu REST API
> Debug kode JavaScript ini: [paste kode]
> Buatkan query SQL untuk cari user aktif
```

---

## ⚙️ Konfigurasi

File konfigurasi ada di `opencode.jsonc`:

```jsonc
{
  "provider": {
    "xemoz-rest": {
      "npm": "xemoz-rest",
      "options": {
        "baseURL": "https://api-xemoz-official.my.id/api/ai",
        "model": "gpt-5.5",
        "timeout": 60000
      }
    }
  },
  "model": "xemoz-rest/gpt-5.5"
}
```

### Opsi Konfigurasi

| Opsi | Default | Keterangan |
|------|---------|------------|
| `baseURL` | `https://api-xemoz-official.my.id/api/ai` | URL API endpoint |
| `model` | `gpt-5.5` | Model AI yang dipakai |
| `timeout` | `60000` | Timeout dalam milliseconds |

---

## 🐛 Troubleshooting

### Error: "No providers available"
```bash
# Pastikan opencode.jsonc ada di root folder
ls opencode.jsonc

# Pastikan format JSON valid
cat opencode.jsonc
```

### Error: "timeout" atau "no response"
```bash
# Cek koneksi internet
curl -I https://api-xemoz-official.my.id

# Increase timeout di opencode.jsonc
# Ubah timeout: 60000 → 120000
```

### Bun install gagal di Termux
```bash
# Pastikan storage cukup
df -h

# Clean dan retry
rm -rf node_modules bun.lock
bun install
```

### Command not found: bun
```bash
# Reload PATH
export PATH="$HOME/.bun/bin:$PATH"

# Atau tambahkan ke .bashrc
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

---

## 🏗️ Struktur Project

```
open-code-free/
├── packages/
│   ├── core/
│   │   └── src/plugin/provider/
│   │       ├── xemoz-rest-client.ts    # Client Xemoz API
│   │       ├── xemoz-rest.ts           # Plugin definition
│   │       └── provider.ts             # Provider registry
│   ├── opencode/
│   │   └── src/
│   │       ├── index.ts                # Main entry point
│   │       └── provider/provider.ts    # Custom loader
│   └── ... (other packages)
├── opencode.jsonc                      # Konfigurasi
├── setup-termux.sh                     # Installer otomatis
└── README.md                           # You are here! 📍
```

---

## 🔧 Tech Stack

- **Runtime:** [Bun](https://bun.sh) — JavaScript runtime super cepat
- **Language:** TypeScript
- **AI Engine:** Xemoz REST API
- **Framework:** OpenCode (modified)

---

## 📝 Catatan Penting

- ⚡ API menggunakan GET request (bukan POST seperti OpenAI)
- 🔄 Pesan panjang otomatis dipotong kalau URL kepanjangan
- 🆓 Gratis tanpa API key — tapi rawan down/limit sewaktu-waktu
- 📦 Context window tergantung limit API server

---

## 🤝 Kontribusi

Contributions are welcome! Kalau mau kontribusi:

1. Fork repo ini
2. Buat branch baru (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

Project ini dilisensikan di bawah [MIT License](LICENSE).

---

## 🙏 Acknowledgments

- [OpenCode](https://github.com/anomalyco/opencode) — Base project
- [Xemoz API](https://api-xemoz-official.my.id) — Free AI API
- [Bun](https://bun.sh) — Awesome JavaScript runtime

---

<div align="center">

**Dibuat dengan ❤️ oleh [Sky](https://github.com/langitg944-code)**

⭐ **Kalau project ini bermanfaat, jangan lupa kasih star ya!** ⭐

[🐛 Report Bug](https://github.com/langitg944-code/open-code-free/issues) • [💡 Request Feature](https://github.com/langitg944-code/open-code-free/issues)

</div>
