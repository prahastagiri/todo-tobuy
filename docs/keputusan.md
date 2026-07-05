# Catatan Keputusan (Decision Log)

Catatan keputusan desain penting. Entri TERBARU di atas. Jangan hapus
entri lama; cukup tambahkan yang baru. Format tiap entri: tanggal,
keputusan, dan alasan singkat. Baca file ini sebelum mengubah desain.

---

## 2026-07-06 — Persiapan deployment (Vercel)

- **Target hosting: Vercel** (auto-deploy dari GitHub). `vercel.json`:
  framework Vite, `buildCommand`/`outputDirectory` eksplisit, dan **rewrite
  SPA** `/(.*) → /index.html` agar deep-link (mis. `/menu/:id`, `/import`)
  tidak 404. File statis (sw.js, assets, ikon) tetap dilayani langsung
  karena filesystem diprioritaskan sebelum rewrite.

- **Env di-build-time.** `VITE_*` disisipkan saat build, jadi env var harus
  diset di Vercel sebelum build; perubahan env perlu redeploy.

- **Pasca-deploy:** wajib menambah domain produksi ke Supabase Auth (Site
  URL + Redirect URLs) dan ke Google OAuth origins bila dipakai. Langkah
  lengkap ada di README bagian "Deploy ke Vercel".

- Build produksi diverifikasi lokal (`npm run build`): 99 modul, service
  worker + manifest PWA ter-generate.

---

## 2026-07-05 — Sinkronisasi offline (local-first) selesai

Mencabut penundaan di entri "Profil/Setelan". Aplikasi kini bisa BACA & TULIS
saat offline, lalu menyinkronkan saat online (spec §9).

- **Arsitektur local-first.** Layar → `lib/menus.js`/`lib/lists.js` (tanda
  tangan tetap) → `lib/repo.js` → cache IndexedDB (`lib/localdb.js`) +
  antrean **outbox**. Baca dari cache (instan, jalan offline); tulis
  optimistis ke cache + antre op, lalu `flush` ke Supabase bila online.

- **Mesin sinkron `lib/sync.js`.** `flush()` mengirim outbox (upsert/update/
  delete) urut; `pull()` menarik server → cache dengan **last-write-wins**
  berdasarkan `updated_at` (baris dengan op lokal tertunda dimenangkan versi
  lokal; menu_items tanpa updated_at → server sbagai sumber kecuali pending).
  `sync()` = flush lalu pull; dilewati saat offline.

- **Bootstrap.** `App.jsx` menjalankan `sync()` saat login (gerbang
  "Menyinkronkan…") dan mendaftar listener `online` untuk sinkron ulang.
  `id` uuid dibuat klien → baris bisa lahir saat offline.

- **Terverifikasi:** (1) tulis online → outbox terkuras, server konsisten;
  (2) tulis saat `navigator.onLine=false` → tertahan di outbox, server tak
  berubah; kembali online + `sync()` → terkirim; (3) alur penuh
  menu→daftar→belanja→selesai lewat lapisan lokal, server & UI konsisten.

- **Batas yang diketahui:** LWW efektif "yang sinkron terakhir menang"
  karena trigger `set_updated_at` server menimpa `updated_at` saat update;
  cukup untuk skenario pribadi (1 user, HP+laptop). Resolusi konflik granular
  belum ada. `import_shared_menu` (RPC) butuh online.

---

## 2026-07-05 — Penggabungan item kembar selesai (mencabut penundaan)

- **Menuntaskan yang ditunda di entri "Layar Daftar Belanja".** Saat "Tambah
  dari menu", item dengan **nama+satuan sama** (tak sensitif huruf/spasi)
  kini terdeteksi. Jika ada, UI menawarkan via dialog: **gabungkan** jumlah
  (quantity & budget dijumlahkan ke item yang ada; item 'have' dikembalikan
  ke 'need') **atau** tambah sebagai **baris terpisah**.

- **Fungsi:** `findMenuDuplicates()` + `addMenuToList(listId, menuId, sort,
  merge)` di `lib/lists.js` (menggantikan `addFromMenu`). Terverifikasi
  kedua jalur: gabung (2+2→4, 1 baris) dan terpisah (2 baris).

---

## 2026-07-05 — Profil/Setelan + kesadaran online-offline

- **Tombol 👤 di header → `/profil`** (menggantikan tombol "Keluar" di
  header). Layar `screens/Profile.jsx`: email akun, status koneksi (chip),
  pasang PWA, keluar, versi. Signout dipindah ke sini.

- **Indikator offline global.** `hooks/useOnlineStatus.js` (event
  online/offline) → banner kuning di AppShell saat offline. Terverifikasi
  reaktif terhadap event online/offline.

- **Pasang PWA.** Event `beforeinstallprompt` ditangkap global di `main.jsx`
  (hanya terpicu sekali) dan disimpan di `window.__deferredInstallPrompt`;
  tombol di Profil memicunya. Tombol hanya muncul bila browser menawarkan
  install.

- **BELUM ADA — sinkronisasi tulis offline (last-write-wins).** Shell PWA
  sudah di-cache (bisa dibuka offline), tapi antrean tulis offline +
  merge `updated_at` (spec §9) belum diimplementasikan. Ini pekerjaan besar
  tersendiri (IndexedDB outbox + resolusi konflik); ditandai sebagai
  langkah berikutnya yang berdiri sendiri.

- **Berbagi pakai `share_code` acak** (12 hex dari `crypto.randomUUID`),
  di-set/di-null lewat update biasa (diizinkan RLS karena menu milik
  sendiri). UI: `components/ShareMenu.jsx` (modal dari `MenuDetail`) —
  aktifkan, tampilkan tautan `…/import?code=<kode>`, salin, cabut.

- **Impor lewat `import_shared_menu()`** (security definer) yang sudah ada
  di `schema.sql`. Layar `ImportMenu` memanggil RPC ini.

- **Terverifikasi lintas-akun:** penerima TIDAK bisa membaca menu pemilik
  langsung via `share_code` (RLS memblokir, 0 baris), tapi RPC berhasil
  membuat SALINAN milik penerima (menu id baru, `share_code` tidak ikut
  tersalin, semua item tersalin). Membuktikan prinsip inti #1 (model salin)
  dan keamanan RLS + security-definer.

- **Satu layar `ListDetail`, tiga mode dari `shopping_lists.status`.**
  draft = edit penuh; shopping = daftar dibekukan, hanya ketuk baris untuk
  toggle keranjang (need↔cart) + progress bar; done = baca-saja + aksi.
  Izin UI diturunkan dari status (bukan hardcode per layar), sesuai
  keputusan navigasi sebelumnya.

- **"Tambah dari menu" = menyalin** `menu_items` → `shopping_list_items`
  (status 'need', `source_menu_id` sebagai referensi saja). Terverifikasi:
  item daftar adalah baris terpisah; mengeditnya tidak menyentuh menu
  (prinsip inti #1).

- **Item 'have' dipisah ke bagian "Sudah punya di rumah"** (diredupkan) dan
  dikecualikan dari progress belanja. "Simpan sebagai template" juga
  mengecualikan item 'have' (spec §4.7) — terverifikasi.

- **Aksi riwayat:** "Belanja lagi" (duplikat ke draft baru, reset ke 'need')
  dan "Simpan sebagai template". Keduanya eksplisit, tidak pernah otomatis.

- **DITUNDA — penggabungan item kembar (spec §4.1).** Saat ini "Tambah dari
  menu" selalu menyisipkan salinan; belum menawarkan menjumlahkan quantity
  untuk item dengan nama+unit sama. Alasan penundaan: UX multi-konfirmasi
  perlu dirancang; fungsional inti tidak terganggu. Lihat `lib/lists.js`
  `addFromMenu`.

- **Update input terkontrol:** `preview_fill` kadang tak memicu `onChange`
  React; ini artefak alat uji, bukan bug app (native input event bekerja).
  Screenshot preview timeout (kuirk renderer) — verifikasi pakai snapshot +
  query DB.

---

## 2026-07-05 — Layar Menu (Template) selesai

- **Form item menampilkan takaran DAN budget bersamaan** (bukan toggle
  "takaran vs uang"). Alasan: spec Bagian 3.2 mengizinkan keduanya diisi
  bila perlu (mis. "cabai 1 ons ± 5rb"); satu form tanpa mode lebih
  sederhana dan tidak menghalangi kasus itu. Komponen: `components/ItemForm.jsx`
  (dipakai ulang nanti untuk `shopping_list_items`).

- **Item dikelompokkan per kategori**, diurut sesuai `CATEGORIES`
  (`lib/constants.js`) lalu `sort_order`. Kategori tak dikenal ditaruh di
  akhir. Komponen baris: `components/ItemRow.jsx` (punya slot aksi + prop
  `dim` untuk status 'have' nanti).

- **Nama menu diedit inline** (input, simpan saat blur) alih-alih dialog
  terpisah. Format uang/takaran dipusatkan di `lib/format.js`.

- **Verifikasi:** dibuat menu "Opor Ayam" + 2 bahan lewat UI; data
  terkonfirmasi tersimpan benar di Supabase (Dada ayam: quantity/unit;
  Sayur: budget=5000) dan RLS membatasi ke user login.

---

## 2026-07-05 — Scaffold aplikasi (fondasi kode)

- **Stack konkret: React 18 + Vite 5 + `vite-plugin-pwa`, `react-router-dom`,
  `@supabase/supabase-js`.** Alasan: memfinalkan "mis. React + Vite" di
  CLAUDE.md menjadi versi nyata yang terpasang. Vite 5 (bukan 6) dipilih
  demi kestabilan di Node 20.

- **Klien Supabase toleran tanpa env.** `src/lib/supabase.js` memakai nilai
  placeholder + flag `isSupabaseConfigured` bila `.env.local` belum diisi,
  agar aplikasi tetap render (menampilkan banner) alih-alih crash saat
  scaffold sebelum proyek Supabase dibuat. Alasan: pengembangan bertahap.

- **Sesi login via React Context** (`AuthContext` + `useAuth`), guard di
  `App.jsx`. Rute `/import` bisa diakses sebelum login lalu mengarahkan ke
  Masuk — mendukung alur tautan berbagi (spec Bagian 8/11).

- **Layar dibuat bertahap.** Fondasi + Login + shell 3 tab sudah jalan &
  terverifikasi (dev server). Tab (Daftar/Menu/Riwayat) masih placeholder;
  diisi satu per satu sesuai aturan "satu layar dalam satu waktu".

- **PWA icon placeholder** (`public/icon-192/512.png`, huruf "B" hijau)
  dibuat sementara; ganti dengan ikon final sebelum rilis.

---

## 2026-07-05 — Rancangan alur layar

- **Navigasi 3 tab + profil.** Tab utama: Daftar (sesi aktif), Menu
  (template), Riwayat (daftar `done`), plus menu Profil. Alasan: memetakan
  langsung ke tiga entitas yang dilihat pengguna; sederhana untuk PWA di HP.

- **Mode UI diturunkan dari `shopping_lists.status`.** `draft` = edit penuh,
  `shopping` = hanya centang item ke keranjang (daftar dibekukan), `done` =
  baca-saja. Alasan: satu sumber kebenaran untuk izin edit, tidak
  di-hardcode per layar; mewujudkan fitur "kunci".

- **Aksi eksplisit dari Riwayat.** "Belanja lagi" (salin daftar selesai ke
  daftar `draft` baru, reset ke `need`) dan "Simpan sebagai template"
  (spec §4.7, kecualikan item `have`). Alasan: mengulang masakan tanpa
  pernah menulis balik otomatis ke template — menjaga prinsip inti nomor 1.

- **Detail lengkap di `docs/alur-layar.md`.** Berisi peta navigasi, isi &
  aksi tiap layar, dan pemetaan aksi → operasi data (spec §4).

---

## 2026-07-05 — Fondasi awal

- **Model data relasional (Supabase/PostgreSQL).** Tabel: `menus`,
  `menu_items`, `shopping_lists`, `shopping_list_items`. Alasan: data
  belanja penuh hubungan "satu punya banyak", cocok untuk SQL.

- **Template hanya menyalin, tidak mengikat.** Menambah template ke daftar
  menyalin itemnya ke `shopping_list_items`. Alasan: agar edit per sesi
  (ubah jumlah, tandai sudah punya) tidak merusak template dan riwayat
  tetap akurat.

- **Jumlah = takaran atau uang.** `quantity` + `unit` untuk takaran (mis.
  "1 ons", "1/2 kg"), `budget` untuk beli-berdasar-uang (mis. "sayur
  5rb" = 5000), `note` untuk alternatif ("atau 1/4 kg"). Alasan:
  instruksi belanja nyata tidak selalu berupa berat/jumlah.

- **Status item: need / have / cart.** Item "sudah punya di rumah" diberi
  status `have` (tetap tampil, dilewati), bukan dihapus. Alasan: menjaga
  template tetap lengkap sekaligus mengecualikan item dari belanja kali ini.

- **Riwayat = daftar berstatus 'done'.** Tidak ada tabel riwayat terpisah.
  Alasan: item daftar sudah berupa salinan bebas, jadi daftar selesai
  otomatis menjadi catatan riwayat yang akurat.

- **Autentikasi diperlukan (magic link / Google).** Alasan: RLS berbasis
  `auth.uid()` menjaga privasi, dan login membuat data bisa diakses dari
  HP maupun laptop ("buka di mana saja").

- **Berbagi template pakai model salin.** Kolom `share_code` + fungsi
  `import_shared_menu()` (security definer). Alasan: penerima mendapat
  salinan miliknya sendiri tanpa bisa mengakses data lain si pemilik;
  cocok untuk skenario pindah/berpisah rumah.

- **PWA + offline.** Aplikasi dibuat sebagai PWA dengan service worker,
  sinkron "penulisan terakhir menang" berdasarkan `updated_at`; `id`
  berupa `uuid` agar bisa dibuat saat offline. Alasan: sinyal di pasar
  sering buruk.

- **Konteks proyek disimpan di repositori.** `CLAUDE.md` di akar + folder
  `docs/`. Alasan: Claude tidak mengingat percakapan antar sesi, jadi
  ingatan harus hidup di dalam proyek.
