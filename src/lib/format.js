// Format tampilan. DB menyimpan angka mentah; format "Rp 5.000" diurus di UI
// (spec Bagian 7).

export function formatRupiah(n) {
  if (n == null || n === '') return ''
  return 'Rp ' + Number(n).toLocaleString('id-ID')
}

// Angka takaran: buang nol berlebih (0.5 -> "0,5", 2 -> "2").
export function formatQty(n) {
  if (n == null || n === '') return ''
  return Number(n).toLocaleString('id-ID', { maximumFractionDigits: 3 })
}

// Ringkasan jumlah sebuah item: takaran dan/atau uang.
// Mis. "0,5 kg", "secukupnya", "Rp 5.000", atau "1 ons · Rp 5.000".
export function formatAmount(item) {
  const parts = []
  if (item.quantity != null && item.quantity !== '') {
    parts.push(formatQty(item.quantity) + (item.unit ? ' ' + item.unit : ''))
  } else if (item.unit) {
    // Mis. unit "secukupnya" tanpa angka.
    parts.push(item.unit)
  }
  if (item.budget != null && item.budget !== '') {
    parts.push(formatRupiah(item.budget))
  }
  return parts.join(' · ')
}
