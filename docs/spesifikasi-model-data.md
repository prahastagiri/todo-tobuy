# Spesifikasi Model Data — Aplikasi Belanja

Dokumen ini menjelaskan model data untuk aplikasi todo belanja: bagaimana
menu (template), daftar belanja, dan riwayat saling terhubung, serta cara
berbagi template antar-pengguna. Ditujukan untuk dibaca oleh pengembang
atau agent lain yang akan menerapkannya.

Target database: **Supabase (PostgreSQL)**.
File SQL siap-jalan tersedia di `schema.sql`.

---

## 1. Konsep inti (baca ini dulu)

Empat prinsip berikut menentukan seluruh desain. Agent yang menerapkan
skema ini WAJIB memahaminya, karena banyak keputusan kolom bergantung
padanya.

1. **Template hanya menyalin, tidak mengikat.**
   Saat item dari sebuah menu ditambahkan ke daftar belanja, item itu
   DISALIN menjadi baris baru yang bebas diedit. Mengubah jumlah atau
   status item di daftar belanja TIDAK BOLEH mengubah template asalnya.
   Prinsip yang sama berlaku saat berbagi template ke pengguna lain:
   penerima mendapat SALINAN, bukan akses ke data aslimu (lihat Bagian 8).

2. **Jumlah bisa berupa takaran ATAU uang.**
   Jangan simpan jumlah sebagai satu teks bebas seperti "1/2 kg".
   Ada dua cara menyatakan jumlah, dan sebuah item boleh pakai salah satu:
   - **Takaran** — `quantity` (angka) + `unit` (satuan). Mis. "½ kg" →
     `quantity = 0.5`, `unit = 'kg'`. "Cabai 1 ons" → `quantity = 1`,
     `unit = 'ons'`.
   - **Uang** — `budget` (rupiah yang ingin dibelanjakan). Ini untuk
     belanja yang takarannya uang, bukan berat. Mis. "sayur 5 ribu" →
     `budget = 5000`, sementara `quantity` dan `unit` dibiarkan kosong.
   - `note` (catatan opsional) untuk hal seperti "atau 1/4 kg" atau
     "yang muda".

3. **Item punya status, bukan sekadar ada/tidak ada.**
   Setiap item di daftar belanja punya salah satu status:
   `need` (perlu dibeli), `have` (sudah punya di rumah, dilewati),
   `cart` (sudah masuk keranjang). Item "sudah punya" tetap tersimpan
   supaya template tetap lengkap, tapi dikecualikan dari yang harus dibeli.

4. **Riwayat = daftar belanja yang sudah selesai.**
   Tidak ada tabel riwayat terpisah. Sebuah daftar belanja dengan
   `status = 'done'` beserta item-itemnya SUDAH menjadi catatan riwayat.
   Karena item daftar adalah salinan bebas, catatan "kemarin masak apa"
   tetap akurat meski template-nya diubah kemudian.

---

## 2. Ringkasan tabel

| Tabel | Fungsi | Sifat |
|---|---|---|
| `menus` | Template menu yang dipakai ulang (mis. "Opor Ayam") | Stabil, jarang berubah; bisa dibagikan |
| `menu_items` | Bahan-bahan di dalam sebuah template | Stabil |
| `shopping_lists` | Satu sesi belanja / todo aktif | Punya status; jadi riwayat saat selesai |
| `shopping_list_items` | Salinan bebas item di daftar aktif | Diedit per sesi belanja |

`menu_items` dan `shopping_list_items` sengaja dipisah walau bentuknya
mirip: yang pertama adalah template stabil, yang kedua adalah salinan
per-sesi yang bisa diubah. Inilah wujud dari prinsip nomor 1.

---

## 3. Detail tabel

### 3.1 `menus`

Template menu milik seorang pengguna.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | uuid, PK | Otomatis (`gen_random_uuid()`) |
| `user_id` | uuid, FK → `auth.users` | Pemilik. Wajib untuk keamanan (RLS) |
| `name` | text | Nama menu, mis. "Opor Ayam" |
| `share_code` | text, unik, boleh kosong | Kode berbagi. Kosong = tidak dibagikan. Lihat Bagian 8 |
| `created_at` | timestamptz | Otomatis |
| `updated_at` | timestamptz | Otomatis (via trigger) |

### 3.2 `menu_items`

Bahan-bahan di dalam sebuah template. Dihapus otomatis jika menunya dihapus.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | uuid, PK | |
| `menu_id` | uuid, FK → `menus` | Induknya. `on delete cascade` |
| `name` | text | Nama bahan, mis. "Bumbu opor instan" |
| `quantity` | numeric, boleh kosong | Angka takaran, mis. `0.5`. Kosong jika pakai `budget` atau "secukupnya" |
| `unit` | text, boleh kosong | Satuan: `kg`, `ons`, `gram`, `biji`, `ikat`, `bungkus`, dll |
| `budget` | numeric, boleh kosong | Rupiah yang ingin dibelanjakan, mis. `5000` untuk "sayur 5rb" |
| `note` | text, boleh kosong | Catatan, mis. "atau 1/4 kg", "yang muda" |
| `category` | text, boleh kosong | Kategori: `sayur`, `daging`, `bumbu`, dll |
| `sort_order` | integer | Urutan tampil (default 0) |
| `created_at` | timestamptz | Otomatis |

Aturan takaran vs uang: umumnya sebuah item pakai `quantity`+`unit`
ATAU `budget`, tidak keduanya. Tapi keduanya boleh diisi bila memang
perlu (mis. "cabai 1 ons, kira-kira 5rb").

### 3.3 `shopping_lists`

Satu sesi belanja. Saat selesai, baris ini menjadi catatan riwayat.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | uuid, PK | |
| `user_id` | uuid, FK → `auth.users` | Pemilik |
| `name` | text | Nama daftar, mis. "Belanja Sup Ayam" |
| `status` | text | `draft` \| `shopping` \| `done`. Default `draft` |
| `created_at` | timestamptz | Otomatis |
| `updated_at` | timestamptz | Otomatis (via trigger) |
| `completed_at` | timestamptz, boleh kosong | Diisi saat status jadi `done` |

Arti `status`:
- `draft` — masih disusun, bebas diedit dan ditambah template.
- `shopping` — "mode belanja / terkunci". Daftar dibekukan; yang boleh
  berubah hanya status item (mencentang saat masuk keranjang). Ini
  padanan dari fitur "kunci" yang kamu maksud.
- `done` — selesai. Menjadi catatan riwayat.

### 3.4 `shopping_list_items`

Salinan bebas item di daftar aktif. Inti dari aplikasi ini.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | uuid, PK | |
| `list_id` | uuid, FK → `shopping_lists` | Induknya. `on delete cascade` |
| `source_menu_id` | uuid, FK → `menus`, boleh kosong | Asal template (REFERENSI SAJA). `on delete set null` |
| `name` | text | Disalin dari template, boleh diedit |
| `quantity` | numeric, boleh kosong | Takaran, bisa diubah per sesi |
| `unit` | text, boleh kosong | Satuan |
| `budget` | numeric, boleh kosong | Rupiah yang ingin dibelanjakan (beli berdasar uang) |
| `note` | text, boleh kosong | Catatan |
| `category` | text, boleh kosong | Kategori (untuk mengurutkan belanja per lapak) |
| `status` | text | `need` \| `have` \| `cart`. Default `need` |
| `sort_order` | integer | Urutan tampil |
| `created_at` | timestamptz | Otomatis |
| `updated_at` | timestamptz | Otomatis (via trigger) |

Catatan penting tentang `source_menu_id`: kolom ini hanya penanda "item
ini dulu berasal dari menu X". Ia TIDAK mengikat. Kalau menu X dihapus,
nilainya jadi `null` (`on delete set null`) dan item tetap ada di daftar.

Arti `status`:
- `need` — perlu dibeli. Inilah yang masuk daftar aktif yang dibawa ke pasar.
- `have` — sudah punya di rumah. Tetap tampil (dicoret/diredupkan), tapi
  dikecualikan dari yang harus dibeli.
- `cart` — sudah masuk keranjang (dicentang saat belanja).

---

## 4. Alur kerja (logika aplikasi)

Bagian ini menjelaskan operasi utama sebagai langkah query. Semua ini
adalah logika aplikasi di atas skema, bukan bagian dari skema itu sendiri.

### 4.1 Menambahkan template ke daftar belanja

Untuk tiap baris di `menu_items` milik menu terpilih, buat salinan di
`shopping_list_items`:

```
INSERT INTO shopping_list_items
  (list_id, source_menu_id, name, quantity, unit, budget, note, category, status)
SELECT
  :list_id, mi.menu_id, mi.name, mi.quantity, mi.unit, mi.budget, mi.note, mi.category, 'need'
FROM menu_items mi
WHERE mi.menu_id = :menu_id;
```

**Gabungkan item kembar.** Sebelum menyisipkan, cek apakah sudah ada item
dengan `name` dan `unit` yang sama di daftar tersebut. Jika ada dan
satuannya cocok, tawarkan untuk menjumlahkan `quantity` alih-alih membuat
baris kedua. (Ini keputusan UX; lakukan di sisi aplikasi.)

### 4.2 Menandai "sudah punya di rumah"

```
UPDATE shopping_list_items SET status = 'have' WHERE id = :item_id;
```

Daftar aktif yang perlu dibeli = filter `status = 'need'`. Item `have`
tetap ditampilkan tapi diredupkan.

### 4.3 Mengubah jumlah (mis. ibu minta tambah bawang)

```
UPDATE shopping_list_items SET quantity = :qty_baru WHERE id = :item_id;
```

Ini hanya mengubah daftar sesi ini, BUKAN template. Jangan pernah
menulis balik ke `menu_items` secara otomatis dari sini.

### 4.4 Mode belanja / kunci, lalu centang di keranjang

```
UPDATE shopping_lists SET status = 'shopping' WHERE id = :list_id;   -- kunci
UPDATE shopping_list_items SET status = 'cart' WHERE id = :item_id;  -- centang
```

Saat `status = 'shopping'`, UI membatasi edit hanya ke perubahan status item.

### 4.5 Menyelesaikan daftar (menjadi riwayat)

```
UPDATE shopping_lists
SET status = 'done', completed_at = now()
WHERE id = :list_id;
```

### 4.6 Melihat riwayat

```
SELECT * FROM shopping_lists WHERE status = 'done' ORDER BY completed_at DESC;
-- lalu ambil itemnya:
SELECT * FROM shopping_list_items WHERE list_id = :list_id ORDER BY sort_order;
```

### 4.7 Menyimpan daftar selesai sebagai template baru / memperbarui template

Buat menu baru dari item daftar:

```
INSERT INTO menus (user_id, name) VALUES (:user_id, :nama_menu) RETURNING id;  -- :menu_baru
INSERT INTO menu_items (menu_id, name, quantity, unit, budget, note, category, sort_order)
SELECT :menu_baru, name, quantity, unit, budget, note, category, sort_order
FROM shopping_list_items
WHERE list_id = :list_id AND status <> 'have';   -- item yang cuma "sudah punya" boleh diabaikan
```

Untuk memperbarui template lama: hapus `menu_items` lama untuk menu itu,
lalu sisipkan ulang dari item daftar. Selalu tindakan yang DISENGAJA oleh
pengguna, tidak pernah otomatis.

---

## 5. Keamanan (Row Level Security)

Supabase mewajibkan RLS. Setiap pengguna hanya boleh melihat datanya
sendiri. Tabel induk (`menus`, `shopping_lists`) dicek lewat `user_id`.
Tabel anak (`menu_items`, `shopping_list_items`) mewarisi kepemilikan
lewat induknya. Kebijakan lengkap ada di `schema.sql`.

Karena RLS memblokir pembacaan lintas-pengguna, berbagi template TIDAK
bisa dilakukan dengan sekadar membaca menu orang lain. Diperlukan sebuah
fungsi database khusus yang aman — lihat Bagian 8.

---

## 6. Autentikasi (login)

Karena RLS bergantung pada `auth.uid()` (ID pengguna yang sedang login),
aplikasi ini mengharuskan pengguna login. Login jugalah yang membuat
fitur "buka di mana saja" bekerja: satu akun dipakai di HP dan laptop,
sehingga data yang sama muncul di kedua perangkat.

Login tidak perlu rumit. Supabase Auth menyediakannya. Untuk aplikasi
pribadi, disarankan salah satu:
- **Magic link** — pengguna memasukkan email, menerima tautan, klik,
  langsung masuk. Tanpa kata sandi.
- **Login Google** — satu ketukan dengan akun Google.

Sesi biasanya tersimpan, jadi pengguna tidak perlu login berulang-ulang.

---

## 7. Satuan dan kategori yang disarankan

Disimpan sebagai teks bebas agar sederhana. Nilai yang disarankan supaya
konsisten:

- Satuan (`unit`): `kg`, `gram`, `ons` (1 ons = 100 gram), `biji`,
  `buah`, `butir`, `ikat`, `bungkus`, `sisir`, `papan`, `potong`,
  `sdm`, `sdt`, `secukupnya`.
- Kategori (`category`): `sayur`, `daging`, `bumbu`, `sembako`,
  `minuman`, `lainnya`.

Untuk belanja berdasar uang, JANGAN memakai satuan seperti "rupiah" atau
"rb". Gunakan kolom `budget` (mis. `budget = 5000`) dan biarkan
`quantity`/`unit` kosong. Format tampilan (mis. "Rp 5.000" atau "5rb")
diurus di sisi aplikasi.

Contoh pemetaan instruksi ibu ke data:

| Instruksi | quantity | unit | budget | note |
|---|---|---|---|---|
| Dada ayam 1/2 kg | 0.5 | kg | — | — |
| Cabai 1 ons | 1 | ons | — | — |
| Wortel 2 biji | 2 | biji | — | — |
| Kentang 3 biji atau 1/4 kg | 3 | biji | — | atau 1/4 kg |
| Sayur 5rb | — | — | 5000 | — |
| Bumbu opor instan 1 bungkus | 1 | bungkus | — | — |

Jika kelak ingin lebih rapi, satuan dan kategori bisa dipindah ke tabel
lookup tersendiri — tapi itu peningkatan opsional, tidak perlu di versi
pertama.

---

## 8. Berbagi template ke pengguna lain

Skenario: kamu ingin memberi orang tuamu template-mu, mis. saat kamu
pindah rumah. Model yang dipilih adalah **salin (copy)**, sesuai prinsip
nomor 1: penerima mendapat salinannya sendiri yang bebas mereka ubah,
bukan akses ke data aslimu. Ini justru cocok untuk skenario berpisah —
setelah tersalin, kedua salinan hidup mandiri.

### 8.1 Alur berbagi

1. Pemilik menandai sebuah menu sebagai dapat-dibagikan dengan mengisi
   `share_code` berupa string acak (mis. hasil `gen_random_uuid()` atau
   kode pendek buatan aplikasi). Ini dilakukan lewat update biasa dan
   diizinkan RLS karena menu itu miliknya sendiri:

   ```
   UPDATE menus SET share_code = :kode_acak WHERE id = :menu_id;
   ```

2. Aplikasi membuat tautan atau menampilkan kode, mis.
   `https://appmu.com/import?code=KODE_ACAK`, lalu pemilik mengirimkannya
   (mis. lewat WhatsApp).

3. Penerima (orang tua) login, membuka tautan, dan aplikasi memanggil
   fungsi `import_shared_menu(kode)`. Fungsi ini menyalin menu beserta
   item-itemnya ke akun penerima, lalu mengembalikan `id` menu baru.

4. Setelah tersalin, dua salinan itu independen. Perubahan di satu tidak
   memengaruhi yang lain.

### 8.2 Kenapa perlu fungsi khusus

RLS memblokir penerima membaca menu milik pemilik. Karena itu penyalinan
dilakukan oleh fungsi database `import_shared_menu` yang berjalan dengan
hak `security definer` (bisa menembus RLS), TAPI dibatasi ketat: ia hanya
menyalin menu yang `share_code`-nya cocok (artinya memang sengaja
dibagikan), dan hanya menyalin ke akun si pemanggil (`auth.uid()`).
Definisi lengkap fungsi ini ada di `schema.sql`.

### 8.3 Mencabut berbagi

Set `share_code` kembali ke `null`. Kode lama otomatis tidak berlaku,
tapi salinan yang sudah terlanjur dibuat tetap ada pada penerima (memang
begitu sifat model salin).

### 8.4 Alternatif: berbagi hidup (opsional, lebih rumit)

Jika kelak ingin orang tua melihat perubahan template secara real-time
(bukan salinan sekali jadi), diperlukan tabel tambahan `menu_shares`
(memetakan `menu_id` → user penerima) plus kebijakan RLS tambahan yang
mengizinkan penerima membaca menu yang dibagikan kepadanya. Ini TIDAK
disarankan untuk versi pertama; untuk skenario pindah rumah, model salin
sudah lebih tepat dan jauh lebih sederhana.

---

## 9. Catatan untuk mode offline (PWA)

Aplikasi ini akan dipakai di pasar yang sinyalnya buruk, jadi:

- Setiap tabel punya `updated_at`. Untuk sinkronisasi, klien menyimpan
  data secara lokal dan mengirim perubahan saat online kembali, dengan
  strategi sederhana "penulisan terakhir menang" (last-write-wins)
  berdasarkan `updated_at`.
- `id` berupa `uuid` sengaja dipilih agar klien bisa membuat baris baru
  saat offline (menghasilkan uuid sendiri) tanpa menunggu server.

Ini adalah panduan implementasi, bukan bagian dari skema SQL.

---

## 10. Menyimpan konteks proyek (ingatan lintas sesi)

Claude — baik di sesi chat maupun di Claude Code — TIDAK otomatis
mengingat percakapan sebelumnya. Karena itu, konteks proyek harus
disimpan DI DALAM repositori sebagai file yang bisa dibaca ulang kapan
saja. Inilah "ingatan" proyek. Setiap sesi baru, Claude membaca file-file
ini lebih dulu untuk memahami aplikasi tanpa perlu dijelaskan ulang.

### 10.1 Struktur direktori yang disarankan

```
proyek/
├── CLAUDE.md                         <- konteks utama, dibaca OTOMATIS oleh Claude Code
├── docs/
│   ├── spesifikasi-model-data.md     <- file ini
│   ├── schema.sql                    <- skema database
│   ├── alur-layar.md                 <- urutan & fungsi tiap layar (dibuat menyusul)
│   └── keputusan.md                  <- catatan keputusan penting (tumbuh seiring waktu)
└── ... (kode aplikasi)
```

### 10.2 Peran tiap file

- `CLAUDE.md` — Diletakkan di akar proyek dan dibaca otomatis oleh Claude
  Code di setiap sesi. Isinya ringkas: gambaran aplikasi, tumpukan
  teknologi, prinsip inti, ringkasan model data, dan penunjuk ke dokumen
  di `docs/`. Ini PETA, bukan ensiklopedia — jaga tetap pendek.
- `docs/` — Dokumen rinci yang jarang berubah (spesifikasi, skema, alur layar).
- `docs/keputusan.md` — INI ingatan yang sesungguhnya: catatan "kami
  memutuskan X karena Y" yang bertambah setiap ada keputusan baru. Entri
  terbaru di atas; jangan hapus entri lama.

### 10.3 Aturan pemeliharaan (penting)

- Sebelum mengubah apa pun, Claude/agent WAJIB membaca `CLAUDE.md` dan
  `docs/` lebih dulu, supaya paham alasan di balik desain yang ada dan
  tidak melanggar prinsip inti (Bagian 1).
- Setiap kali sebuah keputusan desain berubah (mis. menambah kolom,
  mengubah alur), perbarui dokumen terkait DAN tambahkan entri bertanggal
  di `docs/keputusan.md`. Dokumen yang usang lebih berbahaya daripada
  tidak ada dokumen, karena menyesatkan.

File `CLAUDE.md` dan `docs/keputusan.md` awal sudah disediakan bersama
dokumen ini — tinggal disalin ke proyek dan diperbarui seiring waktu.
