import { createClient } from '@supabase/supabase-js'

// Kredensial diambil dari .env.local (lihat .env.example).
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Flag agar UI bisa menampilkan pesan ramah saat env belum diisi,
// alih-alih crash. Berguna selama scaffold sebelum proyek Supabase dibuat.
export const isSupabaseConfigured = Boolean(url && anonKey)

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diisi. ' +
      'Salin .env.example -> .env.local dan isi dari Supabase Dashboard.'
  )
}

// Saat belum dikonfigurasi, pakai nilai dummy agar createClient tidak
// melempar error. Panggilan jaringan tetap gagal, tapi aplikasi bisa render.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key'
)
