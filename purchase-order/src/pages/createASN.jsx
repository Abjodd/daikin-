import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import PageLayout from '../layouts/PageLayout.jsx'
import { createAsnService } from '../services/CreateAsn.js'
import { postCreateAsn } from '../services/CreateAsnPost.js'
import { uploadAllAttachments } from '../services/UploadAttachment.js'

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
  'Corrugated Box',
  'Wooden Crates',
  'Plastic Trays',
  'HDPE Bags',
  'Steel Pallets',
  'Wooden Pallets',
  'Tote Boxes',
  'ESD Trays',
]

// ─── TAX MISMATCH SWITCH (NO EMOJIS) ─────────────────────────────
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

// ─── SPLIT BATCH MODAL (NO EMOJIS) ───────────────────────────────
function SplitBatchModal({ open, item, onClose, onSave }) {
  const [rows, setRows] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open || !item) return
    setRows(
      item.batches && item.batches.length > 0
        ? item.batches.map((b, i) => ({ ...b, batchCode: String(i + 1) }))
        : [{ id: 'b-init-1', batchCode: '1', quantity: String(item.avlAsnQty || '') }]
    )
    setError(null)
  }, [open, item])

  if (!open || !item) return null

  const target = parseFloat(item.avlAsnQty || 0)
  const total = rows.reduce((s, r) => s + parseFloat(r.quantity || 0), 0)
  const remaining = target - total
  const isMatch = Math.abs(remaining) < 0.0001 && rows.length > 0
  const isOver = total > target

  const addRow = () => {
    const maxBatches = parseInt(item.packingMaterialQty, 10) || 5
    if (rows.length >= maxBatches) {
      setError(`Maximum ${maxBatches} batch rows allowed (matches Packing Material Qty).`)
      return
    }
    setRows([
      ...rows,
      {
        id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        batchCode: String(rows.length + 1),
        quantity: '',
      },
    ])
    setError(null)
  }

  const removeRow = (id) => {
    setRows(rows.filter((r) => r.id !== id).map((r, i) => ({ ...r, batchCode: String(i + 1) })))
    setError(null)
  }

  const updateRow = (id, field, value) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
    setError(null)
  }

  const handleSave = () => {
    if (rows.length === 0) {
      onSave(item.itemNo, [])
      onClose()
      return
    }
    const missing = rows.find((r) => !r.quantity || parseFloat(r.quantity) <= 0)
    if (missing) {
      setError('Every batch row needs a positive Quantity.')
      return
    }
    if (!isMatch) {
      setError(
        isOver
          ? `Sum of batch quantities (${total}) exceeds Avl. ASN Qty (${target}).`
          : `Sum of batch quantities (${total}) is short by ${remaining.toFixed(2)}.`
      )
      return
    }
    onSave(
      item.itemNo,
      rows.map((r) => ({ ...r, quantity: parseInt(r.quantity, 10) }))
    )
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-[560px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[#e5e5e5] flex items-center justify-between bg-[#fafbfc]">
          <div>
            <div className="text-[12px] uppercase font-semibold text-[#6b7280]">Split Quantity</div>
            <div className="text-[16px] font-bold text-[#1f2937]">
              {item.materialNumber} - {item.materialName}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center text-[#9ca3af] hover:text-[#111827] hover:bg-[#f3f4f6]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
          <div className="flex items-center justify-between text-[13px] bg-[#f3f4f6] p-2.5 rounded-lg">
            <span>
              Target Qty: <strong>{target} {item.totalUnit}</strong>
            </span>
            <span>
              Allocated:{' '}
              <strong className={isMatch ? 'text-[#16a34a]' : 'text-[#dc2626]'}>
                {total} {item.totalUnit}
              </strong>
            </span>
          </div>
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3">
              <span className="w-16 text-[13px] font-semibold text-[#4b5563]">Batch {r.batchCode}</span>
              <input
                type="number"
                value={r.quantity}
                onChange={(e) => updateRow(r.id, 'quantity', e.target.value)}
                placeholder="Qty"
                className="flex-1 h-9 px-3 border border-[#d1d5db] rounded text-[13px] outline-none focus:border-[#0a6ed1]"
              />
              <button
                onClick={() => removeRow(r.id)}
                className="text-[#dc2626] hover:bg-[#fee2e2] px-2 py-1 rounded text-[13px]"
              >
                Remove
              </button>
            </div>
          ))}
          <button onClick={addRow} className="text-[#0a6ed1] font-semibold text-[13px] hover:underline mt-2">
            + Add Batch Row
          </button>
          {error && <div className="text-[#dc2626] text-[12px] mt-2 font-medium">{error}</div>}
        </div>
        <div className="px-5 py-3 border-t border-[#e5e5e5] bg-[#fafbfc] flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-[13px] text-[#4b5563] hover:bg-[#f3f4f6]">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-[#0a6ed1] text-white rounded-lg text-[13px] font-semibold hover:bg-[#085caf]">
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ATTACHMENTS PANEL (NO EMOJIS) ───────────────────────────────
function AttachmentsPanel({ generalAttachments, pdirAttachments, onUpload, onRemove }) {
  const [activeSub, setActiveSub] = useState('general')
  const inputRef = useRef(null)

  const items = activeSub === 'general' ? generalAttachments : pdirAttachments

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    for (const f of files) {
      if (!isAllowedFile(f)) {
        alert(`File "${f.name}" is not supported. Use PDF, XLS, or XLSX.`)
        continue
      }
      onUpload({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: f.name,
        size: f.size,
        kind: activeSub,
        _file: f,
      })
    }
    e.target.value = ''
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center gap-3 border-b border-[#e5e5e5] mb-5 overflow-x-auto">
        <button
          onClick={() => setActiveSub('general')}
          className={`pb-3 px-4 text-[13px] sm:text-[14px] font-bold border-b-2 whitespace-nowrap transition-all ${
            activeSub === 'general'
              ? 'border-[#0a6ed1] text-[#0a6ed1]'
              : 'border-transparent text-[#6b7280] hover:text-[#111827]'
          }`}
        >
          General Attachments ({generalAttachments.length})
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
          Upload required invoices or inspection documents (PDF, XLS, XLSX)
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
        <input ref={inputRef} type="file" multiple accept=".pdf,.xls,.xlsx" onChange={handleFileChange} className="hidden" />
      </div>

      {items.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-[#d1d5db] rounded-xl text-[#9ca3af] text-[13px]">
          No {activeSub === 'general' ? 'general' : 'PDIR'} attachments added yet. Click "Upload Document" to add files.
        </div>
      ) : (
        <div className="border border-[#e5e5e5] rounded-xl divide-y divide-[#f3f4f6] bg-white">
          {items.map((att) => (
            <div key={att.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-[#ebf5ff] text-[#0a6ed1] flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div>
                  <div className="text-[13px] sm:text-[14px] font-semibold text-[#1f2937]">{att.name}</div>
                  <div className="text-[11px] text-[#6b7280]">{(att.size / 1024).toFixed(1)} KB</div>
                </div>
              </div>
              <button
                onClick={() => onRemove(att.id, activeSub)}
                className="text-[#dc2626] hover:bg-[#fee2e2] px-3 py-1 rounded text-[12px] font-medium"
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
// MAIN CREATE ASN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function CreateASN() {
  const navigate = useNavigate()
  const location = useLocation()

  const agreementFromState = location.state?.agreement
  const poNo = agreementFromState?.poNo || agreementFromState?.id || location.state?.poNo || '7000037175'
  const plantDesc = agreementFromState?.plantDesc || 'Daikin Airconditioning -NMR (NMR)'

  // Top circular tab: 'info' | 'attachments'
  const [activeTab, setActiveTab] = useState('info')

  // Top Left Card: Invoice Inputs
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [invoiceAmount, setInvoiceAmount] = useState('')

  // Filter Bar state
  const [shipmentFromDate, setShipmentFromDate] = useState('')
  const [shipmentToDate, setShipmentToDate] = useState('')
  const [materialSearch, setMaterialSearch] = useState('')

  // Data state
  const [header, setHeader] = useState(agreementFromState || null)
  const [items, setItems] = useState([])
  const [pdirRefs, setPdirRefs] = useState([])
  const [selectedItemNos, setSelectedItemNos] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Attachments
  const [generalAttachments, setGeneralAttachments] = useState([])
  const [pdirAttachments, setPdirAttachments] = useState([])

  // Modal & submission state
  const [splitBatchItem, setSplitBatchItem] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [successModal, setSuccessModal] = useState(null)

  // Fetch ASN data on load
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    createAsnService
      .getCreateAsnPageData(poNo)
      .then(({ header: fetchedHeader, items: fetchedItems, pdirRefs: fetchedPdir }) => {
        if (cancelled) return
        setHeader(prev => ({ ...(prev || {}), ...(fetchedHeader || {}) }))
        setItems(fetchedItems || [])
        // Safely extract string options for PDIR dropdown to avoid [object Object] render bug
        const safePdirs = (fetchedPdir || []).map((p) => {
          if (typeof p === 'string') return { value: p, label: p }
          const val = p.value || p.refNo || p.PdirRefNo || p.Pdir_Ref_No || ''
          return { value: val, label: val }
        })
        setPdirRefs(safePdirs)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [poNo])

  // Filter items by material search and date
  const filteredItems = useMemo(() => {
    const q = (materialSearch || '').trim().toUpperCase()
    return items.filter((item) => {
      const matNum = (item.materialNumber || '').toUpperCase()
      const matName = (item.materialName || '').toUpperCase()
      const matchMat = !q || matNum.includes(q) || matName.includes(q)
      const matchFrom = !shipmentFromDate || (item.shipmentDateIso || '') >= shipmentFromDate
      const matchTo = !shipmentToDate || (item.shipmentDateIso || '') <= shipmentToDate
      return matchMat && matchFrom && matchTo
    })
  }, [items, materialSearch, shipmentFromDate, shipmentToDate])

  const allSelected = filteredItems.length > 0 && filteredItems.every((i) => selectedItemNos.includes(i.itemNo))

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedItemNos([])
    } else {
      setSelectedItemNos(filteredItems.map((i) => i.itemNo))
    }
  }

  const toggleSelectOne = (itemNo) => {
    if (selectedItemNos.includes(itemNo)) {
      setSelectedItemNos(selectedItemNos.filter((n) => n !== itemNo))
    } else {
      setSelectedItemNos([...selectedItemNos, itemNo])
    }
  }

  const updateItem = (itemNo, field, val) => {
    setItems(items.map((it) => (it.itemNo === itemNo ? { ...it, [field]: val } : it)))
  }

  const handleSplitBatchSave = (itemNo, batches) => {
    setItems(items.map((it) => (it.itemNo === itemNo ? { ...it, batches } : it)))
  }

  // Selected items array for the Top-Right Card
  const selectedItems = useMemo(() => {
    return items.filter((i) => selectedItemNos.includes(i.itemNo))
  }, [items, selectedItemNos])

  // Compute Invoice Value (Vendor) automatically based on selected items
  const invoiceValueVendor = useMemo(() => {
    const sum = selectedItems.reduce((acc, it) => {
      const q = parseFloat(it.avlAsnQty || 0)
      const p = parseFloat(it.supplierNetPrice || it.netPrice || 0)
      return acc + q * p
    }, 0)
    return sum.toFixed(2)
  }, [selectedItems])

  // Create ASN Submission (Save or Save as Draft)
  const handleSubmitAsn = async (isDraft = false) => {
    if (selectedItemNos.length === 0) {
      alert('Please select at least one item from the table.')
      return
    }
    if (!invoiceNumber.trim() && !isDraft) {
      alert('Invoice Number is required.')
      return
    }

    setSubmitting(true)
    try {
      const res = await postCreateAsn({
        poNo,
        invoice: {
          number: invoiceNumber || 'DRAFT',
          date: invoiceDate,
          amount: invoiceAmount || invoiceValueVendor,
        },
        selectedItems,
        header,
      })

      if (generalAttachments.length > 0 || pdirAttachments.length > 0) {
        await uploadAllAttachments({
          asnNum: res.AsnNum,
          fisYear: res.FisYear,
          generalAttachments,
          pdirAttachments,
        })
      }

      setSuccessModal({
        asnNum: res.AsnNum,
        poNo: res.Po_No || poNo,
        invoiceNum: res.InvoiceNum || invoiceNumber,
        count: selectedItems.length,
        isDraft,
      })
    } catch (err) {
      alert('Failed to save ASN: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageLayout>
      <div className="bg-[#f5f6f7] min-h-[calc(100vh-84px)] flex flex-col">
        {/* Top Header Strip with Back Button, Centered Title, and Action Buttons */}
        <div className="relative flex flex-wrap items-center justify-between px-3 sm:px-6 py-2.5 border-b border-[#e5e7eb] bg-white gap-2">
          {/* Back button on left */}
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

          {/* Action buttons on right (Save as Draft & Save) */}
          <div className="flex items-center gap-2 z-10 ml-auto sm:ml-0">
            <button
              type="button"
              onClick={() => handleSubmitAsn(true)}
              disabled={submitting}
              className="flex items-center gap-1.5 px-3 h-8 bg-[#fee2e2] text-[#b91c1c] text-[12px] sm:text-[13px] font-bold rounded hover:bg-[#fecaca] transition-all disabled:opacity-50 cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              Save as Draft
            </button>
            <button
              type="button"
              onClick={() => handleSubmitAsn(false)}
              disabled={submitting}
              className="flex items-center gap-1.5 px-3.5 h-8 bg-[#0a6ed1] text-white text-[12px] sm:text-[13px] font-bold rounded hover:bg-[#085caf] transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Save
            </button>
          </div>
        </div>

        {/* PO & Plant Heading Section */}
        <div className="px-3 sm:px-6 pt-3 sm:pt-4 pb-1 sm:pb-2">
          <h2 className="text-[17px] sm:text-[19px] font-black text-[#0f2d59] tracking-tight">
            Purchase Order : {poNo}
          </h2>
          <div className="text-[12px] sm:text-[13px] text-[#4b5563] mt-0.5">
            Plant :{plantDesc}
          </div>
        </div>

        {/* TOP TWO-CARD SECTION (Responsive: Stack on Mobile/Tablet, 2-cols on Laptop) */}
        <div className="px-3 sm:px-6 py-2 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {/* Left Card: Invoice Inputs */}
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
            <div>
              <label className="block text-[12px] sm:text-[13px] font-semibold text-[#4b5563] mb-1">
                Invoice Number:
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
          </div>

          {/* Right Card: Selected Line Items Summary Table (EXACT 7 COLUMNS) */}
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
                          <td className="py-2 px-2.5 font-bold text-[#1f2937]">{it.avlAsnQty} {it.totalUnit || 'NO'}</td>
                          <td className="py-2 px-2.5 text-[#1f2937] font-medium">{it.spq || '41.000'}</td>
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

        {/* Circular Tab Icons (NO EMOJIS, Clean SVGs) */}
        <div className="px-3 sm:px-6 pt-3 flex items-center gap-4 sm:gap-6">
          {/* Tab 1: Info (i) */}
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex flex-col items-center pb-2 cursor-pointer transition-all border-b-2 ${
              activeTab === 'info'
                ? 'border-[#0a6ed1]'
                : 'border-transparent text-[#6b7280] hover:text-[#0a6ed1]'
            }`}
          >
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
          </button>

          {/* Tab 2: Attachments (@) */}
          <button
            type="button"
            onClick={() => setActiveTab('attachments')}
            className={`flex flex-col items-center pb-2 cursor-pointer transition-all border-b-2 ${
              activeTab === 'attachments'
                ? 'border-[#0a6ed1]'
                : 'border-transparent text-[#6b7280] hover:text-[#0a6ed1]'
            }`}
          >
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
          </button>
        </div>

        {/* TAB 1: ASN ITEMS TABLE */}
        {activeTab === 'info' && (
          <div className="flex-1 flex flex-col px-3 sm:px-6 pt-2 pb-6 min-h-0 min-w-0">
            {/* Filter Bar (matching Screenshot 3, fully responsive) */}
            <div className="bg-white border border-[#e5e5e5] rounded-xl p-3 sm:px-5 sm:py-3 mb-4 shadow-sm flex flex-wrap items-end gap-3 sm:gap-4">
              {/* Shipment From Date */}
              <div className="w-full sm:w-auto">
                <label className="block text-[12px] font-semibold text-[#1f2937] mb-1">Shipment From Date</label>
                <div className="relative">
                  <input
                    type="text"
                    value={shipmentFromDate}
                    onChange={(e) => setShipmentFromDate(e.target.value)}
                    placeholder="e.g. 31.12.2026"
                    className="h-8 w-full sm:w-36 md:w-40 px-3 pr-8 text-[13px] border border-[#d1d5db] rounded-lg bg-white outline-none focus:border-[#0a6ed1]"
                  />
                  <div className="absolute right-2.5 top-2 text-[#9ca3af] pointer-events-none">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* To Date */}
              <div className="w-full sm:w-auto">
                <label className="block text-[12px] font-semibold text-[#1f2937] mb-1">To Date</label>
                <div className="relative">
                  <input
                    type="text"
                    value={shipmentToDate}
                    onChange={(e) => setShipmentToDate(e.target.value)}
                    placeholder="e.g. 31.12.2026"
                    className="h-8 w-full sm:w-36 md:w-40 px-3 pr-8 text-[13px] border border-[#d1d5db] rounded-lg bg-white outline-none focus:border-[#0a6ed1]"
                  />
                  <div className="absolute right-2.5 top-2 text-[#9ca3af] pointer-events-none">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Go Button */}
              <button
                type="button"
                className="h-8 px-4 bg-[#0a6ed1] text-white text-[13px] font-semibold rounded-lg hover:bg-[#085caf] transition-all cursor-pointer"
              >
                Go
              </button>

              {/* Clear Button */}
              <button
                type="button"
                onClick={() => {
                  setShipmentFromDate('')
                  setShipmentToDate('')
                  setMaterialSearch('')
                }}
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

            {/* Main Horizontal Scrollable Table (20 Columns) */}
            <div className="bg-white border border-[#e5e5e5] rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0 min-w-0">
              <div className="overflow-x-auto overflow-y-auto flex-1 w-full">
                <table className="w-full text-left text-[13px] border-collapse" style={{ minWidth: 1750 }}>
                  <thead className="sticky top-0 bg-[#f9fafb] z-10 border-b border-[#e5e5e5]">
                    <tr className="text-[#1f2937] font-bold whitespace-nowrap">
                      <th className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded accent-[#0a6ed1] cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-3">Item No.</th>
                      <th className="py-3 px-3">Schedule line</th>
                      <th className="py-3 px-4">Material</th>
                      <th className="py-3 px-4">Shipment Date</th>
                      <th className="py-3 px-3">Storage Location</th>
                      <th className="py-3 px-3">PO Qty.</th>
                      <th className="py-3 px-3">Conf.Qty</th>
                      <th className="py-3 px-3">Delivered Qty</th>
                      <th className="py-3 px-3">ASN Created</th>
                      <th className="py-3 px-3">Avl. ASN Qty</th>
                      <th className="py-3 px-3">Vendor Return Qty</th>
                      <th className="py-3 px-3">Short GRN Qty</th>
                      <th className="py-3 px-3">Net Price</th>
                      <th className="py-3 px-3">Supplier Net Price</th>
                      <th className="py-3 px-3">Tax Mismatch</th>
                      <th className="py-3 px-4">Packing Material Type</th>
                      <th className="py-3 px-3">Packing Material Qty</th>
                      <th className="py-3 px-3">SPQ</th>
                      <th className="py-3 px-4">PDIR No.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f3f4f6]">
                    {loading ? (
                      <tr>
                        <td colSpan={20} className="py-20 text-center text-[#6b7280]">
                          <div className="w-8 h-8 border-3 border-[#0a6ed1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          Loading ASN items…
                        </td>
                      </tr>
                    ) : filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={20} className="py-16 text-center text-[#6b7280]">
                          No items match the current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => {
                        const isSelected = selectedItemNos.includes(item.itemNo)
                        const unit = item.totalUnit || 'NO'

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
                                onChange={() => toggleSelectOne(item.itemNo)}
                                className="w-4 h-4 rounded accent-[#0a6ed1] cursor-pointer"
                              />
                            </td>

                            {/* Item No. */}
                            <td className="py-3 px-3 font-semibold text-[#1f2937]">
                              {item.itemNo}
                            </td>

                            {/* Schedule line */}
                            <td className="py-3 px-3 text-[#1f2937] font-semibold">
                              {item.schLine || '1'}
                            </td>

                            {/* Material: Code bold on top, Description below */}
                            <td className="py-3 px-4">
                              <div className="font-bold text-[#1f2937] leading-tight">{item.materialNumber}</div>
                              <div className="text-[12px] text-[#4b5563] leading-tight mt-0.5">{item.materialName}</div>
                            </td>

                            {/* Shipment Date */}
                            <td className="py-3 px-4 text-[#1f2937] font-medium">
                              {item.shipmentDate || '—'}
                            </td>

                            {/* Storage Location */}
                            <td className="py-3 px-3 text-[#1f2937] font-medium">
                              {item.storageLocation || 'RM02'}
                            </td>

                            {/* PO Qty. */}
                            <td className="py-3 px-3 text-[#1f2937]">
                              <span className="font-bold">{item.totalQty || item.poQty}</span>{' '}
                              <span className="text-[#4b5563] text-[12px]">{unit}</span>
                            </td>

                            {/* Conf.Qty */}
                            <td className="py-3 px-3 text-[#1f2937]">
                              <span className="font-bold">{item.confQty}</span>{' '}
                              <span className="text-[#4b5563] text-[12px]">{unit}</span>
                            </td>

                            {/* Delivered Qty */}
                            <td className="py-3 px-3 text-[#1f2937]">
                              <span className="font-bold">{item.deliveredQty}</span>{' '}
                              <span className="text-[#4b5563] text-[12px]">{unit}</span>
                            </td>

                            {/* ASN Created */}
                            <td className="py-3 px-3 text-[#1f2937]">
                              <span className="font-bold">{item.asnCreated}</span>{' '}
                              <span className="text-[#4b5563] text-[12px]">{unit}</span>
                            </td>

                            {/* Avl. ASN Qty (Editable input box followed by unit NO) */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  value={item.avlAsnQty}
                                  onChange={(e) => updateItem(item.itemNo, 'avlAsnQty', e.target.value)}
                                  className="w-16 h-8 px-2 text-center border border-[#d1d5db] rounded bg-white text-[13px] font-semibold text-[#1f2937] outline-none focus:border-[#0a6ed1]"
                                />
                                <span className="text-[#4b5563] font-medium text-[12px]">{unit}</span>
                              </div>
                            </td>

                            {/* Vendor Return Qty */}
                            <td className="py-3 px-3 text-[#6b7280]">
                              {item.vendorReturnQty || ''}
                            </td>

                            {/* Short GRN Qty */}
                            <td className="py-3 px-3 text-[#6b7280]">
                              {item.shortGrnQty || ''}
                            </td>

                            {/* Net Price (Blue text) */}
                            <td className="py-3 px-3">
                              <span className="text-[#0a6ed1] font-semibold cursor-pointer hover:underline">
                                {item.netPrice} INR
                              </span>
                            </td>

                            {/* Supplier Net Price (Editable input box) */}
                            <td className="py-3 px-3">
                              <input
                                type="text"
                                value={item.supplierNetPrice}
                                onChange={(e) => updateItem(item.itemNo, 'supplierNetPrice', e.target.value)}
                                className="w-20 h-8 px-2 text-left border border-[#d1d5db] rounded bg-white text-[13px] outline-none focus:border-[#0a6ed1]"
                              />
                            </td>

                            {/* Tax Mismatch (Toggle Switch) */}
                            <td className="py-3 px-3">
                              <TaxMismatchSwitch
                                value={item.taxMismatch}
                                onChange={(val) => updateItem(item.itemNo, 'taxMismatch', val)}
                              />
                            </td>

                            {/* Packing Material Type */}
                            <td className="py-3 px-4">
                              <select
                                value={item.packingMaterialType}
                                onChange={(e) => updateItem(item.itemNo, 'packingMaterialType', e.target.value)}
                                className="h-8 px-2 text-[13px] border border-[#d1d5db] rounded bg-white outline-none focus:border-[#0a6ed1]"
                              >
                                {PACKAGING_TYPES.map((pt) => (
                                  <option key={pt} value={pt}>
                                    {pt}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Packing Material Qty */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={item.packingMaterialQty}
                                  onChange={(e) => updateItem(item.itemNo, 'packingMaterialQty', e.target.value)}
                                  className="w-12 h-8 px-2 text-center border border-[#d1d5db] rounded bg-white text-[13px] outline-none focus:border-[#0a6ed1]"
                                />
                                <button
                                  type="button"
                                  onClick={() => setSplitBatchItem(item)}
                                  title="Split Quantity"
                                  className="text-[12px] text-[#0a6ed1] font-semibold hover:underline cursor-pointer"
                                >
                                  Split
                                </button>
                              </div>
                            </td>

                            {/* SPQ */}
                            <td className="py-3 px-3 text-[#1f2937] font-medium">
                              {item.spq || '41.000'}
                            </td>

                            {/* PDIR No. (Safe dropdown select) */}
                            <td className="py-3 px-4">
                              <select
                                value={item.pdirNo}
                                onChange={(e) => updateItem(item.itemNo, 'pdirNo', e.target.value)}
                                className="h-8 px-2 text-[13px] border border-[#d1d5db] rounded bg-white outline-none focus:border-[#0a6ed1] min-w-[120px]"
                              >
                                <option value="">Select</option>
                                {pdirRefs.map((p) => (
                                  <option key={p.value} value={p.value}>
                                    {p.label}
                                  </option>
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
          <div className="flex-1 bg-white p-3 sm:p-6 min-h-0 min-w-0">
            <AttachmentsPanel
              generalAttachments={generalAttachments}
              pdirAttachments={pdirAttachments}
              onUpload={(att) => {
                if (att.kind === 'general') setGeneralAttachments([...generalAttachments, att])
                else setPdirAttachments([...pdirAttachments, att])
              }}
              onRemove={(id, kind) => {
                if (kind === 'general') setGeneralAttachments(generalAttachments.filter((a) => a.id !== id))
                else setPdirAttachments(pdirAttachments.filter((a) => a.id !== id))
              }}
            />
          </div>
        )}
      </div>

      {/* Split Batch Modal */}
      <SplitBatchModal
        open={Boolean(splitBatchItem)}
        item={splitBatchItem}
        onClose={() => setSplitBatchItem(null)}
        onSave={handleSplitBatchSave}
      />

      {/* Success Dialog Modal */}
      {successModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(2px)' }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[460px] p-6 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-14 h-14 bg-[#dcfce7] text-[#16a34a] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="text-[20px] font-bold text-[#1f2937] mb-1">
              {successModal.isDraft ? 'Draft Saved Successfully!' : 'ASN Created Successfully!'}
            </h3>
            <p className="text-[13px] text-[#6b7280] mb-5">
              {successModal.isDraft
                ? 'Your ASN has been saved as draft.'
                : 'Your Advanced Shipping Notice has been generated.'}
            </p>

            <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-xl p-4 text-[13px] text-left space-y-2 mb-6">
              <div className="flex justify-between">
                <span className="text-[#6b7280]">ASN Number:</span>
                <strong className="text-[#0a6ed1]">{successModal.asnNum}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b7280]">PO Number:</span>
                <strong className="text-[#1f2937]">{successModal.poNo}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b7280]">Invoice Number:</span>
                <strong className="text-[#1f2937]">{successModal.invoiceNum}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6b7280]">Items Included:</span>
                <strong className="text-[#1f2937]">{successModal.count} items</strong>
              </div>
            </div>

            <button
              onClick={() => {
                setSuccessModal(null)
                navigate(-1)
              }}
              className="w-full py-2.5 bg-[#0a6ed1] text-white rounded-xl text-[14px] font-semibold hover:bg-[#085caf] transition-all cursor-pointer"
            >
              Back to Purchase Orders
            </button>
          </div>
        </div>
      )}
    </PageLayout>
  )
}
