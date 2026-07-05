// Nilai yang disarankan (spec Bagian 7). Disimpan sebagai teks bebas di DB,
// tapi UI menawarkan pilihan ini agar konsisten.

export const UNITS = [
  'kg',
  'gram',
  'ons',
  'biji',
  'buah',
  'butir',
  'ikat',
  'bungkus',
  'sisir',
  'papan',
  'potong',
  'sdm',
  'sdt',
  'secukupnya',
]

export const CATEGORIES = [
  'sayur',
  'daging',
  'bumbu',
  'sembako',
  'minuman',
  'lainnya',
]

// Urutan tampil kategori (yang tak dikenal ditaruh di akhir).
export function categoryRank(cat) {
  const i = CATEGORIES.indexOf(cat)
  return i === -1 ? CATEGORIES.length : i
}

// Kelompokkan item per kategori, urut sesuai CATEGORIES lalu urutan asli.
// Mengembalikan array [kategori, item[]].
export function groupByCategory(items) {
  const map = new Map()
  for (const it of items) {
    const key = it.category || ''
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(it)
  }
  return [...map.entries()].sort((a, b) => categoryRank(a[0]) - categoryRank(b[0]))
}
