-- ============================================================
-- Skema database: Aplikasi belanja (menu, daftar, riwayat, berbagi)
-- Target: Supabase (PostgreSQL)
-- Jalankan di Supabase SQL Editor. Aman dijalankan pada proyek baru.
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABEL
-- ------------------------------------------------------------

-- Template menu yang bisa dipakai ulang (mis. "Opor Ayam")
create table if not exists public.menus (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  share_code text unique,        -- kode berbagi; kosong = tidak dibagikan
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bahan-bahan di dalam sebuah template
create table if not exists public.menu_items (
  id         uuid primary key default gen_random_uuid(),
  menu_id    uuid not null references public.menus (id) on delete cascade,
  name       text not null,
  quantity   numeric,            -- takaran; kosong jika pakai budget / "secukupnya"
  unit       text,               -- kg, ons, gram, biji, ikat, bungkus, ...
  budget     numeric,            -- rupiah yang ingin dibelanjakan (beli berdasar uang), mis. 5000
  note       text,               -- mis. "atau 1/4 kg", "yang muda"
  category   text,               -- sayur, daging, bumbu, ...
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Satu sesi belanja / todo. Saat 'done', jadi catatan riwayat.
create table if not exists public.shopping_lists (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null,
  status       text not null default 'draft'
               check (status in ('draft', 'shopping', 'done')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  completed_at timestamptz          -- diisi saat status jadi 'done'
);

-- SALINAN BEBAS item di daftar aktif (inti aplikasi)
create table if not exists public.shopping_list_items (
  id             uuid primary key default gen_random_uuid(),
  list_id        uuid not null references public.shopping_lists (id) on delete cascade,
  source_menu_id uuid references public.menus (id) on delete set null,  -- asal template (referensi saja)
  name           text not null,
  quantity       numeric,
  unit           text,
  budget         numeric,         -- rupiah yang ingin dibelanjakan (beli berdasar uang)
  note           text,
  category       text,
  status         text not null default 'need'
                 check (status in ('need', 'have', 'cart')),  -- perlu / sudah punya / sudah di keranjang
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. INDEKS
-- ------------------------------------------------------------
create index if not exists idx_menu_items_menu    on public.menu_items (menu_id);
create index if not exists idx_list_items_list    on public.shopping_list_items (list_id);
create index if not exists idx_lists_user_status  on public.shopping_lists (user_id, status);
create index if not exists idx_menus_user         on public.menus (user_id);

-- ------------------------------------------------------------
-- 3. TRIGGER updated_at
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_menus_updated on public.menus;
create trigger trg_menus_updated
  before update on public.menus
  for each row execute function public.set_updated_at();

drop trigger if exists trg_lists_updated on public.shopping_lists;
create trigger trg_lists_updated
  before update on public.shopping_lists
  for each row execute function public.set_updated_at();

drop trigger if exists trg_list_items_updated on public.shopping_list_items;
create trigger trg_list_items_updated
  before update on public.shopping_list_items
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- Setiap pengguna hanya boleh melihat datanya sendiri.
-- ------------------------------------------------------------
alter table public.menus                enable row level security;
alter table public.menu_items           enable row level security;
alter table public.shopping_lists       enable row level security;
alter table public.shopping_list_items  enable row level security;

-- menus: pemilik = user_id
drop policy if exists menus_owner on public.menus;
create policy menus_owner on public.menus
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- menu_items: ikut kepemilikan menu induk
drop policy if exists menu_items_owner on public.menu_items;
create policy menu_items_owner on public.menu_items
  for all
  using      (exists (select 1 from public.menus m where m.id = menu_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.menus m where m.id = menu_id and m.user_id = auth.uid()));

-- shopping_lists: pemilik = user_id
drop policy if exists lists_owner on public.shopping_lists;
create policy lists_owner on public.shopping_lists
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- shopping_list_items: ikut kepemilikan list induk
drop policy if exists list_items_owner on public.shopping_list_items;
create policy list_items_owner on public.shopping_list_items
  for all
  using      (exists (select 1 from public.shopping_lists l where l.id = list_id and l.user_id = auth.uid()))
  with check (exists (select 1 from public.shopping_lists l where l.id = list_id and l.user_id = auth.uid()));

-- ------------------------------------------------------------
-- 5. BERBAGI TEMPLATE (model salin yang aman)
--
-- Alur:
--   1) Pemilik menandai menu sebagai dapat-dibagikan:
--        update menus set share_code = <kode acak> where id = <menu>;
--      (diizinkan oleh policy menus_owner karena menu miliknya sendiri)
--   2) Pemilik mengirim kode/tautan berisi share_code ke penerima.
--   3) Penerima (login) memanggil: select import_shared_menu('<kode>');
--
-- Fungsi ini 'security definer' sehingga bisa menembus RLS, TAPI dibatasi:
-- hanya menyalin menu yang share_code-nya cocok, dan hanya ke akun pemanggil.
-- ------------------------------------------------------------
create or replace function public.import_shared_menu(p_share_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_src         public.menus%rowtype;
  v_new_menu_id uuid;
begin
  -- pemanggil harus login
  if auth.uid() is null then
    raise exception 'Harus login untuk mengimpor menu';
  end if;

  -- cari menu yang dibagikan lewat kode ini
  select * into v_src
  from public.menus
  where share_code = p_share_code;

  if not found then
    raise exception 'Kode berbagi tidak ditemukan atau sudah dicabut';
  end if;

  -- buat salinan menu milik si pengimpor (tanpa membawa share_code)
  insert into public.menus (user_id, name)
  values (auth.uid(), v_src.name)
  returning id into v_new_menu_id;

  -- salin semua itemnya
  insert into public.menu_items
    (menu_id, name, quantity, unit, budget, note, category, sort_order)
  select
    v_new_menu_id, name, quantity, unit, budget, note, category, sort_order
  from public.menu_items
  where menu_id = v_src.id;

  return v_new_menu_id;
end;
$$;

-- Izinkan pengguna yang login memanggil fungsi impor
grant execute on function public.import_shared_menu(text) to authenticated;

-- ============================================================
-- 6. CONTOH DATA (opsional) — template "Opor Ayam"
-- Ganti '00000000-0000-0000-0000-000000000000' dengan user_id asli,
-- lalu hapus baris komentar untuk menjalankannya.
-- Baris terakhir memakai contoh beli-berdasar-uang (budget = 5000).
-- ============================================================
-- with m as (
--   insert into public.menus (user_id, name)
--   values ('00000000-0000-0000-0000-000000000000', 'Opor Ayam')
--   returning id
-- )
-- insert into public.menu_items (menu_id, name, quantity, unit, budget, note, category, sort_order)
-- select m.id, x.name, x.quantity, x.unit, x.budget, x.note, x.category, x.sort_order
-- from m, (values
--   ('Bumbu opor instan', 1,    'bungkus', null,  null,        'bumbu',  0),
--   ('Dada ayam',         0.5,  'kg',      null,  null,        'daging', 1),
--   ('Kentang',           3,    'biji',    null,  'atau 1/4 kg','sayur', 2),
--   ('Cabai',             1,    'ons',     null,  null,        'bumbu',  3),
--   ('Sayur',             null, null,      5000,  null,        'sayur',  4)
-- ) as x(name, quantity, unit, budget, note, category, sort_order);
