import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import PageLayout from '../layouts/PageLayout.jsx'
import { purchaseOrderApi } from '../services/PurchaseOrder.js'

export default function POlineitem() {
  const navigate = useNavigate()
  const location = useLocation()

  const poNo = location.state?.poNo || location.state?.agreement?.id || '7000037175'
  const itemNo = location.state?.item?.itemNo || location.state?.item?.ebelp || '10'

  const [scheduleLines, setScheduleLines] = useState(location.state?.scheduleLines || [])
  const [loading, setLoading] = useState(!location.state?.scheduleLines?.length)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (location.state?.scheduleLines && location.state.scheduleLines.length > 0) {
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)

    purchaseOrderApi.getLineItems(poNo, itemNo)
      .then(data => {
        if (!cancelled) {
          setScheduleLines(data || [])
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [poNo, itemNo, location.state])

  return (
    <PageLayout>
      <div className="bg-white min-h-[calc(100vh-84px)] flex flex-col">
        {/* Top Header Strip with Back Button and Centered PO Title */}
        <div className="relative flex items-center justify-between px-6 py-3 border-b border-[#e5e7eb] bg-white">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded border-2 border-[#0a6ed1] text-[#0a6ed1] flex items-center justify-center hover:bg-[#ebf5ff] transition-all flex-shrink-0"
            title="Back to Purchase Order"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          {/* Centered Heading */}
          <div className="absolute left-1/2 transform -translate-x-1/2 text-center select-none pointer-events-none">
            <h1 className="text-[17px] font-bold text-[#0f2d59] tracking-tight whitespace-nowrap">
              Purchase Order Number : {poNo}
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
              No schedule line data found for this purchase order.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[14px] border-collapse">
                <thead>
                  <tr className="border-b border-[#e5e7eb] text-[#1f2937] font-bold">
                    <th className="py-3 px-4 font-bold">Schedule Line</th>
                    <th className="py-3 px-4 font-bold">Delivery Date</th>
                    <th className="py-3 px-4 font-bold">Schedule Quantity</th>
                    <th className="py-3 px-4 font-bold">Delivered Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f3f4f6]">
                  {scheduleLines.map((line, idx) => {
                    const unit = line.unit || 'NO'
                    const schedQty = line.scheduleQty || line.deliverySchedule || '0.00'
                    const delQty = line.deliveredQty || '0.00'

                    return (
                      <tr key={line.scheduleLine || line.schLineNo || idx} className="hover:bg-[#fafbfc] transition-colors">
                        <td className="py-3.5 px-4 text-[#1f2937] font-normal">
                          {line.scheduleLine || line.schLineNo || idx + 1}
                        </td>
                        <td className="py-3.5 px-4 text-[#1f2937] font-semibold">
                          {line.deliveryDate || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-[#1f2937]">
                          <span className="font-bold">{schedQty}</span>
                          <span className="ml-1.5 text-[#374151] font-normal">{unit}</span>
                        </td>
                        <td className="py-3.5 px-4 text-[#1f2937]">
                          <span className="font-bold">{delQty}</span>
                          <span className="ml-1.5 text-[#374151] font-normal">{unit}</span>
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
