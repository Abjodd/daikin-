import { useState } from 'react'
import { PORTAL_URL, APP_NAME } from '../config/app.js'
import { useUser } from '../context/UserContext.jsx'

export default function Header({
  companyCode = '',
  supplierName = '',
  supplierLocation = '',
  onBack,
}) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const { user } = useUser()

  // Only display values returned directly from backend services. No fallback to session or hardcoded data.
  const activeSupplierName = supplierName || ''
  const activeSupplierLoc = supplierLocation || ''
  const activeCompany = companyCode || ''
  const shortCompany = String(activeCompany).split(/[\s(]/)[0] || ''

  const initials = activeSupplierName
    ? (activeSupplierName.split(' ').filter(Boolean).map(n => n[0]).join('') || 'GM').slice(0, 2).toUpperCase()
    : 'GM'

  const handleBack = onBack || (() => {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      window.location.href = PORTAL_URL
    }
  })

  return (
    <header className="bg-white border-b border-[#e5e5e5] select-none flex-shrink-0">
      {/* Primary Top Bar */}
      <div className="h-[48px] px-3 sm:px-4 flex items-center justify-between border-b border-[#f0f0f0]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[#f3f4f6] text-[#374151] transition-colors cursor-pointer"
            title="Back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          {/* SAP Brand Icon */}
          <div className="flex items-center bg-[#0a6ed1] text-white px-2 py-0.5 rounded font-black text-[13px] tracking-wider leading-none shadow-sm">
            SAP
          </div>

          {/* App Title */}
          <div className="flex items-center gap-1.5 cursor-pointer font-bold text-[14px] sm:text-[15px] text-[#1f2937] hover:text-[#0a6ed1] transition-colors ml-0.5 sm:ml-1">
            <span>{APP_NAME}</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* User Initials Avatar */}
          <div className="w-8 h-8 rounded-full bg-[#dbeafe] text-[#1d4ed8] font-bold text-[13px] flex items-center justify-center border border-[#bfdbfe]">
            {initials}
          </div>
        </div>
      </div>

      {/* Desktop Subheader Strip (lg and larger screens) */}
      <div className="hidden lg:flex items-center justify-between gap-6 px-6 py-2 bg-[#f8fafc] border-b border-[#e2e8f0] text-[12px] text-[#475569] min-h-[36px]">
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-medium text-[#64748b]">Company Code:</span>{' '}
          <span className="font-semibold text-[#0f172a]">{activeCompany}</span>
        </div>
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-medium text-[#64748b]">Supplier Name:</span>{' '}
          <span className="font-semibold text-[#0f172a]">{activeSupplierName}</span>
        </div>
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-medium text-[#64748b]">Supplier Location:</span>{' '}
          <span className="font-semibold text-[#0f172a]">{activeSupplierLoc}</span>
        </div>
      </div>

      {/* iPad / Tablet Strip (sm to lg screens) */}
      <div className="hidden sm:flex lg:hidden items-center justify-between gap-4 px-4 py-2 bg-[#f8fafc] border-b border-[#e2e8f0] text-[11.5px] text-[#475569] min-h-[36px]">
        <div className="flex items-center gap-2 truncate">
          {shortCompany && (
            <>
              <span className="font-bold text-[#0a6ed1] bg-[#eff6ff] px-2 py-0.5 rounded border border-[#bfdbfe]/60">
                {shortCompany}
              </span>
              <span className="text-[#94a3b8]">|</span>
            </>
          )}
          <span className="font-semibold text-[#1e293b] truncate">{activeSupplierName}</span>
          {activeSupplierLoc && (
            <>
              <span className="text-[#94a3b8]">|</span>
              <span className="text-[#64748b] truncate">{activeSupplierLoc}</span>
            </>
          )}
        </div>
      </div>

      {/* Mobile Strip (< sm screens) */}
      <div className="sm:hidden bg-[#f8fafc] border-b border-[#e2e8f0] px-3 py-1.5 text-[11px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 truncate">
            {shortCompany && (
              <span className="font-bold text-[#0a6ed1] bg-[#eff6ff] px-1.5 py-0.5 rounded border border-[#bfdbfe]/60 text-[10px]">
                {shortCompany}
              </span>
            )}
            <span className="font-semibold text-[#1e293b] truncate">
              {activeSupplierName}
            </span>
            {activeSupplierLoc && (
              <>
                <span className="text-[#94a3b8]">·</span>
                <span className="text-[#64748b] truncate">
                  {activeSupplierLoc}
                </span>
              </>
            )}
          </div>

          {(activeCompany || activeSupplierName || activeSupplierLoc) && (
            <button
              type="button"
              onClick={() => setDetailsOpen(prev => !prev)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-medium text-[#0a6ed1] bg-[#eff6ff] hover:bg-[#dbeafe] transition-colors ml-2 flex-shrink-0 cursor-pointer"
            >
              <span>{detailsOpen ? 'Hide' : 'Info'}</span>
            </button>
          )}
        </div>

        {detailsOpen && (
          <div className="mt-2 pt-2 border-t border-[#e2e8f0] space-y-1.5 text-[11px] bg-white p-2.5 rounded-lg border border-[#e2e8f0] shadow-sm">
            <div>
              <span className="text-[#64748b] font-medium">Company Code: </span>
              <span className="text-[#0f172a] font-semibold">{activeCompany}</span>
            </div>
            <div>
              <span className="text-[#64748b] font-medium">Supplier Name: </span>
              <span className="text-[#0f172a] font-semibold">{activeSupplierName}</span>
            </div>
            <div>
              <span className="text-[#64748b] font-medium">Supplier Location: </span>
              <span className="text-[#0f172a] font-semibold">{activeSupplierLoc}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
