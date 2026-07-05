# Alur Layar — Aplikasi Belanja

Dokumen ini menjelaskan urutan dan fungsi tiap layar aplikasi: apa yang
tampil, aksi apa yang tersedia, dan operasi data mana (lihat
`spesifikasi-model-data.md` Bagian 4) yang dipicunya. Ditujukan untuk
pengembang/agent yang membangun UI.

Prinsip inti tetap berlaku di setiap layar (lihat `CLAUDE.md`): template
hanya menyalin, jumlah = takaran atau uang, item punya status, riwayat =
daftar `done`. UI TIDAK BOLEH menulis balik dari daftar belanja ke
template secara otomatis.

---

## 1. Peta navigasi

Navigasi utama berupa **bottom navigation** (di HP) / **sidebar** (di
laptop) dengan tiga tab, plus menu profil:

```
┌──────────────────────────────────────────────┐
│  (konten layar aktif)                         │
│                                               │
├──────────────────────────────────────────────┤
│   [ Daftar ]   [ Menu ]   [ Riwayat ]   (👤)  │
└──────────────────────────────────────────────┘
```

- **Daftar** — sesi belanja aktif (`shopping_lists` status `draft`/`shopping`). Layar utama.
- **Menu** — template yang bisa dipakai ulang (`menus`).
- **Riwayat** — daftar yang sudah selesai (`shopping_lists` status `done`).
- **👤 Profil** — akun, keluar, pasang PWA, status sinkron.

Indikator **offline/sinkron** tampil global di header (mis. ikon awan):
"tersinkron", "menyimpan lokal…", atau "offline — perubahan tersimpan".

Peta alur antar-layar:

```
        [Masuk]
           │ (setelah login)
           ▼
     ┌─► [Daftar Aktif] ──buat──► [Detail Daftar (draft)]
     │        │                          │ kunci
     │        │                          ▼
     │        └── buka ──────────► [Mode Belanja (shopping)]
     │                                   │ selesai
     │                                   ▼
     ├─► [Riwayat] ◄──────────── [Detail Riwayat (done)]
     │        │                          │ simpan sbg template
     │        ▼                          ▼
     └─► [Daftar Menu] ──buka──► [Detail/Edit Menu] ──bagikan──► [Bagikan Menu]

     [Impor Menu]  ◄── dibuka dari tautan berbagi (?code=…)
```

---

## 2. Layar Masuk (Login)

**Kapan:** pengguna belum punya sesi login aktif.

**Isi & aksi:**
- Nama/logo aplikasi + kalimat singkat.
- Input email → tombol **Kirim tautan masuk** (magic link).
- Tombol **Masuk dengan Google**.
- Setelah magic link diklik / Google berhasil → masuk ke **Daftar Aktif**.

**Catatan:** sesi disimpan, jadi pengguna tidak login berulang. Semua
layar lain memerlukan status login (RLS berbasis `auth.uid()`).

---

## 3. Daftar Aktif (Beranda)

**Kapan:** layar pertama setelah masuk. Tab **Daftar**.

**Isi:**
- Daftar sesi belanja yang belum selesai (`status IN ('draft','shopping')`),
  urut `updated_at` terbaru. Tiap kartu: nama, status (Draf / Sedang
  belanja), ringkasan (mis. "3 dari 8 sudah di keranjang" untuk `shopping`).
- Tombol **+ Buat daftar baru**.
- Bila kosong: ajakan membuat daftar pertama atau menyalin dari menu.

**Aksi:**
- **Buat daftar** → dialog nama → `INSERT shopping_lists (name, status='draft')`
  → buka **Detail Daftar (draft)**.
- **Buka kartu**:
  - status `draft` → **Detail Daftar (draft)**.
  - status `shopping` → **Mode Belanja**.

---

## 4. Detail Daftar — mode draft (menyusun)

**Kapan:** membuka daftar `status = 'draft'`. Ini tempat menyusun belanjaan.

**Isi:**
- Judul daftar (bisa di-rename).
- Daftar `shopping_list_items` dikelompokkan per `category`
  (sayur, daging, bumbu, …), diurut `sort_order`.
- Tiap item menampilkan: nama, takaran (`quantity` `unit`) **atau** uang
  (`budget` → "Rp 5.000"), `note` (mis. "atau 1/4 kg"), dan penanda status.
- Item `have` (sudah punya di rumah) tetap tampil tapi diredupkan/dicoret.

**Aksi:**
- **+ Tambah item manual** → form item (lihat §8) → `INSERT shopping_list_items (status='need')`.
- **+ Tambah dari menu** → pemilih template (§7 Daftar Menu dalam mode pilih)
  → **menyalin** semua `menu_items` menu itu ke `shopping_list_items`
  (spec §4.1). Saat menyalin, **cek item kembar** (nama+unit sama):
  tawarkan **jumlahkan `quantity`** alih-alih membuat baris kedua.
- **Edit item** (tap item) → ubah nama/quantity/unit/budget/note/category
  → `UPDATE shopping_list_items` (spec §4.3). **Hanya mengubah sesi ini,
  bukan template.**
- **Tandai "sudah punya"** (toggle) → `status = 'have'` (spec §4.2).
- **Hapus item** → `DELETE` baris itu.
- **🔒 Mulai belanja (kunci)** → `UPDATE shopping_lists SET status='shopping'`
  → pindah ke **Mode Belanja**.
- **Hapus daftar** (dari menu ⋯) → `DELETE shopping_lists` (cascade item).

---

## 5. Mode Belanja — mode shopping (terkunci)

**Kapan:** daftar `status = 'shopping'`. Layar ini dipakai SAAT di pasar.

**Prinsip:** daftar dibekukan. Yang boleh berubah **hanya status item**
(mencentang saat masuk keranjang). UI menyembunyikan/menonaktifkan
tombol edit jumlah, tambah item, hapus.

**Isi:**
- Hanya item yang perlu dibeli (`status = 'need'` / `'cart'`) yang menonjol;
  item `have` disembunyikan atau ditaruh di bagian "sudah punya" yang tertutup.
- Dikelompokkan per `category` agar belanja per lapak lebih mudah.
- **Progress bar**: jumlah `cart` dari total yang perlu dibeli.
- Tampilan besar & ramah sentuh (dipakai sambil jalan di pasar).

**Aksi:**
- **Centang item** → `status = 'cart'` (spec §4.4). Tap lagi → kembali `need`.
- **Buka kunci** (dari menu ⋯) → kembalikan `status='draft'` bila perlu koreksi.
- **✓ Selesai belanja** → `UPDATE shopping_lists SET status='done',
  completed_at=now()` (spec §4.5) → masuk ke **Detail Riwayat**.

**Offline:** layar ini paling sering dipakai offline. Semua centang
tersimpan lokal dan disinkron saat online (last-write-wins via `updated_at`).

---

## 6. Riwayat

**Kapan:** tab **Riwayat**.

**Isi:**
- Daftar `shopping_lists` dengan `status = 'done'`, urut `completed_at`
  terbaru (spec §4.6). Tiap kartu: nama, tanggal selesai, jumlah item.

**Aksi:**
- **Buka** → **Detail Riwayat**.

---

## 7. Detail Riwayat (daftar selesai)

**Kapan:** membuka daftar `done`. Bersifat **baca-saja** untuk itemnya.

**Isi:**
- Item daftar apa adanya saat selesai (salinan bebas, jadi akurat meski
  template kelak berubah — inilah gunanya model salin).

**Aksi:**
- **Belanja lagi** → buat `shopping_lists` baru (`draft`) berisi salinan
  item ini (semua di-reset ke `status='need'`). Cara cepat mengulang menu.
- **Simpan sebagai template** → buat `menus` baru dari item daftar
  (spec §4.7), mengecualikan item `have`. Selalu tindakan yang DISENGAJA.

---

## 8. Daftar Menu (Template)

**Kapan:** tab **Menu**. Juga dipakai sebagai **pemilih** saat "Tambah dari
menu" di Detail Daftar.

**Isi:**
- Daftar `menus` milik pengguna, urut nama/`updated_at`. Tiap kartu:
  nama menu + jumlah bahan. Penanda 🔗 bila `share_code` terisi (sedang dibagikan).
- Tombol **+ Buat menu**.

**Aksi (mode kelola):**
- **Buat menu** → nama → `INSERT menus` → **Detail/Edit Menu**.
- **Buka menu** → **Detail/Edit Menu**.

**Aksi (mode pilih, dipanggil dari Detail Daftar):**
- **Pilih menu** → menyalin item ke daftar aktif (spec §4.1), kembali ke Detail Daftar.

---

## 9. Detail / Edit Menu (Template)

**Kapan:** membuka satu `menus`.

**Isi:**
- Nama menu (bisa di-rename → `UPDATE menus`).
- Daftar `menu_items` per kategori, urut `sort_order`.

**Aksi:**
- **+ Tambah bahan** / **Edit bahan** → **form item** (lihat di bawah)
  → `INSERT`/`UPDATE menu_items`.
- **Hapus bahan** → `DELETE menu_items`.
- **Ubah urutan** → set `sort_order`.
- **Bagikan** → **Bagikan Menu**.
- **Hapus menu** → `DELETE menus` (cascade `menu_items`; kolom
  `source_menu_id` di item daftar jadi `null`, item tetap ada).

### Form item (dipakai di menu & di daftar belanja)

Satu form untuk `menu_items` maupun `shopping_list_items`:

- **Nama** (wajib).
- Pilihan cara jumlah:
  - **Takaran** → input `quantity` (angka) + pilih `unit`
    (`kg`, `gram`, `ons`, `biji`, `buah`, `butir`, `ikat`, `bungkus`,
    `sisir`, `papan`, `potong`, `sdm`, `sdt`, `secukupnya`).
  - **Uang** → input `budget` (rupiah). `quantity`/`unit` dibiarkan kosong.
  - (Boleh keduanya bila perlu, mis. "cabai 1 ons ± 5rb".)
- **Catatan** (`note`) opsional — mis. "atau 1/4 kg", "yang muda".
- **Kategori** (`category`) — `sayur`, `daging`, `bumbu`, `sembako`,
  `minuman`, `lainnya`.

Format tampilan uang ("Rp 5.000") diurus UI; DB simpan angka mentah `budget = 5000`.

---

## 10. Bagikan Menu

**Kapan:** dari Detail Menu → Bagikan.

**Isi & aksi:**
- Bila belum dibagikan: tombol **Aktifkan berbagi** → set `share_code`
  (uuid/kode acak) → `UPDATE menus SET share_code=…`.
- Bila sudah: tampilkan **tautan** `https://app…/import?code=<share_code>`
  + tombol **Salin tautan** / **Bagikan** (mis. ke WhatsApp).
- **Cabut berbagi** → `UPDATE menus SET share_code=NULL`. Tautan lama mati;
  salinan yang sudah dibuat penerima tetap ada (sifat model salin).

**Catatan:** berbagi = memberi SALINAN, bukan akses. Sesuai prinsip inti.

---

## 11. Impor Menu (penerima)

**Kapan:** penerima membuka tautan berbagi `…/import?code=<kode>`.

**Alur:**
- Jika belum login → arahkan ke **Masuk** dulu, lalu kembali ke sini.
- Tampilkan konfirmasi "Impor menu ini ke akunmu?".
- **Impor** → panggil fungsi DB `import_shared_menu('<kode>')` (spec §8).
  Fungsi menyalin menu + itemnya ke akun penerima (tanpa membawa
  `share_code`) dan mengembalikan `id` menu baru.
- Berhasil → buka **Detail/Edit Menu** hasil salinan (milik penerima, bebas diubah).
- Gagal (kode dicabut/tidak ada) → pesan "Kode tidak ditemukan atau sudah dicabut".

---

## 12. Profil / Setelan

**Kapan:** ikon 👤.

**Isi & aksi:**
- Email akun + tombol **Keluar** (sign out).
- **Pasang aplikasi** (prompt install PWA) bila tersedia.
- Status sinkron/offline + tombol **Sinkronkan sekarang**.
- (Opsional) info versi.

---

## 13. Catatan implementasi lintas-layar

- **Komponen dapat dipakai ulang:** kartu item, form item, chip status,
  pengelompokan per kategori dipakai di banyak layar — buat sekali.
- **Status daftar mengatur mode UI:** `draft` = bisa edit penuh;
  `shopping` = hanya centang; `done` = baca-saja. Turunkan izin UI dari
  `shopping_lists.status`, jangan hardcode per layar.
- **Offline-first:** semua tulis menyimpan lokal dulu lalu sinkron; `id`
  uuid dibuat di klien; tak ada layar yang boleh memblokir aksi hanya
  karena offline.
- **Jangan tulis balik ke template:** tidak ada satu pun aksi di layar
  daftar/riwayat yang otomatis mengubah `menus`/`menu_items`. Perubahan
  template hanya terjadi lewat layar Menu, atau lewat "Simpan sebagai
  template" yang eksplisit.
