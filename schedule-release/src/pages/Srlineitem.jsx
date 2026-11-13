import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import PageLayout from '../layouts/Pagelayout.jsx'
import { scheduleReleaseApi } from '../services/Schedulerelease.js'

export default function SRlineitem() {
  const navigate = useNavigate()
  const location = useLocation()

  const { agreement, item: drilledItem } = location.state || {}

  const [scheduleLines, setScheduleLines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!drilledItem || !agreement) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    scheduleReleaseApi
      .getScheduleLines(
        agreement.id,
        drilledItem.itemNo,
        drilledItem.materialNumber,
        drilledItem.deliveryUnit,
      )
      .then(lines => {
        if (!cancelled) setScheduleLines(lines || [])
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Failed to load schedule lines')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [drilledItem, agreement])

  const currentCompany = agreement?.companyCode
    ? `${agreement.companyCode}${agreement.companyCodeName ? ` (${agreement.companyCodeName})` : ''}`
    : '1810'

  const currentSupplier = agreement?.vendorName
    ? `${agreement.vendorName}${agreement.vendorNo && !agreement.vendorName.includes(agreement.vendorNo) ? ` (${agreement.vendorNo})` : ''}`
    : (agreement?.vendor || agreement?.vendorNo || '')

  const currentLocation = agreement?.vendorAddress || (agreement?.plantName ? `${agreement.plantName}${agreement.plant ? ` (${agreement.plant})` : ''}` : (agreement?.plant || ''))

  // Fallback when opened directly or state lost
  if (!drilledItem || !agreement) {
    return (
      <PageLayout
        companyCode={currentCompany}
        supplierName={currentSupplier}
        supplierLocation={currentLocation}
        onBack={() => navigate(-1)}
      >
        <div className="flex flex-col items-center justify-center h-64 px-4 text-center text-[#6a6d70]">
          <span className="text-[14px]">No item data. Please go back and select an item.</span>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-5 h-10 text-[14px] font-semibold text-[#0a6ed1] bg-[#ebf5ff] rounded-lg hover:bg-[#d9ecff] transition-all cursor-pointer"
          >
            ← Go Back
          </button>
        </div>
      </PageLayout>
    )
  }

  const matNumber = drilledItem.materialNumber || drilledItem.material || '—'

  return (
    <PageLayout
      companyCode={currentCompany}
      supplierName={currentSupplier}
      supplierLocation={currentLocation}
      onBack={() => navigate(-1)}
    >
      <div className="bg-white min-h-[calc(100vh-84px)] flex flex-col">
        {/* Top Header Strip with Back Button and Centered Material Title */}
        <div className="relative flex items-center justify-between px-6 py-3 border-b border-[#e5e7eb] bg-white">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded border-2 border-[#0a6ed1] text-[#0a6ed1] flex items-center justify-center hover:bg-[#ebf5ff] transition-all flex-shrink-0 cursor-pointer"
            title="Back to Schedule Agreement"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          {/* Centered Heading: Material Number : <Material> */}
          <div className="absolute left-1/2 transform -translate-x-1/2 text-center select-none pointer-events-none">
            <h1 className="text-[17px] font-bold text-[#0f2d59] tracking-tight whitespace-nowrap">
              Material Number : {matNumber}
            </h1>
          </div>

          <div className="w-8" />
        </div>

        {/* Content Body */}
        <div className="flex-1 px-6 py-2">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-[#6b7280]">
              <div className="w-8 h-8 border-3 border-[#0a6ed1] border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-[14px]">Loading schedule lines…</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center text-[#dc2626]">
              <p className="font-semibold">{error}</p>
            </div>
          ) : scheduleLines.length === 0 ? (
            <div className="py-16 text-center text-[#6b7280]">
              No schedule line data found for this material.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[14px] border-collapse">
                <thead>
                  <tr className="border-b border-[#e5e7eb] text-[#1f2937] font-bold">
                    <th className="py-3 px-4 font-bold">Sch.Line No</th>
                    <th className="py-3 px-4 font-bold">Delivery Date</th>
                    <th className="py-3 px-4 font-bold">Delivery Schedule</th>
                    <th className="py-3 px-4 font-bold">Confirmed Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f3f4f6]">
                  {scheduleLines.map((line, idx) => {
                    const lineNo = line.scheduleLine || line.schLineNo || idx + 1
                    const uom = line.unit || drilledItem.deliveryUnit || 'NO'
                    const schedQty = line.deliverySchedule !== undefined ? line.deliverySchedule : (line.scheduleQty || 0)
                    const confQty = line.confirmedQty !== undefined
                      ? line.confirmedQty
                      : (line.confkey === 'X' ? schedQty : 0)

                    return (
                      <tr key={lineNo} className="hover:bg-[#fafbfc] transition-colors">
                        <td className="py-3.5 px-4 text-[#1f2937] font-normal">
                          {lineNo}
                        </td>
                        <td className="py-3.5 px-4 text-[#1f2937] font-semibold">
                          {line.deliveryDate || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-[#1f2937]">
                          <span className="font-bold">{schedQty}</span>
                          <span className="ml-1.5 text-[#374151] font-normal">{uom}</span>
                        </td>
                        <td className="py-3.5 px-4 text-[#1f2937]">
                          <span className="font-bold">{confQty}</span>
                          <span className="ml-1.5 text-[#374151] font-normal">{uom}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  )
}
