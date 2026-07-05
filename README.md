# 🛒 Todo Belanja

🔗 **Live:** <https://tolongbelanja.prahastagiri.com>

Aplikasi **todo belanja pribadi** berbasis web (**PWA**) untuk berbelanja dari
daftar yang diberikan orang tua. Bisa dibuka di HP maupun laptop, **tetap jalan
saat offline** (sinyal pasar sering buruk), dan menyimpan **riwayat masakan**
supaya bahan bisa dipakai ulang.

Dibangun dengan React + Vite + Supabase, dengan arsitektur **local-first**
sehingga bisa dibaca **dan ditulis** saat offline lalu tersinkron sendiri saat
online.

---

## ✨ Fitur

- **Template menu** — simpan menu yang sering dimasak (mis. "Opor Ayam")
  beserta bahan-bahannya, pakai ulang kapan saja.
- **Daftar belanja** dengan tiga mode:
  - **Draf** — susun daftar: tambah item manual atau salin dari menu, ubah
    jumlah, tandai "sudah punya".
  - **Mode belanja** — daftar terkunci; tinggal centang saat item masuk
    keranjang, lengkap dengan progress bar. Cocok dipakai sambil jalan di pasar.
  - **Selesai** — otomatis jadi catatan riwayat.
- **Jumlah fleksibel** — takaran (`0,5 kg`, `1 ons`) **atau** uang (`Rp 5.000`),
  plus catatan (mis. "atau 1/4 kg", "yang muda").
- **Kelompok kategori & satuan** — sayur, daging, bumbu, dst. agar mudah
  belanja per lapak.
- **Riwayat** — lihat belanja lampau, **belanja lagi** (ulang daftar), atau
  **simpan sebagai template** baru.
- **Gabung item kembar** — saat menyalin dari menu, item dengan nama+satuan
  sama bisa dijumlahkan otomatis.
- **Berbagi & impor menu** — bagikan template lewat tautan; penerima mendapat
  **salinannya sendiri** (bukan akses ke datamu). Cocok saat pindah/berpisah rumah.
- **Offline-first (PWA)** — bisa dipasang ke layar HP, dibuka & diedit tanpa
  sinyal, lalu sinkron otomatis saat online.
- **Multi-perangkat** — satu akun, data yang sama muncul di HP dan laptop.

---

## 🧱 Tumpukan teknologi

| Lapisan | Teknologi |
|---|---|
| Frontend | React 18 + Vite 5, `react-router-dom` |
| PWA | `vite-plugin-pwa` (service worker, installable) |
| Penyimpanan lokal | IndexedDB (cache + antrean "outbox") |
| Backend / DB | Supabase (PostgreSQL) + Row Level Security |
| Autentikasi | Supabase Auth (magic link / Google) |

---

## 🚀 Menjalankan

### Prasyarat
- Node.js 20+
- Sebuah proyek Supabase (gratis)

### 1. Siapkan database Supabase
1. Buat proyek baru di [supabase.com](https://supabase.com).
2. **SQL Editor** → jalankan seluruh isi [`docs/schema.sql`](docs/schema.sql)
   (membuat tabel, indeks, trigger, kebijakan RLS, dan fungsi berbagi).
3. **Authentication → Sign In / Providers → Email** → pastikan aktif (magic
   link otomatis nyala). Opsional: aktifkan Google.
4. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3220`
   - Redirect URLs: `http://localhost:3220/**`

### 2. Konfigurasi kredensial
```bash
cp .env.example .env.local
```
Isi dari **Project Settings → API** (tombol **Connect** juga menampilkannya):
```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon / publishable key>
```
> Gunakan **anon/publishable key**, bukan `service_role`.

### 3. Pasang & jalankan
```bash
npm install
npm run dev        # http://localhost:3220
```

Perintah lain:
```bash
npm run build      # build produksi ke dist/
npm run preview    # pratinjau hasil build
```

---

## ☁️ Deploy ke Vercel

Proyek sudah menyertakan [`vercel.json`](vercel.json) (framework Vite +
rewrite SPA agar deep-link seperti `/menu/:id` dan `/import` tidak 404).

1. Buka [vercel.com](https://vercel.com) → **Add New → Project** → import repo
   GitHub `todo-tobuy`. Framework terdeteksi otomatis (Vite).
2. **Environment Variables** — tambahkan (nilai dari `.env.local`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   > ⚠️ Vite menyisipkan env saat **build**. Kalau menambah/mengubah env
   > setelah deploy pertama, jalankan **Redeploy**.
3. **Deploy** → kamu dapat URL, mis. `https://todo-tobuy.vercel.app`.
4. **Perbarui Supabase** agar login bekerja di domain produksi —
   Authentication → **URL Configuration**:
   - Site URL: `https://<app>.vercel.app`
   - Redirect URLs: tambah `https://<app>.vercel.app/**` (biarkan
     `http://localhost:3220/**` untuk dev).
5. **Jika pakai login Google** — di Google Cloud Console tambahkan
   `https://<app>.vercel.app` ke *Authorized JavaScript origins* (callback
   Supabase tetap sama).

Push berikutnya ke `main` akan otomatis men-deploy ulang.

---

## 📁 Struktur proyek

```
todo-tobuy/
├── CLAUDE.md                 # peta konteks proyek (dibaca lebih dulu)
├── docs/
│   ├── spesifikasi-model-data.md   # model data, alur kerja, berbagi, offline
│   ├── schema.sql                  # skema database siap-jalan (Supabase)
│   ├── alur-layar.md               # urutan & fungsi tiap layar
│   └── keputusan.md                # decision log (catatan "kami putuskan X karena Y")
├── src/
│   ├── screens/              # satu file per layar (Login, Menu, Daftar, dst.)
│   ├── components/           # komponen dipakai ulang (ItemForm, ItemRow, ...)
│   ├── lib/                  # akses data local-first + sinkronisasi
│   │   ├── menus.js, lists.js      # API data (baca cache, tulis via outbox)
│   │   ├── repo.js                 # write-through ke IndexedDB + outbox
│   │   ├── localdb.js              # wrapper IndexedDB
│   │   ├── sync.js                 # flush (kirim) & pull (tarik, last-write-wins)
│   │   ├── format.js, constants.js, supabase.js
│   ├── hooks/                # mis. useOnlineStatus
│   └── context/              # AuthContext
└── public/                   # ikon PWA
```

---

## 🧠 Arsitektur local-first

Layar tidak memanggil Supabase langsung, tapi lewat lapisan data local-first:

```
Layar → lib/menus.js · lib/lists.js → lib/repo.js → IndexedDB (cache + outbox)
                                                        │  (saat online)
                                                        ▼
                                                lib/sync.js ⇄ Supabase
```

- **Baca** dari cache IndexedDB → instan dan jalan offline.
- **Tulis** optimistis ke cache + antre operasi di **outbox**, lalu dikirim ke
  Supabase saat online (`flush`).
- **Tarik** perubahan server ke cache dengan strategi **last-write-wins**
  berdasarkan `updated_at` (`pull`). `id` berupa `uuid` yang dibuat klien
  sehingga baris bisa lahir saat offline.
- Sinkronisasi berjalan saat login dan setiap koneksi kembali.

---

## 📐 Prinsip inti (jangan dilanggar)

1. **Template hanya menyalin, tidak mengikat.** Menambah menu ke daftar =
   *menyalin* item; mengedit item di daftar tidak mengubah template. Berbagi =
   memberi *salinan*.
2. **Jumlah = takaran ATAU uang** (`quantity`+`unit` atau `budget`), plus `note`.
3. **Item punya status**: `need` / `have` / `cart`.
4. **Riwayat = daftar berstatus `done`** — tidak ada tabel riwayat terpisah.

Detail lengkap ada di [`docs/`](docs/). Sebelum mengubah desain, baca
[`docs/keputusan.md`](docs/keputusan.md).

---

## ⚠️ Batas yang diketahui

- **Last-write-wins** efektif "yang sinkron terakhir menang" (trigger server
  menimpa `updated_at`). Cukup untuk pemakaian pribadi (1 pengguna, HP+laptop);
  belum ada resolusi konflik granular.
- **Impor menu** (`import_shared_menu`) membutuhkan koneksi online.
- Ikon PWA masih placeholder — ganti sebelum rilis publik.

---

## 📄 Lisensi

Proyek pribadi. Gunakan sesukamu.
