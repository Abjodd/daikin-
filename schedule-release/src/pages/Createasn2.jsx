import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import PageLayout from '../layouts/Pagelayout.jsx'
import { createAsnApi, uploadAllAttachments } from '../services/Createasnsch.js'

// Used only when this page is opened directly (no router state), so it still renders in mock mode.
// Matches an agreement in services/.../mockData.js that has confirmed lines.
const MOCK_FALLBACK_AGREEMENT = { id: '5500012345', plant: '1001' }

// ─── CONSTANTS ──────────────────────────────────────────────────
const ALLOWED_EXTENSIONS = ['pdf', 'xls', 'xlsx']
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
const isAllowedFile = (file) => {
  const ext = file.name.split('.').pop()?.toLowerCase()
  return ALLOWED_EXTENSIONS.includes(ext) || ALLOWED_MIME_TYPES.includes(file.type)
}

const PACKAGING_TYPES = [
  'HDPE Bags',
  'Jumbo Bags (FIBC)',
  'Corrugated Boxes',
  'Plastic Trays',
  'ESD Trays',
  'Thermoformed Trays',
  'Plastic Crates',
  'Foldable Plastic Crates',
  'Tote Boxes',
  'Bin Boxes',
  'Wooden Crates',
  'Steel Crates',
  'Foam-lined Crates',
  'Steel Pallets',
  'Wooden Pallets',
  'Drums',
  'Barrels',
  'IBC Containers',
  'Metal Racks',
  'A-frame Racks',
  'Coil Cradles',
  'Polybags',
  'Partition Boxes',
]

// Fields the user can edit — preserved across re-fetches (module scope: no re-creation per render)
const USER_EDITABLE_FIELDS = [
  'avlAsnQty', 'fgStock', 'supplierNetPrice', 'materialExpiry',
  'taxMismatch', 'packingMaterialType', 'packingMaterialQty',
  'packagingType', 'qtyPerPackaging', 'pdirNo', 'batches',
]

// ─── HELPERS ────────────────────────────────────────────────────
// Normalise 'YYYY-MM-DD', 'DD.MM.YYYY' or 'MMM DD, YYYY' to 'YYYY-MM-DD' (local time, no UTC shift). Returns null if unparseable.
const toIsoDate = (val) => {
  if (!val) return null
  const s = String(val).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  if (s.includes('.')) {
    const parts = s.split('.')
    if (parts.length === 3 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
    }
  }
  const dt = new Date(s + ' 12:00:00')
  if (isNaN(dt.getTime())) return null
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const d = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getAvlAsnQtyError(item) {
  const avl = parseFloat(item.avlAsnQty || 0)
  const created = parseFloat(item.asnCreated || 0)
  const total = parseFloat(item.totalQty || 0)
  if (isNaN(avl) || isNaN(created) || isNaN(total)) return null
  if (avl < 0) return 'Cannot be negative.'
  if (created + avl > total) return `exceeds Total Qty (${total}).`
  return null
}

const getFgStockError = (item) =>
  item.fgStock !== '' && item.fgStock != null && parseFloat(item.fgStock) < parseFloat(item.avlAsnQty || 0)
    ? `Must be >= ${item.avlAsnQty}`
    : null

// Batch summary text, e.g. "3 Boxes" or "2 batches"
const batchLabel = (item, count) =>
  item.packingMaterialType
    ? `${count} ${item.packingMaterialType}${count > 1 ? 's' : ''}`
    : `${count} batch${count > 1 ? 'es' : ''}`

// ─── TAX MISMATCH SWITCH ─────────────────────────────────────────
function TaxMismatchSwitch({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`inline-flex items-center h-6 px-1 rounded-full transition-all border text-[11px] font-bold select-none cursor-pointer ${
        value
          ? 'bg-[#0a6ed1] border-[#0a6ed1] text-white'
          : 'bg-[#f3f4f6] border-[#d1d5db] text-[#4b5563]'
      }`}
      style={{ minWidth: 54 }}
    >
      <span
        className={`w-4 h-4 rounded-full bg-white shadow-sm flex items-center justify-center text-[10px] transform transition-transform ${
          value ? 'translate-x-6 text-[#0a6ed1]' : 'translate-x-0 text-[#9ca3af]'
        }`}
      >
        {value ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : null}
      </span>
      <span className={`text-[10px] font-bold tracking-tight px-1.5 ${value ? '-order-1' : ''}`}>
        {value ? 'YES' : 'NO'}
      </span>
    </button>
  )
}

// ─── TAX BREAKDOWN POPUP (PORTAL-BASED — FLOATS ABOVE TABLE) ───────
function TaxBreakdownPopup({ item, rect, onClose }) {
  const popupRef = useRef(null)

  useEffect(() => {
    const handleOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onClose()
      }
    }
    const handleScroll = () => onClose()
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }

    document.addEventListener('mousedown', handleOutside)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleScroll)
    window.addEventListener('keydown', handleKey)

    return () => {
      document.removeEventListener('mousedown', handleOutside)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleScroll)
      window.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const qty = parseFloat(item.avlAsnQty || 1)
  const price = parseFloat(item.supplierNetPrice || item.netPrice || 0)
  const baseValue = qty * price

  const igstPer = parseFloat(item.igstPer ?? 0)
  const cgstPer = parseFloat(item.cgstPer ?? 9)
  const sgstPer = parseFloat(item.sgstPer ?? 9)

  const igstAmt = item.igst && Number(item.igst) > 0 ? Number(item.igst) : (baseValue * igstPer / 100)
  const cgstAmt = item.cgst && Number(item.cgst) > 0 ? Number(item.cgst) : (baseValue * cgstPer / 100)
  const sgstAmt = item.sgst && Number(item.sgst) > 0 ? Number(item.sgst) : (baseValue * sgstPer / 100)

  // Calculate viewport position directly above button (or below if near top)
  const spaceAbove = rect ? rect.top : 200
  const showBelow = spaceAbove < 130
  const top = rect ? (showBelow ? rect.bottom + 8 : rect.top - 120) : 200
  const left = rect ? Math.max(12, Math.min(window.innerWidth - 340, rect.left + rect.width / 2 - 160)) : 200

  return createPortal(
    <div
      ref={popupRef}
      style={{
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        zIndex: 999999,
        minWidth: 320,
      }}
      className="bg-white border border-[#cfd8e3] rounded-xl shadow-2xl p-0 overflow-hidden text-[12px] anim-fade"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-[#f8fafc] border-b border-[#e2e8f0] px-3 py-2 flex items-center justify-between">
        <span className="font-bold text-[#0f172a] text-[11px] uppercase tracking-wider">Tax Breakdown</span>
        <button
          type="button"
          onClick={onClose}
          className="text-[#94a3b8] hover:text-[#0f172a] text-[16px] font-bold leading-none cursor-pointer p-0.5"
          title="Close"
        >
          &times;
        </button>
      </div>
      <table className="w-full text-center border-collapse">
        <thead>
          <tr className="bg-[#f1f5f9] text-[#475569] text-[11px] font-bold border-b border-[#e2e8f0]">
            <th className="py-2 px-2.5">HSN/SAC</th>
            <th className="py-2 px-2.5">IGST</th>
            <th className="py-2 px-2.5">CGST</th>
            <th className="py-2 px-2.5">SGST / UGST</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-[#f1f5f9] font-medium text-[#1e293b]">
            <td className="py-2.5 px-2.5 font-bold text-[#0a6ed1]">{item.hsnCode || item.hsn || '84159000'}</td>
            <td className="py-2.5 px-2.5">{igstAmt.toFixed(2)} ({igstPer}%)</td>
            <td className="py-2.5 px-2.5">{cgstAmt.toFixed(2)} ({cgstPer}%)</td>
            <td className="py-2.5 px-2.5">{sgstAmt.toFixed(2)} ({sgstPer}%)</td>
          </tr>
        </tbody>
      </table>
      <div className="px-3 py-2 bg-[#f8fafc] flex justify-between items-center text-[11px] text-[#475569]">
        <span>Total Tax: <strong className="text-[#0f172a]">₹{(igstAmt + cgstAmt + sgstAmt).toFixed(2)}</strong></span>
        <span>Item Total: <strong className="text-[#0a6ed1]">₹{(baseValue + igstAmt + cgstAmt + sgstAmt).toFixed(2)}</strong></span>
      </div>
    </div>,
    document.body
  )
}

// ─── SPLIT BATCH MODAL ───────────────────────────────────────────
function SplitBatchModal({ open, item, onClose, onSave }) {
  const [rows, setRows] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open || !item) return
    setRows(item.batches && item.batches.length > 0
      ? item.batches.map((b, i) => ({ ...b, batchCode: String(i + 1) }))
      : [])
    setError(null)
  }, [open, item])

  if (!open || !item) return null

  const target = parseFloat(item.avlAsnQty || 0)
  const total = rows.reduce((s, r) => s + parseFloat(r.quantity || 0), 0)
  const remaining = target - total
  const isMatch = Math.abs(remaining) < 0.0001 && rows.length > 0
  const isOver = total > target

  const addRow = () => {
    const maxBatches = parseInt(item.packingMaterialQty, 10)
    if (!isNaN(maxBatches) && rows.length >= maxBatches) {
      setError(`Maximum ${maxBatches} batch rows allowed (matches Packing Material Qty).`)
      return
    }
    setRows([...rows, { id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, batchCode: String(rows.length + 1), quantity: '' }])
    setError(null)
  }
  const removeRow = (id) => {
    setRows(rows.filter(r => r.id !== id).map((r, i) => ({ ...r, batchCode: String(i + 1) })))
    setError(null)
  }
  const updateRow = (id, field, value) => { setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r)); setError(null) }

  const handleSave = () => {
    if (rows.length === 0) { onSave(item.itemNo, []); onClose(); return }
    const missing = rows.find(r => !r.quantity || parseFloat(r.quantity) <= 0)
    if (missing) { setError('Every batch row needs a positive Quantity.'); return }
    if (!isMatch) {
      setError(isOver
        ? `Sum of batch quantities (${total}) exceeds Permissible ASN Qty (${target}) by ${(total - target).toFixed(2)} ${item.totalUnit}.`
        : `Sum of batch quantities (${total}) is less than Permissible ASN Qty (${target}). Short by ${remaining.toFixed(2)} ${item.totalUnit}.`)
      return
    }
    onSave(item.itemNo, rows.map(r => ({ ...r, quantity: parseInt(r.quantity, 10) })))
    onClose()
  }

  const meterPct = target > 0 ? Math.min(100, (total / target) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 anim-fade" style={{ background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(2px)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[640px] max-h-[90vh] flex flex-col overflow-hidden anim-pop" onClick={e => e.stopPropagation()}>
        <div className="px-4 sm:px-6 py-4 border-b border-[#e5e5e5] bg-gradient-to-b from-[#fafbfc] to-white flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[12px] uppercase tracking-wider text-[#6a6d70] font-semibold mb-1">Split Quantity</div>
            <div className="text-[15px] sm:text-[16px] font-bold text-[#32363a] truncate">
              <span className="text-[#0a6ed1]">{item.materialNumber}</span>
              <span className="text-[#6a6d70] font-medium mx-2">·</span>
              <span>{item.materialName}</span>
            </div>
            <div className="text-[12px] text-[#6a6d70] mt-0.5">
              Item {item.itemNo} &middot; Permissible ASN Qty: <strong className="text-[#32363a]">{target} {item.totalUnit}</strong>
              {item.packingMaterialQty && <> &middot; Max batches: <strong className="text-[#32363a]">{item.packingMaterialQty}</strong></>}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#6a6d70] hover:text-[#cc1c14] hover:bg-[#fce8e6] transition-all flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-4 sm:px-6 pt-4 pb-2 flex items-center gap-3">
          <div className="flex-1 h-2 bg-[#f0f0f0] rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-300 ${isOver ? 'bg-[#cc1c14]' : isMatch ? 'bg-[#107e3e]' : 'bg-[#0a6ed1]'}`} style={{ width: `${meterPct}%` }} />
          </div>
          <div className="text-[13px] tabular-nums whitespace-nowrap">
            <span className={`font-bold ${isOver ? 'text-[#cc1c14]' : isMatch ? 'text-[#107e3e]' : 'text-[#32363a]'}`}>{total.toFixed(2)}</span>
            <span className="text-[#94a3b8] mx-1">/</span>
            <span className="text-[#6a6d70] font-semibold">{target.toFixed(2)} {item.totalUnit}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 min-h-0">
          <div className="rounded-lg border border-[#e5e5e5] overflow-hidden">
            <div className="flex items-center bg-[#fafbfc] border-b border-[#e5e5e5] text-[#6a6d70] text-[11px] uppercase tracking-wider font-semibold px-3 py-2.5">
              <div className="w-8 flex-shrink-0"></div>
              <div className="flex-1 px-2">SL No.</div>
              <div className="w-28 px-2 text-right">Quantity</div>
              <div className="w-10 flex-shrink-0"></div>
            </div>
            {rows.length === 0 ? (
              <div className="py-8 px-3 text-center text-[13px] text-[#6a6d70]">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" className="mx-auto mb-2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 12h8" /></svg>
                No data. Click <strong>+ Add Row</strong> below to create a batch.
              </div>
            ) : rows.map((r) => (
              <div key={r.id} className="flex items-center px-3 py-2 border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#fafbfc]">
                <div className="w-8 flex-shrink-0">
                  <button onClick={() => removeRow(r.id)} className="w-6 h-6 flex items-center justify-center rounded-full text-[#cc1c14] hover:bg-[#fce8e6] transition-all">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
                  </button>
                </div>
                <div className="flex-1 px-2">
                  <div className="w-full h-9 px-2.5 flex items-center text-[13px] font-semibold text-[#32363a] bg-[#f5f6f7] border border-[#e5e5e5] rounded">
                    {r.batchCode}
                  </div>
                </div>
                <div className="w-28 px-2">
                  <input type="number" min="0" step="1" value={r.quantity} onKeyDown={(e) => { if (e.key === '.' || e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') { e.preventDefault() } }} onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ''); updateRow(r.id, 'quantity', val) }} onWheel={e => e.target.blur()} placeholder="0" className="w-full h-9 px-2.5 text-[13px] text-right tabular-nums border border-[#d9d9d9] rounded bg-white focus:outline-none focus:border-[#0a6ed1] focus:ring-2 focus:ring-[#0a6ed1]/20 transition-all" />
                </div>
                <div className="w-10 flex-shrink-0 text-[11px] text-[#94a3b8] text-center">{item.totalUnit}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2 mt-3">
            <button onClick={addRow} className="flex items-center gap-1.5 px-3 h-9 text-[13px] font-semibold text-[#0a6ed1] bg-[#ebf5ff] border border-[#0a6ed1] rounded-lg hover:bg-[#d9ecff] hover:scale-[1.02] active:scale-[0.98] transition-all">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
              Add Row
            </button>
            {rows.length > 0 && !error && (
              isMatch ? (
                <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#107e3e]">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg>
                  Quantities balance
                </span>
              ) : isOver ? (
                <span className="text-[12px] font-semibold text-[#cc1c14]">Over by {(total - target).toFixed(2)}</span>
              ) : (
                <span className="text-[12px] font-semibold text-[#b45309]">{remaining.toFixed(2)} {item.totalUnit} remaining</span>
              )
            )}
          </div>
          {error && (
            <div className="mt-3 flex items-start gap-2 px-3 py-2 bg-[#fce8e6] text-[#cc1c14] rounded-lg text-[12.5px] font-medium anim-fade">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 py-3 border-t border-[#e5e5e5] flex justify-end gap-2 bg-[#fafbfc]">
          <button onClick={onClose} className="h-10 px-5 text-[14px] font-semibold text-[#32363a] bg-white border border-[#d9d9d9] rounded-lg hover:bg-[#f5f6f7] hover:scale-[1.02] active:scale-[0.98] transition-all">Close</button>
          <button onClick={handleSave} className="flex items-center gap-2 h-10 px-5 text-[14px] font-semibold text-white bg-[#0a6ed1] rounded-lg hover:bg-[#085caf] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /></svg>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── CONFIRMATION MODAL ──────────────────────────────────────────
function ConfirmationModal({ open, kind, title, message, details, primaryLabel, secondaryLabel, onPrimary, onSecondary }) {
  if (!open) return null
  const palette = {
    success: { ring: '#107e3e', soft: '#e8f5ec', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg> },
    error:   { ring: '#cc1c14', soft: '#fce8e6', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg> },
    confirm: { ring: '#0a6ed1', soft: '#ebf5ff', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg> },
    warning: { ring: '#b45309', soft: '#fef7e6', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> },
  }[kind] || { ring: '#0a6ed1', soft: '#ebf5ff', icon: null }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 anim-fade" style={{ background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(2px)' }} onClick={onSecondary || onPrimary}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] max-h-[90vh] flex flex-col overflow-hidden anim-pop" onClick={e => e.stopPropagation()}>
        <div className="px-5 sm:px-6 pt-6 pb-4 flex items-start gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: palette.soft, color: palette.ring }}>{palette.icon}</div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-[18px] font-bold text-[#32363a] tracking-tight">{title}</h3>
            {message && <p className="text-[13.5px] text-[#6a6d70] mt-1 leading-relaxed">{message}</p>}
          </div>
        </div>
        {details && <div className="px-5 sm:px-6 pb-2 overflow-y-auto"><div className="bg-[#fafbfc] border border-[#e5e5e5] rounded-lg px-4 py-3 text-[13px] text-[#32363a] space-y-1.5">{details}</div></div>}
        <div className="px-5 sm:px-6 py-4 border-t border-[#e5e5e5] flex justify-end gap-2 bg-[#fafbfc]">
          {secondaryLabel && <button onClick={onSecondary} className="h-10 px-5 text-[14px] font-semibold text-[#32363a] bg-white border border-[#d9d9d9] rounded-lg hover:bg-[#f5f6f7] hover:scale-[1.02] active:scale-[0.98] transition-all">{secondaryLabel}</button>}
          <button onClick={onPrimary} className="h-10 px-5 text-[14px] font-semibold text-white rounded-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md" style={{ background: palette.ring }}>{primaryLabel || 'OK'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── ATTACHMENTS PANEL (General / PDIR sub-tabs inside, like the PO page) ──
function AttachmentsPanel({ generalAttachments, pdirAttachments, onUpload, onRemove, onReject }) {
  const [activeSub, setActiveSub] = useState('general')
  const inputRef = useRef(null)

  const items = activeSub === 'general' ? generalAttachments : pdirAttachments

  const processFiles = (files) => {
    for (const file of files) {
      if (!isAllowedFile(file)) {
        onReject(`"${file.name}" is not allowed. Only PDF / Excel (.pdf, .xls, .xlsx).`)
        continue
      }
      onUpload({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        size: file.size,
        kind: activeSub,
        _file: file,
      })
    }
  }

  const handleFileChange = (e) => {
    processFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    processFiles(Array.from(e.dataTransfer.files))
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center gap-3 border-b border-[#e5e5e5] mb-5 overflow-x-auto">
        <button
          onClick={() => setActiveSub('general')}
          className={`pb-3 px-4 text-[13px] sm:text-[14px] font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1 ${
            activeSub === 'general'
              ? 'border-[#0a6ed1] text-[#0a6ed1]'
              : 'border-transparent text-[#6b7280] hover:text-[#111827]'
          }`}
        >
          General Attachments ({generalAttachments.length})
          {generalAttachments.length === 0 && <span className="text-[#cc1c14] text-[16px] font-bold leading-none">*</span>}
        </button>
        <button
          onClick={() => setActiveSub('pdir')}
          className={`pb-3 px-4 text-[13px] sm:text-[14px] font-bold border-b-2 whitespace-nowrap transition-all ${
            activeSub === 'pdir'
              ? 'border-[#0a6ed1] text-[#0a6ed1]'
              : 'border-transparent text-[#6b7280] hover:text-[#111827]'
          }`}
        >
          PDIR Attachments ({pdirAttachments.length})
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <span className="text-[12px] sm:text-[13px] text-[#6b7280]">
          Upload required invoices or inspection documents (PDF, XLS, XLSX). Files will be uploaded after the ASN is created.
        </span>
        <button
          onClick={() => inputRef.current?.click()}
          className="self-start sm:self-auto px-4 py-2 bg-[#0a6ed1] text-white text-[13px] font-semibold rounded-lg hover:bg-[#085caf] transition-all flex items-center gap-1.5"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Upload Document
        </button>
        <input ref={inputRef} type="file" multiple accept=".pdf,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleFileChange} className="hidden" />
      </div>

      {items.length === 0 ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="py-16 text-center border-2 border-dashed border-[#d1d5db] rounded-xl text-[#9ca3af] text-[13px]"
        >
          No {activeSub === 'general' ? 'general' : 'PDIR'} attachments added yet. Drop files here or click "Upload Document".
        </div>
      ) : (
        <div
          className="border border-[#e5e5e5] rounded-xl divide-y divide-[#f3f4f6] bg-white"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {items.map((att) => (
            <div key={att.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded bg-[#ebf5ff] text-[#0a6ed1] flex items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] sm:text-[14px] font-semibold text-[#1f2937] truncate">{att.name}</div>
                  <div className="text-[11px] text-[#6b7280]">{(att.size / 1024).toFixed(1)} KB · Pending upload</div>
                </div>
              </div>
              <button
                onClick={() => onRemove(att.id, activeSub)}
                className="text-[#dc2626] hover:bg-[#fee2e2] px-3 py-1 rounded text-[12px] font-medium flex-shrink-0"
                aria-label={`Remove ${att.name}`}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function CreateASN2({ agreement: propAgreement }) {
  const navigate = useNavigate()
  const location = useLocation()
  const agreement = location.state?.agreement || propAgreement || MOCK_FALLBACK_AGREEMENT

  // Top circular tab: 'info' | 'attachments'
  const [activeTab, setActiveTab] = useState('info')

  // Invoice inputs
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [invoiceAmount, setInvoiceAmount] = useState('')
  const [totalPacking, setTotalPacking] = useState('')

  // Filter bar
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [materialSearch, setMaterialSearch] = useState('')

  // Data
  const [items, setItems] = useState([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [itemsError, setItemsError] = useState(null)
  const [selectedItemNos, setSelectedItemNos] = useState([])
  const [pdirOptions, setPdirOptions] = useState([])
  const [packagingTypes] = useState(PACKAGING_TYPES)
  const [originalQties, setOriginalQties] = useState({})

  // Attachments
  const [generalAttachments, setGeneralAttachments] = useState([])
  const [pdirAttachments, setPdirAttachments] = useState([])

  // Modals / submission
  const [taxPopup, setTaxPopup] = useState(null)
  const [splitBatchItem, setSplitBatchItem] = useState(null)
  const [modal, setModal] = useState(null)
  const submitLock = useRef(false)
  const recoveryRef = useRef(null)
  const [submitting, setSubmitting] = useState(false)

  // Merge freshly fetched rows with what's already in state, keeping the user's edits
  const mergeFetched = (asnItems) => {
    setItems(prev => {
      const prevMap = Object.fromEntries(prev.map(i => [i.itemNo, i]))
      return asnItems.map(freshItem => {
        const existing = prevMap[freshItem.itemNo]
        if (!existing) return freshItem
        const preserved = {}
        USER_EDITABLE_FIELDS.forEach(f => { preserved[f] = existing[f] })
        return { ...freshItem, ...preserved }
      })
    })
    // Remember the first-seen permissible qty per row (used to hide zero-qty rows)
    setOriginalQties(prev => {
      const next = { ...prev }
      asnItems.forEach(i => {
        if (!(i.itemNo in next)) next[i.itemNo] = parseFloat(i.avlAsnQty || 0)
      })
      return next
    })
  }

  // Initial load
  useEffect(() => {
    if (!agreement?.id) return
    let cancelled = false
    setItemsLoading(true)
    setItemsError(null)
    Promise.all([
      createAsnApi.getEligibleItems({ scheduleNo: agreement.id }),
      createAsnApi.getPdirRefNos(agreement.id),
    ])
      .then(([asnItems, pdirNos]) => {
        if (cancelled) return
        mergeFetched(asnItems)
        setPdirOptions(pdirNos)
      })
      .catch(err => { if (!cancelled) setItemsError(err.message) })
      .finally(() => { if (!cancelled) setItemsLoading(false) })
    return () => { cancelled = true }
  }, [agreement?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Rows shown in the table: zero-qty rows hidden, then material + shipment-date filters applied
  const filteredItems = useMemo(() => {
    const available = items.filter(i => (originalQties[i.itemNo] ?? parseFloat(i.avlAsnQty || 0)) > 0)
    const fromIso = toIsoDate(fromDate)
    const toIso = toIsoDate(toDate)
    const q = materialSearch.trim().toUpperCase()

    return available.filter(i => {
      const matchMat = !q || i.materialNumber?.toUpperCase().includes(q) || i.materialName?.toUpperCase().includes(q)
      const itemDateIso = toIsoDate(i.shipmentDate || i.deliveryDate)
      const matchFrom = !fromIso || !itemDateIso || itemDateIso >= fromIso
      const matchTo = !toIso || !itemDateIso || itemDateIso <= toIso
      return matchMat && matchFrom && matchTo
    })
  }, [items, materialSearch, fromDate, toDate, originalQties])

  const filteredSelectedCount = filteredItems.filter(i => selectedItemNos.includes(i.itemNo)).length
  const allSelected = filteredItems.length > 0 && filteredSelectedCount === filteredItems.length
  const someSelected = filteredSelectedCount > 0 && !allSelected

  const toggleAll = () => {
    const visibleNos = filteredItems.map(i => i.itemNo)
    if (allSelected) setSelectedItemNos(prev => prev.filter(n => !visibleNos.includes(n)))
    else setSelectedItemNos(prev => [...prev, ...visibleNos.filter(n => !prev.includes(n))])
  }
  const toggleOne = (itemNo) => {
    const item = items.find(i => i.itemNo === itemNo)
    if (!item) return
    if (selectedItemNos.includes(itemNo)) { setSelectedItemNos(prev => prev.filter(n => n !== itemNo)); return }
    if (parseFloat(item.avlAsnQty || 0) === 0) return
    setSelectedItemNos(prev => [...prev, itemNo])
  }
  const updateItem = (itemNo, field, value) => setItems(prev => prev.map(i => i.itemNo === itemNo ? { ...i, [field]: value } : i))
  const handleSplitBatchSave = (itemNo, batches) => setItems(prev => prev.map(i => i.itemNo === itemNo ? { ...i, batches } : i))

  const handleGo = async () => {
    if (!agreement?.id) return
    setItemsLoading(true)
    setItemsError(null)
    try {
      const asnItems = await createAsnApi.getEligibleItems({
        scheduleNo: agreement.id, fromDate, toDate,
      })
      mergeFetched(asnItems)
      setSelectedItemNos(prev => prev.filter(no => asnItems.some(i => i.itemNo === no)))
    } catch (err) { setItemsError(err.message) }
    finally { setItemsLoading(false) }
  }
  const handleClear = () => { setFromDate(''); setToDate(''); setMaterialSearch('') }

  // Selected rows for the summary card
  const selectedItems = useMemo(
    () => items.filter(i => selectedItemNos.includes(i.itemNo)),
    [items, selectedItemNos]
  )

  // Invoice Value (Vendor) from the selected rows
  const invoiceValueVendor = useMemo(() => {
    const sum = selectedItems.reduce(
      (acc, it) => acc + parseFloat(it.avlAsnQty || 0) * parseFloat(it.supplierNetPrice || it.netPrice || 0),
      0
    )
    return sum.toFixed(2)
  }, [selectedItems])

  // Auto-populate invoice amount based on selected items + tax formula
  useEffect(() => {
    if (selectedItems.length > 0) {
      const totalWithTax = selectedItems.reduce((acc, it) => {
        const q = parseFloat(it.avlAsnQty || 0)
        const p = parseFloat(it.supplierNetPrice || it.netPrice || 0)
        const base = q * p
        const igstPer = parseFloat(it.igstPer ?? 0)
        const cgstPer = parseFloat(it.cgstPer ?? 9)
        const sgstPer = parseFloat(it.sgstPer ?? 9)
        const igst = it.igst && Number(it.igst) > 0 ? Number(it.igst) : (base * igstPer / 100)
        const cgst = it.cgst && Number(it.cgst) > 0 ? Number(it.cgst) : (base * cgstPer / 100)
        const sgst = it.sgst && Number(it.sgst) > 0 ? Number(it.sgst) : (base * sgstPer / 100)
        return acc + base + igst + cgst + sgst
      }, 0)
      setInvoiceAmount(totalWithTax.toFixed(2))
    } else {
      setInvoiceAmount('')
    }
  }, [selectedItems])

  const validateBeforeCreate = () => {
    const errors = []
    if (selectedItemNos.length === 0) errors.push('Select at least one item to create ASN.')
    if (!invoiceNumber) errors.push('Invoice Number is required.')
    if (generalAttachments.length === 0) errors.push('At least one General Attachment is required.')

    selectedItems.forEach(it => {
      const tag = `Item ${it.ebelp} / Sch ${it.schLine} (${it.materialNumber})`
      const avl = parseFloat(it.avlAsnQty || 0)
      if (avl === 0) { errors.push(`${tag}: Available ASN Qty is 0.`); return }
      const avlErr = getAvlAsnQtyError(it)
      if (avlErr) errors.push(`${tag}: ${avlErr}`)
      const fgVal = parseFloat(it.fgStock)
      if (it.fgStock === '' || isNaN(fgVal)) errors.push(`${tag}: FG Stock is required.`)
      else if (fgVal < avl) errors.push(`${tag}: FG Stock (${fgVal}) must be greater than or equal to Avl. ASN Qty (${avl}).`)

      if (!it.packagingType) errors.push(`${tag}: Type of Packaging is required.`)
      if (!it.packingMaterialQty || Number(it.packingMaterialQty) <= 0) {
        errors.push(`${tag}: Packing Material Qty must be greater than 0.`)
      }
      if (it.batches && it.batches.length > 0) {
        const sum = it.batches.reduce((s, b) => s + parseFloat(b.quantity || 0), 0)
        if (Math.abs(sum - avl) > 0.0001) errors.push(`${tag}: batch quantity sum (${sum}) does not match Permissible ASN Qty (${avl}).`)
        const bad = it.batches.find(b => !b.batchCode || !b.quantity)
        if (bad) errors.push(`Item ${it.ebelp} / Sch ${it.schLine}: incomplete batch row.`)
      }
    })
    return errors
  }

  const handleCreate = () => {
    const errors = validateBeforeCreate()
    if (errors.length > 0) {
      setModal({ kind: 'error', title: 'Cannot create ASN', message: 'Please resolve the following issues and try again:', details: (<ul className="list-disc pl-5 space-y-1">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>), primaryLabel: 'OK', onPrimary: () => setModal(null) })
      return
    }
    setModal({
      kind: 'confirm', title: 'Create ASN?', message: 'Please review the details below before submitting.',
      details: (
        <div className="space-y-1.5">
          <div className="flex justify-between gap-3"><span className="text-[#6a6d70]">Agreement</span><strong>{agreement.id}</strong></div>
          <div className="flex justify-between gap-3"><span className="text-[#6a6d70]">Invoice Number</span><strong className="break-all text-right">{invoiceNumber}</strong></div>
          <div className="flex justify-between gap-3"><span className="text-[#6a6d70]">Invoice Amount</span><strong>₹ {invoiceAmount || invoiceValueVendor}</strong></div>
          <div className="flex justify-between gap-3"><span className="text-[#6a6d70]">Invoice Value (Vendor)</span><strong>₹ {invoiceValueVendor}</strong></div>
          <div className="flex justify-between gap-3"><span className="text-[#6a6d70]">Items selected</span><strong>{selectedItems.length}</strong></div>
          <div className="flex justify-between gap-3"><span className="text-[#6a6d70]">PDIR attachments</span><strong>{pdirAttachments.length}</strong></div>
          <div className="flex justify-between gap-3"><span className="text-[#6a6d70]">General attachments</span><strong>{generalAttachments.length}</strong></div>
        </div>
      ),
      primaryLabel: 'Yes, Create', secondaryLabel: 'Cancel', onPrimary: doCreate, onSecondary: () => setModal(null),
    })
  }

    const doCreate = async () => {
    if (submitLock.current) return
    submitLock.current = true
    setModal(null)
    setSubmitting(true)
    try {
      const result = recoveryRef.current
        ? await createAsnApi.persistAsn(recoveryRef.current)
        : await createAsnApi.submitAsn({
            header: agreement,
            scheduleNo: agreement.id, plant: agreement.plant,
            invoiceNumber, invoiceDate, invoiceAmount: invoiceAmount || invoiceValueVendor, totalPacking,
            items: selectedItems,
          })
      recoveryRef.current = null
      // ... rest of the try block unchanged (attachments upload + success modal)
    } catch (err) {
      if (err.asnNumber) {
        recoveryRef.current = { scheduleNo: agreement.id, vendor: err.vendor, rows: err.remaining, asnNum: err.asnNumber, fisYear: err.fisYear }
        setModal({ kind: 'error', title: 'ASN created — save to SAP failed', message: err.message,
          primaryLabel: 'Retry Save', onPrimary: doCreate, secondaryLabel: 'Close', onSecondary: () => setModal(null) })
      } else {
        setModal({ kind: 'error', title: 'Failed to create ASN', message: err.message || 'Something went wrong. Please try again.', primaryLabel: 'OK', onPrimary: () => setModal(null) })
      }
    } finally { submitLock.current = false; setSubmitting(false) }
  }

  const totalAttachments = generalAttachments.length + pdirAttachments.length

  const handleAttachmentUpload = (att) => {
    if (att.kind === 'general') setGeneralAttachments(prev => [...prev, att])
    else setPdirAttachments(prev => [...prev, att])
  }
  const handleAttachmentRemove = (id, kind) => {
    if (kind === 'general') setGeneralAttachments(prev => prev.filter(a => a.id !== id))
    else setPdirAttachments(prev => prev.filter(a => a.id !== id))
  }
  const handleAttachmentReject = (msg) =>
    setModal({ kind: 'error', title: 'Upload rejected', message: msg, primaryLabel: 'OK', onPrimary: () => setModal(null) })

  const openTaxPopup = (item, e) => {
    const r = e.currentTarget.getBoundingClientRect()
    setTaxPopup(taxPopup?.item?.itemNo === item.itemNo ? null : { item, rect: r })
  }

  const TABLE_COLS = 19
  const cellInput = 'h-8 px-2 text-[13px] border rounded bg-white outline-none focus:border-[#0a6ed1]'

  return (
    <PageLayout
      companyCode={agreement?.companyCode || agreement?.companyName}
      supplierName={agreement?.vendorName || agreement?.vendor}
      supplierLocation={agreement?.plantName || agreement?.plant}
      onBack={() => navigate(-1)}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .anim-fade { animation: fadeIn 0.35s ease-out both; }
        .anim-pop { animation: popIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>

      <div className="bg-[#f5f6f7] min-h-[calc(100vh-104px)] flex flex-col">
        {/* Top Header Strip with Back Button, Centered Title, and Action Button */}
        <div className="relative flex flex-wrap items-center justify-between px-3 sm:px-6 py-2.5 border-b border-[#e5e7eb] bg-white gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded border-2 border-[#0a6ed1] text-[#0a6ed1] flex items-center justify-center hover:bg-[#ebf5ff] transition-all flex-shrink-0 cursor-pointer"
            title="Back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          {/* Centered Heading */}
          <div className="sm:absolute sm:left-1/2 sm:transform sm:-translate-x-1/2 text-center select-none">
            <h1 className="text-[16px] sm:text-[18px] font-bold text-[#0f2d59] tracking-tight whitespace-nowrap">
              Create ASN
            </h1>
          </div>

          {/* Action button on right */}
          <div className="flex items-center gap-2 z-10 ml-auto sm:ml-0">
            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting}
              className="flex items-center gap-1.5 px-3.5 h-8 bg-[#0a6ed1] text-white text-[12px] sm:text-[13px] font-bold rounded hover:bg-[#085caf] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  Save
                </>
              )}
            </button>
          </div>
        </div>

        {/* Schedule Agreement & Plant Heading Section */}
        <div className="px-3 sm:px-6 pt-3 sm:pt-4 pb-1 sm:pb-2">
          <h2 className="text-[17px] sm:text-[19px] font-black text-[#0f2d59] tracking-tight">
            Schedule Agreement : {agreement?.id}
          </h2>
          <div className="text-[12px] sm:text-[13px] text-[#4b5563] mt-0.5">
            Plant : {agreement?.plant}
          </div>
        </div>

        {/* TOP TWO-CARD SECTION (stack on mobile/tablet, 2-cols on laptop) */}
        <div className="px-3 sm:px-6 py-2 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {/* Left Card: Invoice Inputs */}
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
            <div>
              <label className="block text-[12px] sm:text-[13px] font-semibold text-[#4b5563] mb-1">
                Invoice Number: <span className="text-[#dc2626] font-bold">*</span>
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder=""
                className="w-full h-8 px-3 border border-[#d1d5db] rounded text-[13px] bg-white outline-none focus:border-[#0a6ed1] focus:ring-1 focus:ring-[#0a6ed1] transition-all"
              />
            </div>

            <div>
              <label className="block text-[12px] sm:text-[13px] font-semibold text-[#4b5563] mb-1">
                Invoice Date:
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full h-8 px-3 pr-8 border border-[#d1d5db] rounded text-[13px] bg-white outline-none focus:border-[#0a6ed1] focus:ring-1 focus:ring-[#0a6ed1] transition-all"
                />
                <div className="absolute right-2.5 top-2 text-[#9ca3af] pointer-events-none">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[12px] sm:text-[13px] font-semibold text-[#4b5563] mb-1">
                Invoice Amount: <span className="text-[#dc2626] font-bold">*</span>
              </label>
              <input
                type="text"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
                placeholder=""
                className="w-full h-8 px-3 border border-[#d1d5db] rounded text-[13px] bg-white outline-none focus:border-[#0a6ed1] focus:ring-1 focus:ring-[#0a6ed1] transition-all"
              />
            </div>

            <div>
              <label className="block text-[12px] sm:text-[13px] font-semibold text-[#4b5563] mb-1">
                Invoice Value(Vendor):
              </label>
              <div className="w-full h-8 px-3 border border-dashed border-[#d1d5db] bg-[#f3f4f6] rounded text-[13px] flex items-center text-[#1f2937] font-semibold select-none">
                {invoiceValueVendor}
              </div>
            </div>

            <div>
              <label className="block text-[12px] sm:text-[13px] font-semibold text-[#4b5563] mb-1">
                Total Packing:
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={totalPacking}
                onChange={(e) => setTotalPacking(e.target.value)}
                placeholder=""
                className="w-full h-8 px-3 border border-[#d1d5db] rounded text-[13px] bg-white outline-none focus:border-[#0a6ed1] focus:ring-1 focus:ring-[#0a6ed1] transition-all"
              />
            </div>
          </div>

          {/* Right Card: Selected Line Items Summary Table (7 columns) */}
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 sm:p-5 shadow-sm flex flex-col min-w-0 overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto flex-1 w-full">
              <table className="w-full text-left text-[12.5px] border-collapse" style={{ minWidth: 640 }}>
                <thead>
                  <tr className="border-b border-[#e5e7eb] text-[#1f2937] font-bold whitespace-nowrap bg-[#fafbfc]">
                    <th className="py-2 px-2.5">Material</th>
                    <th className="py-2 px-2.5">Description</th>
                    <th className="py-2 px-2.5">Net Price</th>
                    <th className="py-2 px-2.5">Qty Selected</th>
                    <th className="py-2 px-2.5">SPQ</th>
                    <th className="py-2 px-2.5 text-center">No.of EDI Tags</th>
                    <th className="py-2 px-2.5 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f3f4f6]">
                  {selectedItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-14 text-center text-[#6b7280]">
                        No data
                      </td>
                    </tr>
                  ) : (
                    selectedItems.map((it) => {
                      const qty = parseFloat(it.avlAsnQty || 0)
                      const spqVal = parseFloat(it.spq) || 1
                      const ediTags = Math.ceil(qty / spqVal) || 1
                      const itemVal = (qty * parseFloat(it.supplierNetPrice || it.netPrice || 0)).toFixed(2)

                      return (
                        <tr key={it.itemNo} className="hover:bg-[#fafbfc] whitespace-nowrap">
                          <td className="py-2 px-2.5 font-bold text-[#1f2937]">{it.materialNumber}</td>
                          <td className="py-2 px-2.5 text-[#4b5563] max-w-[180px] truncate" title={it.materialName}>{it.materialName}</td>
                          <td className="py-2 px-2.5 font-semibold text-[#0a6ed1]">{it.netPrice} INR</td>
                          <td className="py-2 px-2.5 font-bold text-[#1f2937]">{it.avlAsnQty} {it.totalUnit}</td>
                          <td className="py-2 px-2.5 text-[#1f2937] font-medium">{it.spq}</td>
                          <td className="py-2 px-2.5 text-[#1f2937] font-medium text-center">{ediTags}</td>
                          <td className="py-2 px-2.5 font-bold text-[#1f2937] text-right">{itemVal} INR</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Circular Tab Icons */}
        <div className="px-3 sm:px-6 pt-3 flex items-center gap-4 sm:gap-6">
          {/* Tab 1: Info (i) */}
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            title="ASN items"
            className={`flex flex-col items-center pb-2 cursor-pointer transition-all border-b-2 ${
              activeTab === 'info'
                ? 'border-[#0a6ed1]'
                : 'border-transparent text-[#6b7280] hover:text-[#0a6ed1]'
            }`}
          >
            <div className="relative">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${
                  activeTab === 'info'
                    ? 'bg-[#0a6ed1] text-white'
                    : 'bg-white border border-[#d1d5db] text-[#6b7280]'
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </div>
              {selectedItemNos.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#0a6ed1] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white">
                  {selectedItemNos.length}
                </span>
              )}
            </div>
          </button>

          {/* Tab 2: Attachments */}
          <button
            type="button"
            onClick={() => setActiveTab('attachments')}
            title="Attachments"
            className={`flex flex-col items-center pb-2 cursor-pointer transition-all border-b-2 ${
              activeTab === 'attachments'
                ? 'border-[#0a6ed1]'
                : 'border-transparent text-[#6b7280] hover:text-[#0a6ed1]'
            }`}
          >
            <div className="relative">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${
                  activeTab === 'attachments'
                    ? 'bg-[#0a6ed1] text-white'
                    : 'bg-white border border-[#d1d5db] text-[#6b7280]'
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </div>
              {totalAttachments > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#0a6ed1] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white">
                  {totalAttachments}
                </span>
              ) : (
                <span className="absolute -top-1.5 -right-1 text-[#cc1c14] text-[18px] font-bold leading-none" title="General attachment required">*</span>
              )}
            </div>
          </button>
        </div>

        {/* TAB 1: ASN ITEMS TABLE */}
        {activeTab === 'info' && (
          <div className="flex-1 flex flex-col px-3 sm:px-6 pt-2 pb-6 min-h-0 min-w-0 anim-fade">
            {/* Filter Bar */}
            <div className="bg-white border border-[#e5e5e5] rounded-xl p-3 sm:px-5 sm:py-3 mb-4 shadow-sm flex flex-wrap items-end gap-3 sm:gap-4">
              {/* Shipment From Date */}
              <div className="w-full sm:w-auto">
                <label className="block text-[12px] font-semibold text-[#1f2937] mb-1">Shipment From Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    max={toDate || undefined}
                    className="h-8 w-full sm:w-36 md:w-40 px-2.5 text-[13px] border border-[#d1d5db] rounded-lg bg-white outline-none focus:border-[#0a6ed1]"
                  />
                </div>
              </div>

              {/* To Date */}
              <div className="w-full sm:w-auto">
                <label className="block text-[12px] font-semibold text-[#1f2937] mb-1">To Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    min={fromDate || undefined}
                    className="h-8 w-full sm:w-36 md:w-40 px-2.5 text-[13px] border border-[#d1d5db] rounded-lg bg-white outline-none focus:border-[#0a6ed1]"
                  />
                </div>
              </div>

              {/* Go Button */}
              <button
                type="button"
                onClick={handleGo}
                className="h-8 px-4 bg-[#0a6ed1] text-white text-[13px] font-semibold rounded-lg hover:bg-[#085caf] transition-all cursor-pointer"
              >
                Go
              </button>

              {/* Clear Button */}
              <button
                type="button"
                onClick={handleClear}
                className="h-8 px-4 bg-[#fde8e8] text-[#e02424] text-[13px] font-semibold rounded-lg hover:bg-[#fbd5d5] transition-all cursor-pointer"
              >
                Clear
              </button>

              {/* Enter Materials */}
              <div className="w-full sm:w-auto sm:ml-auto">
                <label className="block text-[12px] font-semibold text-[#1f2937] mb-1">Enter Materials</label>
                <div className="relative">
                  <input
                    type="text"
                    value={materialSearch}
                    onChange={(e) => setMaterialSearch(e.target.value)}
                    placeholder="Search"
                    className="h-8 w-full sm:w-56 pl-3 pr-8 text-[13px] border border-[#d1d5db] rounded-lg bg-white outline-none focus:border-[#0a6ed1]"
                  />
                  <div className="absolute right-2.5 top-2 text-[#9ca3af] pointer-events-none">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {itemsError && (
              <div className="bg-[#fee2e2] border border-[#fca5a5] text-[#b91c1c] rounded-lg p-3 text-[13px] mb-4">
                {itemsError}
              </div>
            )}

            {/* Main Horizontal Scrollable Table */}
            <div className="bg-white border border-[#e5e5e5] rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0 min-w-0">
              <div className="overflow-x-auto overflow-y-auto flex-1 w-full">
                <table className="w-full text-left text-[13px] border-collapse" style={{ minWidth: 2100 }}>
                  <thead className="sticky top-0 bg-[#f9fafb] z-10 border-b border-[#e5e5e5]">
                    <tr className="text-[#1f2937] font-bold whitespace-nowrap">
                      <th className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => { if (el) el.indeterminate = someSelected }}
                          onChange={toggleAll}
                          className="w-4 h-4 rounded accent-[#0a6ed1] cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-3">Item No.</th>
                      <th className="py-3 px-3">Schedule line</th>
                      <th className="py-3 px-4">Material</th>
                      <th className="py-3 px-4">Shipment Date</th>
                      <th className="py-3 px-3">Total Qty</th>
                      <th className="py-3 px-3">Conf.Qty</th>
                      <th className="py-3 px-3">Delivered Qty</th>
                      <th className="py-3 px-3">ASN Created</th>
                      <th className="py-3 px-3">Permissible ASN Qty</th>
                      <th className="py-3 px-3">FG Stock</th>
                      <th className="py-3 px-3">Net Price</th>
                      <th className="py-3 px-3">Supplier Net Price</th>
                      <th className="py-3 px-3">Material Expiry</th>
                      <th className="py-3 px-3">Tax Mismatch</th>
                      <th className="py-3 px-4">Type of Packaging <span className="text-[#cc1c14]">*</span></th>
                      <th className="py-3 px-3">Packing Qty <span className="text-[#cc1c14]">*</span></th>
                      <th className="py-3 px-3">SPQ</th>
                      <th className="py-3 px-4">PDIR No.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f3f4f6]">
                    {itemsLoading ? (
                      <tr>
                        <td colSpan={TABLE_COLS} className="py-20 text-center text-[#6b7280]">
                          <div className="w-8 h-8 border-2 border-[#0a6ed1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          Loading ASN items…
                        </td>
                      </tr>
                    ) : filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={TABLE_COLS} className="py-16 text-center text-[#6b7280]">
                          {items.length === 0
                            ? 'No items available for ASN creation.'
                            : 'No items match the current filters.'}
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => {
                        const isSelected = selectedItemNos.includes(item.itemNo)
                        const avlErr = getAvlAsnQtyError(item)
                        const fgErr = getFgStockError(item)
                        const maxBatches = parseInt(item.packingMaterialQty, 10)
                        const splitDisabled = !item.packingMaterialQty || isNaN(maxBatches) || maxBatches < 1
                        const bc = item.batches?.length || 0
                        const bsum = (item.batches || []).reduce((s, b) => s + parseFloat(b.quantity || 0), 0)
                        const balanced = bc > 0 && Math.abs(bsum - parseFloat(item.avlAsnQty || 0)) < 0.0001

                        return (
                          <tr
                            key={item.itemNo}
                            className={`hover:bg-[#f9fafb] transition-colors whitespace-nowrap ${
                              isSelected ? 'bg-[#f0f7ff]/50' : ''
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleOne(item.itemNo)}
                                className="w-4 h-4 rounded accent-[#0a6ed1] cursor-pointer"
                              />
                            </td>

                            {/* Item No. */}
                            <td className="py-3 px-3 font-semibold text-[#1f2937]">{item.ebelp}</td>

                            {/* Schedule line */}
                            <td className="py-3 px-3 text-[#1f2937] font-semibold">{item.schLine}</td>

                            {/* Material */}
                            <td className="py-3 px-4">
                              <div className="font-bold text-[#1f2937] leading-tight">{item.materialNumber}</div>
                              <div className="text-[12px] text-[#4b5563] leading-tight mt-0.5">{item.materialName}</div>
                            </td>

                            {/* Shipment Date */}
                            <td className="py-3 px-4 text-[#1f2937] font-medium">{item.shipmentDate || '—'}</td>

                            {/* Total Qty */}
                            <td className="py-3 px-3 text-[#1f2937]">
                              <span className="font-bold text-[#0a6ed1]">{item.totalQty}</span>{' '}
                              <span className="text-[#4b5563] text-[12px]">{item.totalUnit}</span>
                            </td>

                            {/* Conf. Qty */}
                            <td className="py-3 px-3 text-[#1f2937]">
                              <span className="font-bold">{item.confQty}</span>{' '}
                              <span className="text-[#4b5563] text-[12px]">{item.confUnit}</span>
                            </td>

                            {/* Delivered Qty */}
                            <td className="py-3 px-3 text-[#1f2937]">
                              <span className="font-bold">{item.deliveredQty}</span>{' '}
                              <span className="text-[#4b5563] text-[12px]">{item.deliveredUnit}</span>
                            </td>

                            {/* ASN Created */}
                            <td className="py-3 px-3 text-[#1f2937] font-bold">{item.asnCreated}</td>

                            {/* Permissible ASN Qty (editable) */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={item.avlAsnQty}
                                  onChange={(e) => updateItem(item.itemNo, 'avlAsnQty', e.target.value)}
                                  className={`w-20 ${cellInput} text-center font-semibold text-[#0a6ed1] ${
                                    avlErr ? 'border-[#dc2626] bg-[#fef2f2] focus:border-[#dc2626]' : 'border-[#d1d5db]'
                                  }`}
                                />
                                <span className="text-[#4b5563] font-medium text-[12px]">{item.totalUnit}</span>
                              </div>
                              {avlErr && (
                                <div className="text-[11px] text-[#dc2626] font-medium mt-1">{avlErr}</div>
                              )}
                            </td>

                            {/* FG Stock (editable) */}
                            <td className="py-3 px-3">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.fgStock}
                                onChange={(e) => updateItem(item.itemNo, 'fgStock', e.target.value)}
                                onWheel={(e) => e.target.blur()}
                                placeholder="0"
                                className={`w-24 ${cellInput} ${
                                  fgErr ? 'border-[#dc2626] bg-[#fef2f2] focus:border-[#dc2626]' : 'border-[#d1d5db]'
                                }`}
                              />
                              {fgErr && (
                                <div className="text-[11px] text-[#dc2626] font-medium mt-1">{fgErr}</div>
                              )}
                            </td>

                            {/* Net Price (blue text, clickable for Tax Breakdown) */}
                            <td className="py-3 px-3">
                              <span
                                onClick={(e) => openTaxPopup(item, e)}
                                className="text-[#0a6ed1] font-semibold cursor-pointer hover:underline"
                                title="Click to view tax breakdown"
                              >
                                {item.netPrice} INR
                              </span>
                            </td>

                            {/* Supplier Net Price (editable) */}
                            <td className="py-3 px-3">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={item.supplierNetPrice}
                                onChange={(e) => updateItem(item.itemNo, 'supplierNetPrice', e.target.value)}
                                className={`w-24 ${cellInput} border-[#d1d5db] text-left`}
                              />
                            </td>

                            {/* Material Expiry */}
                            <td className="py-3 px-3">
                              <input
                                type="date"
                                value={item.materialExpiry}
                                onChange={(e) => updateItem(item.itemNo, 'materialExpiry', e.target.value)}
                                className={`w-36 ${cellInput} border-[#d1d5db]`}
                              />
                            </td>

                            {/* Tax Mismatch (switch) */}
                            <td className="py-3 px-3">
                              <TaxMismatchSwitch
                                value={item.taxMismatch}
                                onChange={(val) => updateItem(item.itemNo, 'taxMismatch', val)}
                              />
                            </td>

                            {/* Type of Packaging */}
                            <td className="py-3 px-4">
                              <select
                                value={item.packagingType}
                                onChange={(e) => updateItem(item.itemNo, 'packagingType', e.target.value)}
                                className={`${cellInput} border-[#d1d5db] min-w-[170px]`}
                              >
                                <option value="">Select</option>
                                {packagingTypes.map((pt) => (
                                  <option key={pt} value={pt}>{pt}</option>
                                ))}
                              </select>
                            </td>

                            {/* Packing Qty + Split */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={item.packingMaterialQty}
                                  onChange={(e) => updateItem(item.itemNo, 'packingMaterialQty', e.target.value.replace(/^0+/, ''))}
                                  placeholder="0"
                                  className={`w-14 ${cellInput} border-[#d1d5db] text-center`}
                                />
                                <button
                                  type="button"
                                  onClick={() => !splitDisabled && setSplitBatchItem(item)}
                                  disabled={splitDisabled}
                                  title={splitDisabled ? 'Enter Packing Qty to enable split' : 'Split Quantity'}
                                  className={`text-[12px] font-semibold ${
                                    splitDisabled
                                      ? 'text-[#9ca3af] cursor-not-allowed'
                                      : bc > 0
                                        ? balanced
                                          ? 'text-[#107e3e] hover:underline cursor-pointer'
                                          : 'text-[#b45309] hover:underline cursor-pointer'
                                        : 'text-[#0a6ed1] hover:underline cursor-pointer'
                                  }`}
                                >
                                  Split{bc > 0 ? ` (${bc}/${maxBatches || '?'})` : ''}
                                </button>
                              </div>
                              {!splitDisabled && bc > 0 && (
                                <div className={`text-[11px] font-semibold mt-1 ${balanced ? 'text-[#107e3e]' : 'text-[#b45309]'}`}>
                                  {balanced ? `✓ ${batchLabel(item, bc)} — balanced` : `⚠ ${batchLabel(item, bc)} — unbalanced`}
                                </div>
                              )}
                            </td>

                            {/* SPQ */}
                            <td className="py-3 px-3 text-[#1f2937] font-medium">{item.spq}</td>

                            {/* PDIR No. */}
                            <td className="py-3 px-4">
                              <select
                                value={item.pdirNo}
                                onChange={(e) => updateItem(item.itemNo, 'pdirNo', e.target.value)}
                                className={`${cellInput} border-[#d1d5db] min-w-[120px]`}
                              >
                                <option value="">Select</option>
                                {(pdirOptions || []).map((p) => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ATTACHMENTS */}
        {activeTab === 'attachments' && (
          <div className="flex-1 bg-white p-3 sm:p-6 min-h-0 min-w-0 anim-fade">
            <AttachmentsPanel
              generalAttachments={generalAttachments}
              pdirAttachments={pdirAttachments}
              onUpload={handleAttachmentUpload}
              onRemove={handleAttachmentRemove}
              onReject={handleAttachmentReject}
            />
          </div>
        )}
      </div>

      {/* Split Batch Modal */}
      <SplitBatchModal
        open={!!splitBatchItem}
        item={splitBatchItem}
        onClose={() => setSplitBatchItem(null)}
        onSave={handleSplitBatchSave}
      />

      {/* Confirmation / Result Modal */}
      <ConfirmationModal
        open={!!modal}
        kind={modal?.kind}
        title={modal?.title}
        message={modal?.message}
        details={modal?.details}
        primaryLabel={modal?.primaryLabel}
        secondaryLabel={modal?.secondaryLabel}
        onPrimary={modal?.onPrimary}
        onSecondary={modal?.onSecondary}
      />

      {/* Portal-based Tax Breakdown Popup */}
      {taxPopup && (
        <TaxBreakdownPopup
          item={taxPopup.item}
          rect={taxPopup.rect}
          onClose={() => setTaxPopup(null)}
        />
      )}
    </PageLayout>
  )
}