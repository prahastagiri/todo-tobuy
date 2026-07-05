import { formatAmount } from '../lib/format'

// Baris satu item (nama + jumlah + catatan) dengan slot aksi di kanan dan
// slot indikator (leading) di kiri. Dipakai di detail menu maupun daftar
// belanja. `dim` untuk meredupkan item (mis. status 'have').
export default function ItemRow({ item, leading, actions, dim = false, onClick }) {
  const amount = formatAmount(item)
  return (
    <div
      className={'item-row' + (dim ? ' item-row--dim' : '') + (onClick ? ' item-row--tap' : '')}
      onClick={onClick}
    >
      {leading && <div className="item-row__leading">{leading}</div>}
      <div className="item-row__main">
        <div className="item-row__name">{item.name}</div>
        {(amount || item.note) && (
          <div className="item-row__meta">
            {amount}
            {amount && item.note ? ' — ' : ''}
            {item.note && <span className="muted">{item.note}</span>}
          </div>
        )}
      </div>
      {actions && <div className="item-row__actions">{actions}</div>}
    </div>
  )
}
