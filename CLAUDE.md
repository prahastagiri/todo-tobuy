# Aplikasi Belanja — Konteks Proyek

File ini adalah peta konteks utama. Claude/agent membacanya lebih dulu di
setiap sesi. Untuk detail, lihat folder `docs/`.

Aplikasi todo belanja pribadi berbasis web (PWA) untuk berbelanja dari
daftar yang diberikan orang tua. Bisa dibuka di HP maupun laptop, jalan
saat offline (sinyal pasar buruk), dan menyimpan riwayat masakan supaya
bahan bisa dipakai ulang.

## Tumpukan teknologi

- Frontend: React 18 + Vite 5 sebagai PWA (`vite-plugin-pwa`) — bisa
  dipasang ke layar HP, jalan offline lewat service worker. Routing pakai
  `react-router-dom`.
- Backend/Database: Supabase (PostgreSQL) dengan Row Level Security (RLS).
- Autentikasi: Supabase Auth (magic link atau login Google). Login
  diperlukan karena RLS berbasis `auth.uid()`, sekaligus membuat fitur
  "buka di mana saja" bekerja.

## Prinsip inti (JANGAN dilanggar)

1. Template hanya menyalin, tidak mengikat. Menambah template ke daftar =
   MENYALIN item; mengedit item di daftar TIDAK BOLEH mengubah template.
   Berbagi template = memberi SALINAN, bukan akses ke data asli.
2. Jumlah bisa berupa takaran (`quantity` + `unit`) ATAU uang (`budget`,
   mis. "sayur 5rb" = 5000), plus `note` untuk catatan (mis. "atau 1/4 kg").
3. Item punya status: `need` (perlu) / `have` (sudah punya, dilewati) /
   `cart` (sudah di keranjang).
4. Riwayat = daftar belanja dengan `status = 'done'`. TIDAK ada tabel
   riwayat terpisah.

## Model data (ringkas)

- `menus` (template) 1—* `menu_items`
- `shopping_lists` (sesi belanja) 1—* `shopping_list_items` (salinan bebas)
- `menus` bisa dibagikan lewat kolom `share_code` + fungsi
  `import_shared_menu()` (model salin yang aman).

Detail lengkap: `docs/spesifikasi-model-data.md` dan `docs/schema.sql`.

## Dokumen di folder docs/

- `spesifikasi-model-data.md` — penjelasan lengkap model data, alur kerja,
  autentikasi, berbagi template, dan mode offline.
- `schema.sql` — skema database siap-jalan untuk Supabase.
- `alur-layar.md` — urutan & fungsi tiap layar; peta navigasi dan
  pemetaan aksi → operasi data.
- `keputusan.md` — catatan keputusan penting; BACA sebelum mengubah desain.

## Struktur kode & menjalankan

- `src/lib/supabase.js` — klien Supabase (baca env dari `.env.local`).
- `src/context/AuthContext.jsx` — sesi login global (`useAuth()`).
- `src/App.jsx` — routing + guard login. `src/components/AppShell.jsx` —
  kerangka 3 tab.
- `src/screens/` — satu file per layar (lihat `docs/alur-layar.md`).
- `src/lib/` — akses data local-first (`menus.js`, `lists.js`) di atas
  `repo.js` → `localdb.js` (IndexedDB + outbox) + `sync.js` (flush/pull,
  last-write-wins). Juga `format.js`, `constants.js`, `supabase.js`.
- `src/hooks/` — hook kecil (mis. `useOnlineStatus`).
- Setup: salin `.env.example` → `.env.local`, isi kredensial Supabase,
  jalankan `schema.sql` di Supabase SQL Editor. Lalu `npm install` &
  `npm run dev`.

## Aturan kerja untuk Claude/agent

- Baca `CLAUDE.md` + `docs/` sebelum mengubah apa pun.
- Deploy/penerbitan ke publik dipicu oleh pemilik, TIDAK otomatis.
- Setiap ada keputusan baru atau perubahan desain: perbarui dokumen
  terkait dan tambahkan entri bertanggal di `docs/keputusan.md`.
- Kerjakan satu layar/komponen dalam satu waktu; buat komponen yang dapat
  dipakai ulang agar perubahan desain di kemudian hari lebih mudah.
