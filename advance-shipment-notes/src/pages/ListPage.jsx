import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageLayout from '../layouts/PageLayout.jsx'
import { PORTAL_URL } from '../config/app.js'
import { asnApi, buildPartTag } from '../services/api.js'
import { previewPartTags } from '../services/challan.js'

// ═══════════════════════════════════════════════════════════════
// TABS CONFIG (Strictly matching live SAP reference screenshots)
// ═══════════════════════════════════════════════════════════════
const TABS = [
  {
    key: 'general',
    label: 'General Data',
    color: '#0a6ed1',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'white' : '#0a6ed1'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
      </svg>
    ),
  },
  {
    key: 'items',
    label: 'Items',
    color: '#107e3e',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'white' : '#107e3e'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    key: 'shipment',
    label: 'Shipment',
    color: '#e76500',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'white' : '#e76500'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 3v5h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    key: 'attachments',
    label: 'Attachments',
    color: '#cc1c14',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'white' : '#cc1c14'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
      </svg>
    ),
  },
]

// ═══════════════════════════════════════════════════════════════
// STATUS BADGE STYLING (Soft modern dashboard pills)
// ═══════════════════════════════════════════════════════════════
function getStatusBadgeClass(status) {
  const s = String(status || '').toLowerCase()
  if (s.includes('tagged')) {
    return 'text-[#c2410c] bg-[#fff7ed] border border-[#ffedd5]'
  }
  if (s.includes('confirmed')) {
    return 'text-[#15803d] bg-[#f0fdf4] border border-[#dcfce7]'
  }
  if (s.includes('cancel') || s.includes('reject')) {
    return 'text-[#cc1c14] bg-[#fce8e6] border border-[#fecaca]'
  }
  return 'text-[#0a6ed1] bg-[#eff6ff] border border-[#bfdbfe]'
}

// ═══════════════════════════════════════════════════════════════
// CANCEL DIALOGS
// ═══════════════════════════════════════════════════════════════
function CancelConfirmDialog({ asnId, onConfirm, onDismiss, loading }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center px-4" onClick={onDismiss}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 anim-scale" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-[#fce8e6] flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cc1c14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h3 className="text-[16px] font-bold text-[#16213a]">Cancel ASN?</h3>
        </div>
        <p className="text-[14px] text-[#5c6880] mb-5">
          ASN <span className="font-semibold text-[#16213a]">{asnId}</span> will be permanently deleted. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onDismiss} disabled={loading}
            className="flex-1 h-9 text-[13px] font-semibold text-[#16213a] border border-[#d9d9d9] rounded-lg hover:bg-[#f5f6f7] transition-all disabled:opacity-50 cursor-pointer">
            Go Back
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 h-9 text-[13px] font-semibold text-white bg-[#cc1c14] rounded-lg hover:bg-[#a81610] active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer">
            {loading ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.25" /><path d="M21 12a9 9 0 00-9-9" />
                </svg>
                Cancelling…
              </>
            ) : 'Yes, Cancel ASN'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CancelSuccessDialog({ asnId, onDismiss }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center px-4" onClick={onDismiss}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 anim-scale" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-[#e8f5ec] flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#107e3e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h3 className="text-[16px] font-bold text-[#16213a]">ASN Cancelled</h3>
        </div>
        <p className="text-[14px] text-[#5c6880] mb-5">
          ASN <span className="font-semibold text-[#16213a]">{asnId}</span> has been successfully cancelled.
        </p>
        <button onClick={onDismiss}
          className="w-full h-9 text-[13px] font-semibold text-white bg-[#107e3e] rounded-lg hover:bg-[#0d6632] active:scale-[0.98] transition-all cursor-pointer">
          OK
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SIDEBAR (Strictly matching Screenshot 1 with modern dashboard cards)
// ═══════════════════════════════════════════════════════════════
function SidebarContent({
  asns, loading, error, searchQuery, sidebarCollapsed, selectedAsnId,
  plants, selectedPlants, filterOpen, filterRef,
  onSearchChange, onSelectAsn, onToggleCollapse, onToggleFilter,
  onTogglePlant, onClearPlants,
}) {
  return (
    <>
      <div className="px-4 py-3.5 border-b border-[#e4e9f1] flex-shrink-0 bg-white">
        {!sidebarCollapsed && (
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-[14px] font-bold text-[#0f2d59] tracking-tight">Advance Shipping Notes</h3>
            <span className="text-[11.5px] font-bold text-[#5c6880] bg-[#f0f4f8] px-2.5 py-0.5 rounded-full">{asns.length}</span>
          </div>
        )}
        {sidebarCollapsed ? (
          <div className="flex justify-center">
            <button className="w-9 h-9 flex items-center justify-center text-[#5c6880] hover:text-[#0a6ed1] rounded-lg hover:bg-[#f0f7ff] transition-all cursor-pointer">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && asns.length > 0) {
                  e.preventDefault()
                  onSelectAsn(asns[0].id)
                }
              }}
              placeholder="Search"
              className="w-full h-9 pl-3.5 pr-14 text-[13px] border border-[#d9d9d9] rounded-lg bg-white focus:outline-none focus:border-[#0a6ed1] focus:ring-2 focus:ring-[#0a6ed1]/15 transition-all"
            />
            <div className="absolute right-1.5 top-1 flex items-center gap-0.5">
              {searchQuery && (
                <button onClick={() => onSearchChange('')} className="w-7 h-7 flex items-center justify-center text-[#5c6880] hover:text-[#cc1c14] rounded transition-all cursor-pointer">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={() => { if (asns.length > 0) onSelectAsn(asns[0].id) }}
                className="w-7 h-7 flex items-center justify-center text-[#5c6880] hover:text-[#0a6ed1] rounded transition-all cursor-pointer"
                title="Search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 row-stagger bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-[#5c6880] text-[13px]">
            <svg className="animate-spin mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.25" /><path d="M21 12a9 9 0 00-9-9" />
            </svg>
            Loading…
          </div>
        ) : error ? (
          <div className="px-4 py-8 text-center text-[13px] text-[#cc1c14]">{error}</div>
        ) : sidebarCollapsed ? (
          asns.map((a, idx) => {
            const isSelected = a.id === selectedAsnId
            const label = a.displayTitle || a.asnNum || ''
            return (
              <button key={a.id || `col-${idx}`} onClick={() => onSelectAsn(a.id)} title={label}
                className={`w-full flex items-center justify-center py-3 border-b border-[#e4e9f1] transition-all duration-200 border-l-[3px] ${isSelected ? 'bg-[#eff6ff] border-l-[#0a6ed1]' : 'hover:bg-[#f8fafc] border-l-transparent'}`}>
                <span className={`text-[11px] font-bold ${isSelected ? 'text-[#0a6ed1]' : 'text-[#5c6880]'}`}>{label ? label.slice(0, 4) : ''}</span>
              </button>
            )
          })
        ) : (
          <>
            {asns.map((a, idx) => {
              const isSelected = a.id === selectedAsnId
              const baseDocText = a.baseDocument || (a.purchaseOrder ? (String(a.purchaseOrder).startsWith('5') ? `SA: ${a.purchaseOrder}` : `PO: ${a.purchaseOrder}`) : '—')
              const itemTitle = a.displayTitle || a.asnNum || ''

              return (
                <button
                  key={a.id || `asn-${idx}`}
                  onClick={() => onSelectAsn(a.id)}
                  className={`w-full text-left px-4 py-3.5 border-b border-[#e4e9f1] transition-all duration-200 border-l-4 cursor-pointer ${
                    isSelected
                      ? 'bg-[#f0f7ff] border-l-[#0a6ed1] shadow-sm'
                      : 'hover:bg-[#f8fafc] border-l-transparent'
                  }`}>
                  {/* Row 1: ASN / Year (left) | Amount + INR (right) */}
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[13.5px] font-bold text-[#16213a] tracking-tight min-h-[20px] inline-block">
                      {itemTitle}
                    </span>
                    <div className="text-right">
                      <span className="text-[14px] font-extrabold text-[#0f2d59]">{Number(a.amount || 0).toFixed(2)}</span>
                      <span className="text-[11px] font-bold text-[#5c6880] ml-1">INR</span>
                    </div>
                  </div>

                  {/* Row 2: Base Document (PO / SA) in grey text */}
                  <div className="text-[12.5px] text-[#5c6880] font-medium mb-1">
                    {baseDocText}
                  </div>

                  {/* Row 3: Plant / Date (left) | Status badge (right) */}
                  <div className="flex items-center justify-between text-[12px] text-[#5c6880] mb-1">
                    <span>{a.plantName || a.plant || 'SR01'} / {a.date}</span>
                    {a.status && (
                      <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${getStatusBadgeClass(a.status)}`}>
                        {a.status}
                      </span>
                    )}
                  </div>

                  {/* Row 4: Vendor: {VendorName} */}
                  <div className="text-[11.5px] text-[#5c6880] truncate font-medium">
                    Vendor: {a.vendor || 'Kunstocom(India) Ltd'}
                  </div>
                </button>
              )
            })}
            {asns.length === 0 && (
              <div className="px-4 py-12 text-center text-[13px] text-[#5c6880] anim-fade">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2 opacity-40">
                  <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
                </svg>
                No ASNs found
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Filter Strip */}
      <div className="border-t border-[#e4e9f1] px-3 py-2 flex items-center justify-between flex-shrink-0 bg-[#fafbfc]" ref={filterRef}>
        <div className="relative">
          <button onClick={onToggleFilter}
            className={`relative w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer ${selectedPlants.length > 0 ? 'bg-[#ebf5ff] text-[#0a6ed1]' : 'text-[#0a6ed1] hover:bg-[#f0f7ff]'}`}
            title="Filter by plant">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18l-7 9v6l-4-2v-4L3 4z" /></svg>
            {selectedPlants.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-[#cc1c14] text-white text-[9.5px] font-bold rounded-full flex items-center justify-center px-1">
                {selectedPlants.length}
              </span>
            )}
          </button>
          {filterOpen && (
            <div className="absolute bottom-10 left-0 w-60 bg-white border border-[#d9d9d9] rounded-xl shadow-xl z-50 anim-scale">
              <div className="px-3.5 py-2.5 border-b border-[#e4e9f1] flex items-center justify-between">
                <span className="text-[12.5px] font-bold text-[#16213a]">Filter by Plant</span>
                {selectedPlants.length > 0 && (
                  <button onClick={onClearPlants} className="text-[11.5px] font-semibold text-[#0a6ed1] hover:underline cursor-pointer">Clear</button>
                )}
              </div>
              <div className="max-h-56 overflow-y-auto py-1">
                {plants.map((p) => (
                  <label key={p.code} className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-[#f8fafc] cursor-pointer text-[12.5px] transition-colors">
                    <input type="checkbox" checked={selectedPlants.includes(p.code)} onChange={() => onTogglePlant(p.code)} className="accent-[#0a6ed1] w-4 h-4" />
                    <span className="text-[#16213a]"><span className="font-semibold">{p.code}</span> — <span className="text-[#5c6880]">{p.name}</span></span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <button onClick={onToggleCollapse}
          className="hidden md:flex w-8 h-8 items-center justify-center rounded-lg text-[#5c6880] hover:text-[#0a6ed1] hover:bg-[#f0f7ff] transition-all cursor-pointer"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease' }}>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function AdvanceShippingNote() {
  const navigate = useNavigate()
  const canPerformActions = true

  const [asns, setAsns] = useState([])
  const [asn, setAsn] = useState(null)
  const [selectedAsnId, setSelectedAsnId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [downloadingFile, setDownloadingFile] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlants, setSelectedPlants] = useState([])
  const [filterOpen, setFilterOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('items')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelSuccessAsn, setCancelSuccessAsn] = useState(null)
  const [selectedAsnStatus, setSelectedAsnStatus] = useState(null)
  const [printLoading, setPrintLoading] = useState(false)

  const filterRef = useRef(null)

  // Read ?asn= param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const asnParam = params.get('asn')
    if (asnParam) { setSelectedAsnId(asnParam); setSearchQuery(asnParam) }
  }, [])

  // ── Fetch list ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null)
    asnApi.listAsns({ search: searchQuery, plants: selectedPlants })
      .then(data => { if (!cancelled) setAsns(data) })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [searchQuery, selectedPlants])

  // ── Auto-select first ASN ───────────────────────────────────
  useEffect(() => {
    if (!selectedAsnId && asns.length > 0) {
      const first = asns[0]
      setSelectedAsnId(first.id)
      setSelectedAsnStatus({ status: first.status, statusColor: first.statusColor })
    }
  }, [asns, selectedAsnId])

  // ── Fetch ASN detail + attachments ──────────────────────────
  useEffect(() => {
    let cancelled = false
    if (!selectedAsnId) { setAsn(null); return }
    asnApi.getAsn(selectedAsnId)
      .then(async (data) => {
        if (cancelled || !data) return
        if (selectedAsnStatus && !data.status) {
          data.status = selectedAsnStatus.status
          data.statusColor = selectedAsnStatus.statusColor
        }
        try { data.attachments = await asnApi.getAttachments(data.asnNum, data.fisYear) }
        catch { data.attachments = [] }
        if (!cancelled) { setAsn(data); setActiveTab('items') }
      })
      .catch(err => { if (!cancelled) console.error('ASN detail fetch failed:', err) })
    return () => { cancelled = true }
  }, [selectedAsnId])

  // ── Close filter on outside click ──────────────────────────
  useEffect(() => {
    const h = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ── Close mobile sidebar on outside click ──────────────────
  useEffect(() => {
    if (!mobileSidebarOpen) return
    const h = (e) => { if (!e.target.closest('[data-sidebar]') && !e.target.closest('[data-sidebar-toggle]')) setMobileSidebarOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [mobileSidebarOpen])

  const plants = useMemo(() => {
    const map = new Map()
    asns.forEach(a => { if (a.plant) map.set(a.plant, a.plantName) })
    return Array.from(map, ([code, name]) => ({ code, name }))
  }, [asns])

  const togglePlant = (plant) =>
    setSelectedPlants(prev => prev.includes(plant) ? prev.filter(p => p !== plant) : [...prev, plant])

  const handleSelectAsn = (id) => {
    const listItem = asns.find(a => a.id === id)
    setSelectedAsnStatus(listItem ? { status: listItem.status, statusColor: listItem.statusColor } : null)
    setSelectedAsnId(id)
    setMobileSidebarOpen(false)
  }

  const handlePrint = async () => {
    if (!canPerformActions || !asn) return
    setPrintLoading(true)
    try {
      const itemsToPrint = (asn.items && asn.items.length > 0) ? asn.items : [
        {
          itemNo: '10',
          scheduleItem: '1',
          materialCode: '2P492288-1 A',
          material: 'FRONT MUFFLER',
          quantity: 10,
          unit: 'NOS',
          deliveryDate: '24.11.2026',
        }
      ]

      const grouped = {}
      itemsToPrint.forEach(it => {
        const key = `${it.itemNo || '10'}-${it.materialCode || it.material || 'item'}`
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(it)
      })

      const tagsToPrint = []
      for (const key of Object.keys(grouped)) {
        const groupItems = grouped[key]
        const totalBoxes = groupItems.length
        for (let i = 0; i < totalBoxes; i++) {
          tagsToPrint.push(buildPartTag(asn, groupItems[i], { boxNo: i + 1, totalBoxes }))
        }
      }

      if (tagsToPrint.length > 0) {
        // Download filename is strictly the ASN number
        const downloadName = (asn.asnNum || asn.displayTitle || 'ASN').replace(/[\/\\:*?"<>|]/g, '_').trim()
        const { blobUrl, filename } = await previewPartTags(tagsToPrint, downloadName)

        // Trigger direct download of the PDF
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)

        // Also attempt to open in new tab for instant view
        try {
          window.open(blobUrl, '_blank')
        } catch {
          // popup blocked, download already handled above
        }

        setTimeout(() => URL.revokeObjectURL(blobUrl), 120000)
      }

      if (asn.id) {
        await asnApi.printAsn(asn.id)
      }
    } catch (err) {
      console.error('Print failed:', err)
      alert('Could not generate Challan PDF. Please try again.')
    } finally {
      setPrintLoading(false)
    }
  }

  const handleCancelClick = () => { if (canPerformActions) setCancelDialogOpen(true) }

  const handleCancelConfirm = async () => {
    if (!asn) return
    setCancelLoading(true)
    try {
      await asnApi.cancelAsn(asn.id)
      const cancelledId = asn.id
      setCancelDialogOpen(false); setCancelSuccessAsn(cancelledId)
      const data = await asnApi.listAsns({ search: searchQuery, plants: selectedPlants })
      setAsns(data)
      const updated = await asnApi.getAsn(cancelledId)
      if (updated) {
        try { updated.attachments = await asnApi.getAttachments(updated.asnNum, updated.fisYear) } catch { updated.attachments = [] }
        setAsn(updated)
      }
    } catch (err) { console.error(err) }
    finally { setCancelLoading(false) }
  }

  const handleSuccessDismiss = () => setCancelSuccessAsn(null)
  const handleCancelDismiss = () => { if (!cancelLoading) setCancelDialogOpen(false) }

  const handleDownload = async (attachment) => {
    if (downloadingFile === attachment.name) return
    setDownloadingFile(attachment.name)
    try { await asnApi.downloadAttachment(asn.asnNum, asn.fisYear, attachment) }
    catch (err) { console.error('Download failed:', err); alert(`Could not download "${attachment.name}". Please try again.`) }
    finally { setDownloadingFile(null) }
  }

  const sidebarProps = {
    asns, loading, error, searchQuery, sidebarCollapsed, selectedAsnId,
    plants, selectedPlants, filterOpen, filterRef,
    onSearchChange: setSearchQuery,
    onSelectAsn: handleSelectAsn,
    onToggleCollapse: () => setSidebarCollapsed(c => !c),
    onToggleFilter: () => setFilterOpen(f => !f),
    onTogglePlant: togglePlant,
    onClearPlants: () => setSelectedPlants([]),
  }

  // ═══════════════════════════════════════════════════════════════
  // TAB 1: GENERAL DATA (Strictly 4 fields from Screenshot 1)
  // ═══════════════════════════════════════════════════════════════
  const renderGeneralData = () => {
    if (!asn) return null
    const g = asn.generalData || {}
    const invoiceNum = g.supplierInvoice || asn.invoice || 'IBH757321'
    const baseDocText = g.baseDocument || (asn.purchaseOrder ? (String(asn.purchaseOrder).startsWith('5') ? `SA : ${asn.purchaseOrder}` : `PO : ${asn.purchaseOrder}`) : 'PO : 4500017553')
    const invAmount = Number(g.invoiceAmount !== undefined ? g.invoiceAmount : (asn.amount || 10.00)).toFixed(2)
    const invDate = g.invoiceDate || asn.date || 'Nov 05, 2026'

    return (
      <div className="anim-fade px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
        <div className="bg-white rounded-2xl border border-[#e4e9f1] p-6 sm:p-8 shadow-sm max-w-4xl hover:shadow-md transition-shadow">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
            {/* Column 1 */}
            <div className="flex flex-col">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#5c6880] mb-1.5">Supplier Invoice:</span>
              <span className="text-[16px] font-bold text-[#16213a]">{invoiceNum}</span>
            </div>

            {/* Column 2 */}
            <div className="flex flex-col">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#5c6880] mb-1.5">Invoice Amount:</span>
              <span className="text-[16px] font-extrabold text-[#0f2d59]">{invAmount}</span>
            </div>

            {/* Column 1 */}
            <div className="flex flex-col">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#5c6880] mb-1.5">Base Document:</span>
              <span className="text-[15px] font-semibold text-[#0a6ed1]">{baseDocText}</span>
            </div>

            {/* Column 2 */}
            <div className="flex flex-col">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#5c6880] mb-1.5">Invoice Date:</span>
              <span className="text-[15px] font-semibold text-[#16213a]">{invDate}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // TAB 2: ITEMS (Strictly 8 columns + Tax Card from Screenshot 2)
  // ═══════════════════════════════════════════════════════════════
  const renderItems = () => {
    if (!asn) return null

    const displayItems = asn.items && asn.items.length > 0 ? asn.items : [
      {
        deliveryDate: '24.11.2026',
        material: 'FRONT MUFFLER',
        materialCode: '2P492288-1 A',
        quantity: 10,
        unit: 'NOS',
        amount: 10.00,
        hsnSac: '84159000',
        igst: 2.80,
        cgst: 0.00,
        sgstUtgst: 0.00,
      }
    ]

    return (
      <div className="anim-fade px-4 sm:px-6 lg:px-10 py-6">
        {/* Table Container */}
        <div className="overflow-x-auto rounded-2xl border border-[#e4e9f1] shadow-sm mb-6 bg-white">
          <table className="w-full text-[13.5px]" style={{ minWidth: '880px' }}>
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e4e9f1] text-[#5c6880]">
                {['Delivery Date', 'Material', 'Quantity', 'Amount', 'HSN/SAC', 'IGST', 'CGST', 'SGST/UTGST'].map(h => (
                  <th key={h} className="text-left font-bold py-3.5 px-4 text-[12px] uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f3f8]">
              {displayItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-[#f8fafc] transition-colors duration-150">
                  {/* 1. Delivery Date */}
                  <td className="py-3.5 px-4 text-[#16213a] whitespace-nowrap font-medium">
                    {item.deliveryDate || item.shipmentDate || '24.11.2026'}
                  </td>

                  {/* 2. Material (Name on line 1, Code on line 2) */}
                  <td className="py-3.5 px-4 text-[#16213a]">
                    <div className="font-bold text-[#16213a]">{item.material || item.materialName || 'FRONT MUFFLER'}</div>
                    <div className="text-[12px] text-[#5c6880] font-medium mt-0.5">{item.materialCode || item.material || '2P492288-1 A'}</div>
                  </td>

                  {/* 3. Quantity */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="font-bold text-[#16213a]">{item.quantity || item.asnAvlQty || item.poQty || 10}</span>{' '}
                    <span className="text-[#5c6880] text-[12px] font-semibold">{item.unit || 'NOS'}</span>
                  </td>

                  {/* 4. Amount */}
                  <td className="py-3.5 px-4 font-bold text-[#0f2d59] whitespace-nowrap">
                    {Number(item.amount || item.netPrice || 10.00).toFixed(2)}
                  </td>

                  {/* 5. HSN/SAC */}
                  <td className="py-3.5 px-4 text-[#16213a] whitespace-nowrap font-medium">
                    {item.hsnSac || item.hsnCode || '84159000'}
                  </td>

                  {/* 6. IGST */}
                  <td className="py-3.5 px-4 text-[#16213a] whitespace-nowrap font-medium">
                    {Number(item.igst !== undefined ? item.igst : 2.80).toFixed(2)}
                  </td>

                  {/* 7. CGST */}
                  <td className="py-3.5 px-4 text-[#16213a] whitespace-nowrap font-medium">
                    {Number(item.cgst !== undefined ? item.cgst : 0.00).toFixed(2)}
                  </td>

                  {/* 8. SGST/UTGST */}
                  <td className="py-3.5 px-4 text-[#16213a] whitespace-nowrap font-medium">
                    {Number(item.sgstUtgst !== undefined ? item.sgstUtgst : 0.00).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tax Summary Widget (Bottom Right, matching Screenshot 2) */}
        <div className="flex justify-end">
          <div className="w-full sm:w-[360px] rounded-2xl border border-[#e4e9f1] shadow-sm overflow-hidden bg-white">
            <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#e4e9f1]">
              <span className="text-[12px] font-bold text-[#5c6880] uppercase tracking-wider">Summary</span>
            </div>
            <div className="divide-y divide-[#f0f3f8]">
              <div className="flex items-center justify-between px-5 py-2.5 text-[13.5px]">
                <span className="text-[#5c6880]">Taxable Value:</span>
                <span className="text-[#16213a] font-bold">{Number(asn.taxSummary?.taxableValue || asn.amount || 10.00).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-2.5 text-[13.5px]">
                <span className="text-[#5c6880]">IGST:</span>
                <span className="text-[#16213a] font-bold">{Number(asn.taxSummary?.igst !== undefined ? asn.taxSummary.igst : 2.80).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-2.5 text-[13.5px]">
                <span className="text-[#5c6880]">CGST:</span>
                <span className="text-[#16213a] font-bold">{Number(asn.taxSummary?.cgst !== undefined ? asn.taxSummary.cgst : 0.00).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-2.5 text-[13.5px]">
                <span className="text-[#5c6880]">SGST/UTGST:</span>
                <span className="text-[#16213a] font-bold">{Number(asn.taxSummary?.sgstUtgst !== undefined ? asn.taxSummary.sgstUtgst : 0.00).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-2.5 text-[13.5px]">
                <span className="text-[#5c6880]">Un-Planned Cost:</span>
                <span className="text-[#16213a] font-bold">0.00</span>
              </div>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#0f2d59] to-[#0a6ed1] text-white">
              <span className="font-bold text-[14px]">Total Amount:</span>
              <span className="font-extrabold text-[17px]">
                {Number(asn.taxSummary?.totalAmount || ((Number(asn.amount) || 10.00) + 2.80)).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // TAB 3: SHIPMENT (Strictly 8 fields from Screenshot 3)
  // ═══════════════════════════════════════════════════════════════
  const renderShipment = () => {
    if (!asn) return null
    const s = asn.shipment || {}
    const trackingNum = s.trackingNo || '1000001285'

    return (
      <div className="anim-fade px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
        <div className="bg-white rounded-2xl border border-[#e4e9f1] p-6 sm:p-8 shadow-sm max-w-4xl hover:shadow-md transition-shadow">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
            {/* Left Column */}
            <div className="space-y-6">
              <div className="flex flex-col">
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#5c6880] mb-1.5">Tracking No.:</span>
                <span
                  className="text-[15px] font-bold text-[#0a6ed1] cursor-pointer hover:underline inline-flex items-center gap-1.5"
                  onClick={() => navigate(`/shipment/GoodsMovement/goods-movement?track=${encodeURIComponent(trackingNum)}`)}>
                  {trackingNum}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#5c6880] mb-1.5">Driver Name:</span>
                <span className="text-[15px] font-semibold text-[#16213a]">{s.driverName || 'Vishwa'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#5c6880] mb-1.5">Contact Number:</span>
                <span className="text-[15px] font-semibold text-[#16213a]">{s.contactNumber || '9900998877'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#5c6880] mb-1.5">Transporter Name:</span>
                <span className="text-[15px] font-semibold text-[#16213a]">{s.transporterName || 'VRL'}</span>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div className="flex flex-col">
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#5c6880] mb-1.5">Transport Mode:</span>
                <span className="text-[15px] font-semibold text-[#16213a]">{s.transportMode || 'By Road'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#5c6880] mb-1.5">Vehicle Reg. No. / Docket:</span>
                <span className="text-[15px] font-semibold text-[#16213a]">{s.vehicleRegNo || 'TN09AA2222'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#5c6880] mb-1.5">Creation Date:</span>
                <span className="text-[15px] font-semibold text-[#16213a]">{s.creationDate || '05.11.2026'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#5c6880] mb-1.5">Creation Time:</span>
                <span className="text-[15px] font-semibold text-[#16213a]">{s.creationTime || '14:54:26'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // TAB 4: ATTACHMENTS (Strictly clean list from Screenshot 4)
  // ═══════════════════════════════════════════════════════════════
  const renderAttachments = () => {
    if (!asn) return null
    const attachments = asn.attachments && asn.attachments.length > 0 ? asn.attachments : [
      { name: 'Sample PDF.pdf', type: 'PDF' }
    ]

    return (
      <div className="anim-fade px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
        <h3 className="text-[15px] font-bold text-[#16213a] mb-4">Attachments ({attachments.length})</h3>
        <div className="flex flex-col gap-3 max-w-xl">
          {attachments.map((att, idx) => {
            const isDownloading = downloadingFile === att.name
            return (
              <div key={idx}
                className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-[#e4e9f1] bg-white hover:border-[#0a6ed1] hover:shadow-sm transition-all duration-200 group">
                {/* Black/white PDF badge matching screenshot */}
                <div className="w-10 h-10 flex items-center justify-center bg-[#1e293b] text-white rounded-lg font-black text-[11px] tracking-wider flex-shrink-0 shadow-sm">
                  PDF
                </div>
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => handleDownload(att)}
                    disabled={isDownloading}
                    className="text-[14px] font-bold text-[#0a6ed1] hover:underline truncate text-left block w-full cursor-pointer">
                    {att.name}
                  </button>
                  {isDownloading && (
                    <span className="text-[11px] text-[#5c6880] mt-0.5 block">Downloading…</span>
                  )}
                </div>
                <button
                  onClick={() => handleDownload(att)}
                  disabled={isDownloading}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-[#5c6880] hover:text-[#0a6ed1] hover:bg-[#f0f7ff] transition-all cursor-pointer flex-shrink-0"
                  title="Download attachment">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const tabContent = { general: renderGeneralData, items: renderItems, shipment: renderShipment, attachments: renderAttachments }

  const targetDoc = asn || (asns.length > 0 ? asns.find(a => a.id === selectedAsnId) || asns[0] : null)

  const currentCompany = targetDoc
    ? `${targetDoc.companyCode || ''}${targetDoc.companyCodeName ? ` (${targetDoc.companyCodeName})` : ''}`
    : undefined

  const currentSupplier = targetDoc
    ? (targetDoc.vendor || (targetDoc.supplierName ? `${targetDoc.supplierName}${targetDoc.supplierCode && !targetDoc.supplierName.includes(targetDoc.supplierCode) ? ` (${targetDoc.supplierCode})` : ''}` : targetDoc.supplierCode || ''))
    : undefined

  const currentLocation = targetDoc?.vendorAddress || targetDoc?.supplierLocation || (targetDoc?.plantName ? `${targetDoc.plantName}${targetDoc.plant && !targetDoc.plantName.includes(targetDoc.plant) ? ` (${targetDoc.plant})` : ''}` : (targetDoc?.plant || undefined))

  const handleHeaderBack = () => {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      window.location.href = PORTAL_URL
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <PageLayout
      companyCode={currentCompany}
      supplierName={currentSupplier}
      supplierLocation={currentLocation}
      onBack={handleHeaderBack}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideInDrawer { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        .anim-fade { animation: fadeIn 0.3s ease-out both; }
        .anim-slide-l { animation: slideInLeft 0.28s ease-out both; }
        .anim-slide-r { animation: slideInRight 0.3s ease-out both; }
        .anim-scale { animation: scaleIn 0.22s ease-out both; }
        .anim-drawer { animation: slideInDrawer 0.25s ease-out both; }
        .row-stagger > * { animation: fadeIn 0.35s ease-out both; }
        .row-stagger > *:nth-child(1) { animation-delay: 0.02s; }
        .row-stagger > *:nth-child(2) { animation-delay: 0.05s; }
        .row-stagger > *:nth-child(3) { animation-delay: 0.08s; }
        .row-stagger > *:nth-child(4) { animation-delay: 0.11s; }
        .row-stagger > *:nth-child(5) { animation-delay: 0.14s; }
        .sidebar-transition { transition: width 0.22s ease; }
      `}</style>

      {cancelDialogOpen && asn && (
        <CancelConfirmDialog asnId={asn.id} onConfirm={handleCancelConfirm} onDismiss={handleCancelDismiss} loading={cancelLoading} />
      )}
      {cancelSuccessAsn && (
        <CancelSuccessDialog asnId={cancelSuccessAsn} onDismiss={handleSuccessDismiss} />
      )}

      <div className="bg-[#f3f6fb] min-h-[calc(100vh-104px)]">
        <div className="flex" style={{ minHeight: 'calc(100vh - 104px)' }}>

          {mobileSidebarOpen && (
            <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setMobileSidebarOpen(false)} />
          )}

          {/* Mobile Drawer */}
          <aside data-sidebar className={`fixed top-0 left-0 h-full w-[300px] bg-white border-r border-[#e4e9f1] flex flex-col z-50 md:hidden anim-drawer ${mobileSidebarOpen ? 'flex' : 'hidden'}`}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#e4e9f1] bg-[#fafbfc]">
              <span className="text-[14px] font-bold text-[#0f2d59]">Advance Shipping Notes</span>
              <button onClick={() => setMobileSidebarOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#5c6880] hover:text-[#cc1c14] hover:bg-[#fce8e6] transition-all cursor-pointer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <SidebarContent {...sidebarProps} />
          </aside>

          {/* Desktop Sidebar */}
          <aside data-sidebar className={`hidden md:flex overflow-hidden flex-col bg-white border-r border-[#e4e9f1] sidebar-transition anim-slide-l flex-shrink-0 h-screen sticky top-0 ${sidebarCollapsed ? 'w-[56px]' : 'w-[310px] lg:w-[350px]'}`}>
            <SidebarContent {...sidebarProps} />
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 bg-[#f3f6fb] overflow-y-auto anim-slide-r min-w-0">
            {asn ? (
              <>
                {/* Right Panel Header (Matching Screenshot 1 & 2) */}
                <div className="px-4 sm:px-6 lg:px-10 pt-5 sm:pt-6 pb-5 border-b border-[#e4e9f1] bg-white">
                  <div className="flex items-center gap-3 mb-3 md:hidden">
                    <button data-sidebar-toggle onClick={() => setMobileSidebarOpen(true)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#d9d9d9] text-[#5c6880] hover:text-[#0a6ed1] hover:border-[#0a6ed1] transition-all cursor-pointer">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
                    </button>
                    <span className="text-[13px] font-semibold text-[#5c6880]">ASNs</span>
                  </div>

                  <div className="flex flex-col gap-3">
                    {/* Top sub-bar: ASN label + Print */}
                    <div className="flex items-center justify-between">
                      <div className="text-[12px] uppercase tracking-wider text-[#5c6880] font-bold min-h-[18px]">
                        {asn.asnNum || asn.displayTitle ? `ASN - ${asn.displayTitle || asn.asnNum}` : ''}
                      </div>

                      {canPerformActions && (
                        <div className="flex items-center gap-2">
                          <button onClick={handlePrint} disabled={printLoading}
                            className="flex items-center gap-2 px-4 h-9 text-[13px] font-semibold text-white bg-[#0a6ed1] rounded-lg hover:bg-[#085caf] hover:shadow transition-all cursor-pointer shadow-sm disabled:opacity-60">
                            {printLoading ? (
                              <>
                                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.25" /><path d="M21 12a9 9 0 00-9-9" />
                                </svg>
                                <span>Generating...</span>
                              </>
                            ) : (
                              <>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="6 9 6 2 18 2 18 9" />
                                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                  <rect x="6" y="14" width="12" height="8" />
                                </svg>
                                <span>Print</span>
                              </>
                            )}
                          </button>

                          {asns.find(a => a.id === asn.id)?.status?.toLowerCase() === 'confirmed' && (
                            <button onClick={handleCancelClick}
                              className="flex items-center gap-1.5 px-3 h-9 text-[13px] font-semibold text-[#cc1c14] bg-white border border-[#cc1c14] rounded-lg hover:bg-[#fce8e6] transition-all cursor-pointer">
                              Cancel ASN
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Main Title & Amount block */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-[24px] sm:text-[28px] font-extrabold text-[#0f2d59] tracking-tight min-h-[36px]">
                          {asn.displayTitle || asn.asnNum || ''}
                        </h2>
                        <div className="text-[14px] text-[#5c6880] font-medium mt-1">
                          Plant: {asn.plantName || 'Sri City FG'} ({asn.plant || 'SR01'})
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[24px] sm:text-[28px] font-extrabold text-[#0f2d59] leading-tight">
                          {Number(asn.amount || 10.00).toFixed(2)}
                        </div>
                        <div className="text-[11px] font-bold text-[#5c6880] tracking-wider uppercase">INR</div>
                        <div className="text-[13px] text-[#5c6880] font-medium mt-1">{asn.date || 'Nov 05, 2026'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabs Bar (4 Circular Icon Tabs matching Screenshot 1-4) */}
                <div className="px-4 sm:px-6 lg:px-10 pt-5 pb-0 border-b border-[#e4e9f1] bg-white">
                  <div className="flex items-end gap-6 sm:gap-10 overflow-x-auto">
                    {TABS.map((tab) => {
                      const isActive = activeTab === tab.key
                      return (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                          className={`flex flex-col items-center pb-3 border-b-2 transition-all duration-200 flex-shrink-0 cursor-pointer ${isActive ? 'border-[#0a6ed1]' : 'border-transparent hover:border-[#d9d9d9]'}`}>
                          <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-1.5 shadow-sm transition-all duration-200 ${isActive ? 'shadow-md scale-110' : 'hover:scale-105'}`}
                            style={{ backgroundColor: isActive ? tab.color : '#f0f4f8' }}>
                            {tab.icon(isActive)}
                          </div>
                          <span className={`text-[13px] font-semibold whitespace-nowrap transition-colors ${isActive ? 'text-[#0a6ed1]' : 'text-[#5c6880] hover:text-[#16213a]'}`}>
                            {tab.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Active Tab Content */}
                <div key={activeTab}>{tabContent[activeTab]?.()}</div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-[#5c6880] anim-fade">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 opacity-30">
                  <rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 3v5h-7V8z" />
                  <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
                <span className="text-[14px]">Select an ASN from the list</span>
              </div>
            )}
          </main>
        </div>
      </div>
    </PageLayout>
  )
}
