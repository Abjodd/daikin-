import { useState, useMemo, useEffect } from 'react'
import PageLayout from '../layouts/PageLayout.jsx'
import CreateMovement from './createMovement.jsx'
import { goodsMovementApi, authConfig } from '../services/GoodsMovement.js'
import { useNavigate } from 'react-router-dom'
import { generateShipmentNote } from '../services/generateShipmentNote.js'
import { getAsnAppUrl } from '../config/app.js'
import {
  FilePlus, Truck, Clock, ChevronRight, RefreshCw, X, Printer, Search,
  Car, ShieldCheck, HardHat, CalendarDays, Phone, User, Hash, Banknote,
  Edit3, Barcode, CheckCircle2, ChevronLeft, Files, LogIn, PackageCheck,
  Building, PlayCircle, AlertTriangle
} from 'lucide-react'
import { useUser } from '../context/UserContext.jsx'

// ═══════════════════════════════════════════════════════════════
// TIMELINE DEFINITION (6 STEPS TOTAL)
// ═══════════════════════════════════════════════════════════════
const TIMELINE_STEPS = [
  { key: 'created',        label: 'Created',         Icon: FilePlus     },
  { key: 'shipped',        label: 'Shipped',         Icon: Truck        },
  { key: 'gate_reporting', label: 'Gate Reporting',  Icon: Clock        },
  { key: 'gate_entry',     label: 'Gate Entry (IN)', Icon: LogIn        },
  { key: 'goods_received', label: 'Goods Received',  Icon: PackageCheck },
  { key: 'completed',      label: 'Completed',       Icon: Building     },
]

export default function GoodsMovement() {
  const { loginId, loginType } = useUser()

  authConfig.loginId = loginId
  authConfig.loginType = loginType

  const navigate = useNavigate()
  const [trackings, setTrackings] = useState([])
  const [tracking, setTracking] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('timeline') // 'timeline' | 'asn'
  const [timelinePage, setTimelinePage] = useState(0) // 0: Page 1, 1: Page 2
  const [showCreateMovement, setShowCreateMovement] = useState(false)
  const [editTrackingData, setEditTrackingData] = useState(null)
  const [printLoading, setPrintLoading] = useState(false)

  // Edit Details Modal State
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    asn: '',
    vehicleNumber: '',
    invoiceNumber: '',
  })
  const [editSaving, setEditSaving] = useState(false)
  const [editSuccessMsg, setEditSuccessMsg] = useState('')

  // Select ASN Value Help Modal State
  const [asnHelpOpen, setAsnHelpOpen] = useState(false)
  const [asnHelpSearch, setAsnHelpSearch] = useState('')
  const [asnHelpList, setAsnHelpList] = useState([])

  // Cancel Movement Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelError, setCancelError] = useState(null)
  const [cancelSuccess, setCancelSuccess] = useState(false)

  // Start Shipment State
  const [shipmentLoading, setShipmentLoading] = useState(false)
  const [shipmentModalOpen, setShipmentModalOpen] = useState(false)
  const [shipmentModalMsg, setShipmentModalMsg] = useState('')

  // Load tracking list
  useEffect(() => {
    let cancelled = false
    goodsMovementApi.listTrackings({ search: searchQuery })
      .then((data) => {
        if (!cancelled) {
          setTrackings(data)
          if (data.length && !selectedId) {
            setSelectedId(data[0].id)
          }
        }
      })
      .catch((err) => console.error(err))
    return () => { cancelled = true }
  }, [searchQuery])

  // Load detail on selection
  useEffect(() => {
    let cancelled = false
    if (!selectedId) {
      setTracking(null)
      return
    }
    goodsMovementApi.getTracking(selectedId)
      .then((data) => {
        if (!cancelled && data) {
          setTracking(data)
          setTimelinePage(0)
          // Prep edit modal form
          setEditForm({
            asn: data.asns?.[0]?.asnId || '',
            vehicleNumber: data.vehicleRegNo || data.vehicleNo || '',
            invoiceNumber: data.asns?.[0]?.invoiceNumber || '',
          })
        }
      })
      .catch((err) => console.error(err))
    return () => { cancelled = true }
  }, [selectedId])

  // Open Edit Details Modal
  const handleOpenEditDetails = () => {
    if (!tracking) return
    setEditForm({
      asn: tracking.asns?.[0]?.asnId || '2600000243',
      vehicleNumber: tracking.vehicleRegNo || tracking.vehicleNo || 'xfgb',
      invoiceNumber: tracking.asns?.[0]?.invoiceNumber || 'YYYYY2026',
    })
    setEditModalOpen(true)
  }

  // Open ASN Value Help dialog
  const handleOpenAsnHelp = () => {
    goodsMovementApi.searchAsns({ search: asnHelpSearch })
      .then((data) => {
        setAsnHelpList(data)
        setAsnHelpOpen(true)
      })
      .catch(console.error)
  }

  // Select ASN from Value Help dialog
  const handleSelectAsn = (selected) => {
    setEditForm((prev) => ({
      ...prev,
      asn: selected.asnId,
      invoiceNumber: selected.invoiceNumber || prev.invoiceNumber,
      vehicleNumber: selected.vehicleNumber || prev.vehicleNumber,
    }))
    setAsnHelpOpen(false)
  }

  // Save Edit Details Modal
  const handleSaveEditDetails = async () => {
    if (!tracking) return
    setEditSaving(true)
    try {
      await goodsMovementApi.updateTracking(tracking.id, {
        asnNo: editForm.asn,
        vehicleNumber: editForm.vehicleNumber,
        invoiceNumber: editForm.invoiceNumber,
        companyCode: tracking.companyCode,
        supplierCode: tracking.supplier,
        plant: tracking.asns?.[0]?.plant || 'SR01',
        invoiceDate: tracking.asns?.[0]?.invoiceDate || 'Nov 13, 2026',
        invoiceAmount: tracking.asns?.[0]?.invoiceAmount || 12.0,
        invoiceValue: tracking.asns?.[0]?.invoiceValue || 12.0,
      })
      setEditModalOpen(false)
      setEditSuccessMsg('Tracking details updated successfully')
      setTimeout(() => setEditSuccessMsg(''), 4000)

      // Reload tracking
      const refreshed = await goodsMovementApi.getTracking(tracking.id)
      setTracking(refreshed)
      const list = await goodsMovementApi.listTrackings({ search: searchQuery })
      setTrackings(list)
    } catch (err) {
      console.error('Update failed:', err)
    } finally {
      setEditSaving(false)
    }
  }

  // Print Tracking
  const handlePrint = async () => {
    if (!tracking || printLoading) return
    setPrintLoading(true)
    try {
      await generateShipmentNote(tracking)
    } catch (err) {
      console.error('Print failed:', err)
    } finally {
      setPrintLoading(false)
    }
  }

  // Confirm Cancel Movement
  const handleConfirmCancelMovement = async () => {
    if (!tracking) return
    setCancelLoading(true)
    setCancelError(null)
    try {
      await goodsMovementApi.cancelTracking(tracking.id, tracking.asns || [])
      tracking.status = 'Cancelled'
      tracking.statusColor = 'red'
      if (tracking.asns) {
        tracking.asns.forEach((a) => { a.isCancelled = 'X' })
      }
      setTracking({ ...tracking })
      setCancelSuccess(true)
      goodsMovementApi.listTrackings({ search: searchQuery }).then(setTrackings)
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel movement. Please try again.')
    } finally {
      setCancelLoading(false)
    }
  }

  // Handle Start Shipment
  const handleStartShipment = async () => {
    if (!tracking || shipmentLoading) return
    setShipmentLoading(true)
    try {
      await goodsMovementApi.startShipment(tracking)
      setShipmentModalMsg(`Shipment for Tracking No. ${tracking.id} has been started successfully.`)
      setShipmentModalOpen(true)
    } catch (err) {
      alert(`Failed to start shipment: ${err.message}`)
    } finally {
      setShipmentLoading(false)
    }
  }

  // Handle OK click on Start Shipment Modal -> Auto-refresh live data from SAP
  const handleShipmentModalConfirm = async () => {
    setShipmentModalOpen(false)
    if (!tracking) return
    try {
      const [freshTracking, freshList] = await Promise.all([
        goodsMovementApi.getTracking(tracking.id),
        goodsMovementApi.listTrackings({ search: searchQuery }),
      ])
      if (freshTracking) {
        setTracking(freshTracking)
      }
      if (freshList) {
        setTrackings(freshList)
      }
    } catch (err) {
      console.error('Refresh after start shipment failed:', err)
    }
  }

  // Navigate to ASN in Advance Shipment Notes App
  const handleNavigateToAsn = (asnId) => {
    if (!asnId || asnId === '—') return
    const targetUrl = getAsnAppUrl(asnId)
    window.location.href = targetUrl
  }

  const isYetToShip = String(tracking?.status || '').toLowerCase().includes('yet to ship')

  if (showCreateMovement) {
    return (
      <CreateMovement
        editData={editTrackingData}
        onBack={(newTrackingId) => {
          setShowCreateMovement(false)
          setEditTrackingData(null)
          goodsMovementApi.listTrackings({ search: searchQuery }).then(setTrackings)
          if (newTrackingId) {
            setSelectedId(newTrackingId)
          }
        }}
      />
    )
  }

  // Slice timeline according to active page (Page 1 = 0..5, Page 2 = 1..6)
  const visibleSteps = timelinePage === 0 ? TIMELINE_STEPS.slice(0, 5) : TIMELINE_STEPS.slice(1, 6)

  return (
    <PageLayout
      companyCode={tracking?.companyCode || ''}
      supplierName={tracking?.supplierName || ''}
      supplierLocation={tracking?.supplierLocation || ''}
    >
      <div className="bg-[#f5f6f7] flex-1 flex flex-col min-h-0 font-sans">
        <div className="flex flex-1 min-h-[calc(100vh-120px)] border-t border-[#e5e5e5]">

          {/* ═══════════════════════════════════════════════════════ */}
          {/* LEFT SIDEBAR: TRACKING NUMBER LIST */}
          {/* ═══════════════════════════════════════════════════════ */}
          <aside className="w-[300px] lg:w-[320px] bg-white border-r border-[#e5e5e5] flex flex-col flex-shrink-0">
            {/* Sidebar Title */}
            <div className="px-4 py-3 border-b border-[#e5e5e5] bg-[#fafbfc]">
              <h3 className="text-[14px] font-bold text-[#32363a]">Tracking Number List</h3>
            </div>

            {/* Search Bar with Search and Refresh */}
            <div className="p-3 border-b border-[#e5e5e5] bg-white">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search"
                  className="w-full h-8 pl-3 pr-14 text-[13px] border border-[#d9d9d9] rounded focus:outline-none focus:border-[#0a6ed1]"
                />
                <div className="absolute right-2 flex items-center gap-1.5 text-[#6a6d70]">
                  <Search size={14} className="cursor-pointer hover:text-[#0a6ed1]" />
                  <RefreshCw
                    size={13}
                    className="cursor-pointer hover:text-[#0a6ed1]"
                    onClick={() => {
                      goodsMovementApi.listTrackings({ search: searchQuery }).then(setTrackings)
                    }}
                  />
                </div>
              </div>
            </div>

            {/* List of Trackings */}
            <div className="flex-1 overflow-y-auto">
              {trackings.map((t) => {
                const isSelected = t.id === selectedId
                const isRedStatus = String(t.status || '').toLowerCase().includes('yet to ship')

                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full text-left px-4 py-3 border-b border-[#e5e5e5] transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#ebf5ff] border-l-4 border-l-[#0a6ed1]'
                        : 'hover:bg-[#f9fafb] border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="font-bold text-[14px] text-[#32363a] mb-1">
                      {t.id}
                    </div>
                    <div className="flex items-center justify-between text-[12px] text-[#6a6d70] mb-0.5">
                      <span>{t.transportMode || 'By Road'}</span>
                      <span>{t.date}</span>
                    </div>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-[#6a6d70]">Plant: {t.plant}</span>
                      <span className={`font-semibold ${isRedStatus ? 'text-[#cc1c14]' : 'text-[#0a6ed1]'}`}>
                        {t.status}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Bottom Action inside Sidebar (+ Create button matching screenshot) */}
            <div className="p-3 border-t border-[#e5e5e5] bg-white flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setEditTrackingData(null)
                  setShowCreateMovement(true)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-white bg-[#0a6ed1] hover:bg-[#085caf] rounded transition-all shadow-sm cursor-pointer"
              >
                <span className="text-[16px] leading-none">+</span> Create
              </button>
            </div>
          </aside>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* MAIN CONTENT: DETAILS PANEL */}
          {/* ═══════════════════════════════════════════════════════ */}
          <main className="flex-1 bg-white flex flex-col min-w-0 overflow-y-auto">
            {tracking ? (
              <div className="flex-1 flex flex-col">
                {/* Top Title Bar */}
                <div className="px-6 sm:px-8 py-3 border-b border-[#e5e5e5] bg-white">
                  <div className="text-right text-[13px] font-bold text-[#32363a]">
                    Tracking Number - {tracking.id}
                  </div>
                </div>

                {/* Tracking ID Header & Status Banner */}
                <div className="px-6 sm:px-8 pt-5 pb-4 border-b border-[#e5e5e5]">
                  <div className="flex items-start justify-between mb-4">
                    <h1 className="text-[24px] sm:text-[26px] font-bold text-[#1f2937] tracking-tight">
                      {tracking.id}
                    </h1>
                    <div className={`text-[18px] sm:text-[20px] font-bold ${
                      isYetToShip ? 'text-[#cc1c14]' : 'text-[#32363a]'
                    }`}>
                      {tracking.status}
                    </div>
                  </div>

                  {/* 2-Column Info Grid matching Screenshot 1 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 text-[13px] text-[#4b5563]">
                    {/* Left Column */}
                    <div className="space-y-1.5">
                      <div>
                        <span className="text-[#6a6d70]">Transporter:</span>{' '}
                        <span className="text-[#1f2937] font-medium">{tracking.transporter || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[#6a6d70]">Driver Name:</span>{' '}
                        <span className="text-[#1f2937] font-medium">{tracking.driverName || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[#6a6d70]">Contact:</span>{' '}
                        <span className="text-[#1f2937] font-medium">{tracking.contact || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[#6a6d70]">Transportation Mode:</span>{' '}
                        <span className="text-[#1f2937] font-medium">{tracking.transportationMode || 'By Road'}</span>
                      </div>
                      <div>
                        <span className="text-[#6a6d70]">Pollution Certificate Applicable:</span>{' '}
                        <span className="text-[#1f2937] font-medium">{tracking.pollutionCertificateApplicable || 'Yes'}</span>
                      </div>
                      <div>
                        <span className="text-[#6a6d70]">Total ASN Amount:</span>{' '}
                        <span className="text-[#1f2937] font-medium">{Number(tracking.totalAsnAmount || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-1.5 md:text-right">
                      <div>
                        <span className="text-[#6a6d70]">ETA Date:</span>{' '}
                        <span className="text-[#1f2937] font-medium">{tracking.etaDate || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[#6a6d70]">Eway Bill No.:</span>{' '}
                        <span className="text-[#1f2937] font-medium">{tracking.ewayBillNo || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[#6a6d70]">Eway Bill Date:</span>{' '}
                        <span className="text-[#1f2937] font-medium">{tracking.ewayBillDate || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[#6a6d70]">Safety Equipments:</span>{' '}
                        <span className="text-[#1f2937] font-medium">{tracking.safetyEquipments || 'Yes'}</span>
                      </div>
                      <div>
                        <span className="text-[#6a6d70]">Safety Guard for Material:</span>{' '}
                        <span className="text-[#1f2937] font-medium">{tracking.safetyGuardForMaterial || 'Yes'}</span>
                      </div>
                      <div>
                        <span className="text-[#6a6d70]">Vehicle Reg. No. / Docket:</span>{' '}
                        <span className="text-[#1f2937] font-medium">{tracking.vehicleRegNo || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ═════════════════════════════════════════════════════ */}
                {/* 3 CIRCULAR TABS: Timeline | ASN | Edit Details */}
                {/* ═════════════════════════════════════════════════════ */}
                <div className="px-6 sm:px-8 pt-5 pb-0 border-b border-[#e5e5e5] bg-white flex items-center gap-8">
                  {/* Tab 1: Timeline */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('timeline')}
                    className={`flex flex-col items-center pb-2.5 border-b-2 transition-all cursor-pointer ${
                      activeTab === 'timeline'
                        ? 'border-[#0a6ed1]'
                        : 'border-transparent hover:border-[#d9d9d9]'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center mb-1.5 shadow-sm transition-transform ${
                        activeTab === 'timeline' ? 'bg-[#0a6ed1] text-white scale-105' : 'bg-[#e8f2fc] text-[#0a6ed1]'
                      }`}
                    >
                      <Clock size={19} strokeWidth={2.2} />
                    </div>
                    <span className={`text-[13px] font-semibold ${
                      activeTab === 'timeline' ? 'text-[#0a6ed1]' : 'text-[#6a6d70]'
                    }`}>
                      Timeline
                    </span>
                  </button>

                  {/* Tab 2: ASN */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('asn')}
                    className={`flex flex-col items-center pb-2.5 border-b-2 transition-all cursor-pointer ${
                      activeTab === 'asn'
                        ? 'border-[#107e3e]'
                        : 'border-transparent hover:border-[#d9d9d9]'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center mb-1.5 shadow-sm transition-transform ${
                        activeTab === 'asn' ? 'bg-[#107e3e] text-white scale-105' : 'bg-[#e7f6f0] text-[#107e3e]'
                      }`}
                    >
                      <Barcode size={19} strokeWidth={2.2} />
                    </div>
                    <span className={`text-[13px] font-semibold ${
                      activeTab === 'asn' ? 'text-[#107e3e]' : 'text-[#6a6d70]'
                    }`}>
                      ASN
                    </span>
                  </button>

                  {/* Tab 3: Edit Details */}
                  <button
                    type="button"
                    onClick={handleOpenEditDetails}
                    className="flex flex-col items-center pb-2.5 border-b-2 border-transparent hover:border-[#d9d9d9] transition-all cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1.5 bg-[#e7f6f0] text-[#107e3e] shadow-sm hover:scale-105 transition-transform">
                      <Edit3 size={18} strokeWidth={2.2} />
                    </div>
                    <span className="text-[13px] font-semibold text-[#6a6d70] hover:text-[#107e3e]">
                      Edit Details
                    </span>
                  </button>
                </div>

                {/* ═════════════════════════════════════════════════════ */}
                {/* TAB CONTENT */}
                {/* ═════════════════════════════════════════════════════ */}
                <div className="flex-1 p-6 sm:p-8">

                  {/* ───────────────────────────────────────────────── */}
                  {/* TIMELINE VIEW (Pages 1 & 2 matching Screenshots) */}
                  {/* ───────────────────────────────────────────────── */}
                  {activeTab === 'timeline' && (
                    <div className="py-6">
                      <div className="relative flex items-center justify-between max-w-4xl mx-auto px-4">

                        {/* Page 1 Left Terminator Bar */}
                        {timelinePage === 0 && (
                          <div className="w-1 h-5 bg-[#94a3b8] rounded mr-2" />
                        )}

                        {/* Page 2 Left Back Pagination (< 1) */}
                        {timelinePage === 1 && (
                          <button
                            type="button"
                            onClick={() => setTimelinePage(0)}
                            className="flex items-center text-[13px] font-semibold text-[#0a6ed1] hover:underline mr-4 cursor-pointer"
                          >
                            <ChevronLeft size={16} /> 1
                          </button>
                        )}

                        {/* Timeline Step Nodes & Connecting Chevrons */}
                        <div className="flex-1 flex items-center justify-between">
                          {visibleSteps.map((step, idx) => {
                            const { Icon, key, label } = step
                            const timelineMatch = (tracking.timeline || []).find((t) => t.key === key)
                            const isCompleted = timelineMatch?.completed || false

                            return (
                              <div key={key} className="flex items-center flex-1 last:flex-none">
                                {/* Step Circle */}
                                <div className="flex flex-col items-center min-w-[70px]">
                                  <div
                                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                                      isCompleted
                                        ? 'border-[#107e3e] bg-white text-[#107e3e]'
                                        : 'border-[#94a3b8] bg-white text-[#64748b]'
                                    }`}
                                  >
                                    <Icon size={20} strokeWidth={2} />
                                  </div>
                                  <div className="text-[11.5px] font-semibold text-[#334155] mt-2 text-center whitespace-nowrap">
                                    {label}
                                  </div>
                                </div>

                                {/* Connecting Chevron Arrows (>>>) */}
                                {idx < visibleSteps.length - 1 && (
                                  <div className="flex-1 flex justify-center text-[#94a3b8] text-[13px] tracking-widest font-bold select-none">
                                    &gt;&gt;&gt;
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        {/* Page 1 Right Next Pagination (1 >) */}
                        {timelinePage === 0 && (
                          <button
                            type="button"
                            onClick={() => setTimelinePage(1)}
                            className="flex items-center text-[13px] font-semibold text-[#0a6ed1] hover:underline ml-4 cursor-pointer"
                          >
                            1 <ChevronRight size={16} />
                          </button>
                        )}

                        {/* Page 2 Right Terminator Bar */}
                        {timelinePage === 1 && (
                          <div className="w-1 h-5 bg-[#94a3b8] rounded ml-2" />
                        )}

                      </div>
                    </div>
                  )}

                  {/* ───────────────────────────────────────────────── */}
                  {/* ASN TAB TABLE (Screenshot 3 - Exact 8 Columns) */}
                  {/* ───────────────────────────────────────────────── */}
                  {activeTab === 'asn' && (
                    <div className="overflow-x-auto rounded border border-[#e5e5e5] shadow-sm">
                      <table className="w-full text-[13px] border-collapse">
                        <thead>
                          <tr className="bg-[#f8fafc] border-b border-[#e5e5e5] text-[#475569] text-left">
                            <th className="py-3 px-4 font-semibold">ASN</th>
                            <th className="py-3 px-4 font-semibold">Total Line Items</th>
                            <th className="py-3 px-4 font-semibold">IBD Number</th>
                            <th className="py-3 px-4 font-semibold">Plant</th>
                            <th className="py-3 px-4 font-semibold">Storage Location</th>
                            <th className="py-3 px-4 font-semibold">Invoice Number</th>
                            <th className="py-3 px-4 font-semibold">Invoice Amount</th>
                            <th className="py-3 px-4 font-semibold">Invoice Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(tracking.asns || []).map((asn, idx) => (
                            <tr
                              key={idx}
                              className="border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#f8fafc]"
                            >
                              <td
                                onClick={() => handleNavigateToAsn(asn.asnId)}
                                className="py-3.5 px-4 font-semibold text-[#0a6ed1] cursor-pointer hover:underline hover:text-[#085caf] transition-colors"
                                title={`Open ${asn.asnId} in Advance Shipment Notes`}
                              >
                                {asn.asnId}
                              </td>
                              <td className="py-3.5 px-4 text-[#334155]">{asn.totalLineItems || 1}</td>
                              <td className="py-3.5 px-4 text-[#334155]">{asn.ibdNumber || '—'}</td>
                              <td className="py-3.5 px-4 text-[#334155]">{asn.plant || 'SR01'}</td>
                              <td className="py-3.5 px-4 text-[#334155]">{asn.storageLocation || 'RM02'}</td>
                              <td className="py-3.5 px-4 text-[#334155] font-medium">{asn.invoiceNumber || '—'}</td>
                              <td className="py-3.5 px-4 text-[#334155]">{asn.invoiceAmount || 12}</td>
                              <td className="py-3.5 px-4 text-[#334155]">{asn.invoiceDate || 'Nov 13, 2026'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>

                {/* ═════════════════════════════════════════════════════ */}
                {/* BOTTOM ACTION BAR */}
                {/* ═════════════════════════════════════════════════════ */}
                <div className="mt-auto px-6 py-3 border-t border-[#e5e5e5] bg-white flex items-center justify-between">
                  {/* Left Print Button */}
                  <button
                    type="button"
                    onClick={handlePrint}
                    disabled={printLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-white bg-[#0a6ed1] hover:bg-[#085caf] rounded shadow-sm transition-all cursor-pointer disabled:opacity-60"
                  >
                    <Printer size={15} />
                    <span>Print</span>
                  </button>

                  {/* Actions when Yet to Ship */}
                  {isYetToShip && (
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        disabled={shipmentLoading}
                        onClick={handleStartShipment}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-white bg-[#107e3e] hover:bg-[#0d6633] rounded shadow-sm transition-all disabled:opacity-60 cursor-pointer"
                      >
                        {shipmentLoading ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" /> Starting...
                          </>
                        ) : (
                          <>
                            <PlayCircle size={15} /> Start Shipment
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenEditDetails}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-white bg-[#0a6ed1] hover:bg-[#085caf] rounded shadow-sm transition-all cursor-pointer"
                      >
                        <Edit3 size={15} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCancelError(null)
                          setCancelSuccess(false)
                          setCancelModalOpen(true)
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-[#cc1c14] border border-[#cc1c14] hover:bg-[#fce8e6] rounded transition-all cursor-pointer"
                      >
                        <X size={15} /> Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-[#6a6d70]">
                <Truck size={48} className="mb-3 opacity-30" strokeWidth={1.5} />
                <span className="text-[14px]">Select a tracking number from the list</span>
              </div>
            )}
          </main>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* EDIT DETAILS MODAL (Screenshot 4) */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {editModalOpen && tracking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-[480px] p-6 border border-[#e5e5e5] animate-scale">
              {/* Modal Header */}
              <h3 className="text-[16px] font-bold text-[#1f2937] mb-5">
                Tracking No: {tracking.id}
              </h3>

              {/* Form Fields */}
              <div className="space-y-4">
                {/* ASN Field with Value Help Button */}
                <div>
                  <label className="block text-[12px] font-semibold text-[#475569] mb-1">
                    ASN
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={editForm.asn}
                      onChange={(e) => setEditForm({ ...editForm, asn: e.target.value })}
                      className="w-full h-9 px-3 pr-10 text-[13px] border border-[#d9d9d9] rounded focus:outline-none focus:border-[#0a6ed1]"
                    />
                    <button
                      type="button"
                      onClick={handleOpenAsnHelp}
                      title="Select ASN"
                      className="absolute right-2 text-[#64748b] hover:text-[#0a6ed1] p-1 cursor-pointer"
                    >
                      <Files size={16} />
                    </button>
                  </div>
                </div>

                {/* Vehicle Number */}
                <div>
                  <label className="block text-[12px] font-semibold text-[#475569] mb-1">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    value={editForm.vehicleNumber}
                    onChange={(e) => setEditForm({ ...editForm, vehicleNumber: e.target.value })}
                    className="w-full h-9 px-3 text-[13px] border border-[#d9d9d9] rounded focus:outline-none focus:border-[#0a6ed1]"
                  />
                </div>

                {/* Invoice Number */}
                <div>
                  <label className="block text-[12px] font-semibold text-[#475569] mb-1">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    value={editForm.invoiceNumber}
                    onChange={(e) => setEditForm({ ...editForm, invoiceNumber: e.target.value })}
                    className="w-full h-9 px-3 text-[13px] border border-[#d9d9d9] rounded focus:outline-none focus:border-[#0a6ed1]"
                  />
                </div>
              </div>

              {/* Modal Actions matching Screenshot 4 */}
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleSaveEditDetails}
                  disabled={editSaving}
                  className="px-5 py-1.5 text-[13px] font-semibold text-white bg-[#0a6ed1] hover:bg-[#085caf] rounded transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {editSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="text-[13px] font-semibold text-[#0a6ed1] hover:underline px-2 py-1.5 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SELECT ASN VALUE HELP DIALOG (Screenshot 5) */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {asnHelpOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-[340px] p-5 border border-[#e5e5e5]">
              {/* Header */}
              <h4 className="text-[15px] font-bold text-[#1f2937] mb-3">
                Select ASN
              </h4>

              {/* Search Bar */}
              <div className="relative flex items-center mb-3">
                <input
                  type="text"
                  placeholder="Search"
                  value={asnHelpSearch}
                  onChange={(e) => setAsnHelpSearch(e.target.value)}
                  className="w-full h-8 pl-3 pr-8 text-[13px] border border-[#d9d9d9] rounded focus:outline-none focus:border-[#0a6ed1]"
                />
                <Search size={14} className="absolute right-2 text-[#64748b]" />
              </div>

              {/* ASN List */}
              <div className="max-h-[220px] overflow-y-auto border border-[#e5e5e5] rounded divide-y divide-[#f1f5f9]">
                {asnHelpList.map((item) => (
                  <button
                    key={item.asnId}
                    type="button"
                    onClick={() => handleSelectAsn(item)}
                    className="w-full text-left px-3 py-2 text-[13px] font-medium text-[#1f2937] hover:bg-[#ebf5ff] hover:text-[#0a6ed1] transition-colors cursor-pointer"
                  >
                    {item.asnId}
                  </button>
                ))}
                {asnHelpList.length === 0 && (
                  <div className="px-3 py-6 text-center text-[12px] text-[#64748b]">
                    No ASNs found
                  </div>
                )}
              </div>

              {/* Cancel Button */}
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setAsnHelpOpen(false)}
                  className="text-[13px] font-semibold text-[#0a6ed1] hover:underline cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CANCEL MOVEMENT CONFIRMATION MODAL */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {cancelModalOpen && tracking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-[#e5e5e5] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e5e5] bg-[#fafafa]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#fce8e6] flex items-center justify-center text-[#cc1c14]">
                    <AlertTriangle size={18} />
                  </div>
                  <h3 className="text-[16px] font-bold text-[#1f2937]">
                    Cancel Movement
                  </h3>
                </div>
                {!cancelLoading && (
                  <button
                    type="button"
                    onClick={() => setCancelModalOpen(false)}
                    className="text-[#64748b] hover:text-[#1f2937] p-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {/* Body */}
              <div className="p-6">
                {cancelSuccess ? (
                  <div className="flex flex-col items-center text-center py-2">
                    <div className="w-12 h-12 rounded-full bg-[#ecfdf5] flex items-center justify-center text-[#107e3e] mb-3">
                      <CheckCircle2 size={28} />
                    </div>
                    <h4 className="text-[16px] font-bold text-[#1f2937] mb-1">
                      Movement Cancelled Successfully
                    </h4>
                    <p className="text-[13px] text-[#64748b]">
                      Tracking ID <span className="font-semibold text-[#1f2937]">{tracking.id}</span> has been marked as cancelled.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-[14px] text-[#334155] leading-relaxed mb-3">
                      Are you sure you want to cancel Tracking ID <span className="font-bold text-[#1f2937]">{tracking.id}</span>?
                    </p>
                    <p className="text-[13px] text-[#64748b] leading-relaxed mb-4">
                      All associated ASNs will be marked as cancelled in the tracking register and released. This action cannot be undone.
                    </p>

                    {cancelError && (
                      <div className="p-3 bg-[#fce8e6] border border-[#fecaca] rounded-lg text-[#cc1c14] text-[13px] font-medium flex items-start gap-2 mb-2">
                        <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                        <span>{cancelError}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[#fafafa] border-t border-[#e5e5e5]">
                {cancelSuccess ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCancelModalOpen(false)
                      setCancelSuccess(false)
                    }}
                    className="px-5 py-2 text-[13px] font-semibold text-white bg-[#0a6ed1] hover:bg-[#085caf] rounded-lg shadow-sm transition-all cursor-pointer"
                  >
                    OK
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={cancelLoading}
                      onClick={() => setCancelModalOpen(false)}
                      className="px-4 py-2 text-[13px] font-semibold text-[#475569] hover:bg-[#f1f5f9] rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                    >
                      Keep Movement
                    </button>
                    <button
                      type="button"
                      disabled={cancelLoading}
                      onClick={handleConfirmCancelMovement}
                      className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-[#cc1c14] hover:bg-[#b01710] rounded-lg shadow-sm transition-all disabled:opacity-60 cursor-pointer"
                    >
                      {cancelLoading ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Cancelling...</span>
                        </>
                      ) : (
                        <span>Yes, Cancel Movement</span>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* START SHIPMENT SUCCESS MODAL */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {shipmentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 border border-[#e5e5e5] text-center">
              <div className="w-14 h-14 rounded-full bg-[#ecfdf5] text-[#107e3e] flex items-center justify-center mx-auto mb-4 shadow-sm">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-[17px] font-bold text-[#1f2937] mb-2">
                Shipment Started!
              </h3>
              <p className="text-[13.5px] text-[#475569] leading-relaxed mb-6">
                {shipmentModalMsg}
              </p>
              <button
                type="button"
                onClick={handleShipmentModalConfirm}
                className="w-full h-10 text-[13.5px] font-semibold text-white bg-[#107e3e] hover:bg-[#0d6632] rounded-lg shadow-sm transition-all cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* Success Toast */}
        {editSuccessMsg && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#107e3e] text-white px-4 py-2.5 rounded-lg shadow-xl text-[13px] font-medium animate-slide-up">
            <CheckCircle2 size={16} />
            <span>{editSuccessMsg}</span>
          </div>
        )}

      </div>
    </PageLayout>
  )
}
