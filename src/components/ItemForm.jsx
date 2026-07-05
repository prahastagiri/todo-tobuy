import { useState } from 'react'
import { UNITS, CATEGORIES } from '../lib/constants'

// Form item yang dipakai untuk menu_items MAUPUN shopping_list_items
// (bentuknya sama; spec Bagian 3.2 & 3.4). Tampil sebagai modal.
//
// Prinsip inti #2: jumlah = takaran (quantity+unit) ATAU uang (budget),
// dengan note untuk catatan. Boleh keduanya bila memang perlu.
//
// props:
//   initial  - nilai awal (untuk edit) atau {} (untuk tambah)
//   title    - judul modal
//   onSave(payload) - dipanggil dengan payload ternormalisasi
//   onCancel()
export default function ItemForm({ initial = {}, title = 'Item', onSave, onCancel }) {
  const [name, setName] = useState(initial.name ?? '')
  const [quantity, setQuantity] = useState(initial.quantity ?? '')
  const [unit, setUnit] = useState(initial.unit ?? '')
  const [budget, setBudget] = useState(initial.budget ?? '')
  const [note, setNote] = useState(initial.note ?? '')
  const [category, setCategory] = useState(initial.category ?? '')
  const [error, setError] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Nama item wajib diisi.')
      return
    }
    // Normalisasi: string kosong -> null, angka -> number.
    const payload = {
      name: name.trim(),
      quantity: quantity === '' ? null : Number(quantity),
      unit: unit || null,
      budget: budget === '' ? null : Number(budget),
      note: note.trim() || null,
      category: category || null,
    }
    onSave(payload)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <form
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h2 className="modal__title">{title}</h2>

        <label className="field">
          <span className="field__label">Nama</span>
          <input
            className="input"
            value={name}
            autoFocus
            placeholder="mis. Dada ayam"
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <fieldset className="field">
          <span className="field__label">Takaran</span>
          <div className="row">
            <input
              className="input"
              type="number"
              step="any"
              min="0"
              inputMode="decimal"
              placeholder="jumlah"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              style={{ flex: '0 0 40%' }}
            />
            <select
              className="input"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              <option value="">— satuan —</option>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </fieldset>

        <label className="field">
          <span className="field__label">
            atau Budget (Rp) <span className="muted">— beli berdasar uang</span>
          </span>
          <input
            className="input"
            type="number"
            step="any"
            min="0"
            inputMode="numeric"
            placeholder="mis. 5000"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">Catatan</span>
          <input
            className="input"
            value={note}
            placeholder='mis. "atau 1/4 kg", "yang muda"'
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">Kategori</span>
          <select
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">— pilih —</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        {error && <p style={{ color: 'var(--danger)', margin: 0 }}>{error}</p>}

        <div className="row" style={{ marginTop: 8 }}>
          <button type="button" className="btn btn--block" onClick={onCancel}>
            Batal
          </button>
          <button type="submit" className="btn btn--primary btn--block">
            Simpan
          </button>
        </div>
      </form>
    </div>
  )
}
