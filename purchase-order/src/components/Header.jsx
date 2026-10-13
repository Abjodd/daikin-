import { useState } from 'react'

export default function Header({
  companyCode = 'DSAL (Daikin Airconditioning India Private Limited)',
  supplierName = 'Kunstocom(India) Ltd',
  supplierLocation = 'NEEMRANA(alwar)',
  onBack,
}) {
  const [detailsOpen, setDetailsOpen] = useState(false)

  return (
    <header className="bg-white border-b border-[#e5e5e5] select-none flex-shrink-0">
      {/* Primary Top Bar */}
      <div className="h-[48px] px-3 sm:px-4 flex items-center justify-between border-b border-[#f0f0f0]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack || (() => window.history.back())}
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

          {/* App Switcher Dropdown */}
          <div className="flex items-center gap-1.5 cursor-pointer font-bold text-[14px] sm:text-[15px] text-[#1f2937] hover:text-[#0a6ed1] transition-colors ml-0.5 sm:ml-1">
            <span>Purchase Order</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] text-[#6b7280] transition-colors cursor-pointer"
            title="Search"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          {/* User Initials Avatar */}
          <div className="w-8 h-8 rounded-full bg-[#dbeafe] text-[#1d4ed8] font-bold text-[13px] flex items-center justify-center border border-[#bfdbfe]">
            sn
          </div>
        </div>
      </div>

      {/* Desktop Subheader Strip (lg and larger screens) */}
      <div className="hidden lg:flex items-center justify-between gap-6 px-6 py-2 bg-[#f8fafc] border-b border-[#e2e8f0] text-[12px] text-[#475569]">
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-medium text-[#64748b]">Company Code:</span>{' '}
          <span className="font-semibold text-[#0f172a]">{companyCode}</span>
        </div>
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-medium text-[#64748b]">Supplier Name:</span>{' '}
          <span className="font-semibold text-[#0f172a]">{supplierName}</span>
        </div>
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-medium text-[#64748b]">Supplier Location:</span>{' '}
          <span className="font-semibold text-[#0f172a]">{supplierLocation}</span>
        </div>
      </div>

      {/* iPad / Tablet Strip (sm to lg screens) */}
      <div className="hidden sm:flex lg:hidden items-center justify-between gap-4 px-4 py-2 bg-[#f8fafc] border-b border-[#e2e8f0] text-[11.5px] text-[#475569]">
        <div className="flex items-center gap-2 truncate">
          <span className="font-bold text-[#0a6ed1] bg-[#eff6ff] px-2 py-0.5 rounded border border-[#bfdbfe]/60">DSAL</span>
          <span className="text-[#94a3b8]">|</span>
          <span className="font-semibold text-[#1e293b] truncate">{supplierName}</span>
          <span className="text-[#94a3b8]">|</span>
          <span className="text-[#64748b] truncate">{supplierLocation}</span>
        </div>
        <span className="text-[10px] font-bold text-[#0a6ed1] bg-[#eff6ff] px-2 py-0.5 rounded-full flex-shrink-0">
          Active
        </span>
      </div>

      {/* Mobile Sleek 1-Line Strip with Expandable Details (< sm screens) */}
      <div className="sm:hidden bg-[#f8fafc] border-b border-[#e2e8f0] px-3 py-1.5 text-[11px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-bold text-[#0a6ed1] bg-[#eff6ff] px-1.5 py-0.5 rounded border border-[#bfdbfe]/60 text-[10px]">
              DSAL
            </span>
            <span className="font-semibold text-[#1e293b] truncate">
              {supplierName.replace(/\s*\(India\)\s*/i, '').replace(/\s*Ltd\.?/i, '')}
            </span>
            <span className="text-[#94a3b8]">·</span>
            <span className="text-[#64748b] truncate">
              {supplierLocation.replace(/\(.*?\)/g, '').trim()}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setDetailsOpen(prev => !prev)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-medium text-[#0a6ed1] bg-[#eff6ff] hover:bg-[#dbeafe] transition-colors ml-2 flex-shrink-0 cursor-pointer"
            title="Toggle Details"
          >
            <span>{detailsOpen ? 'Hide' : 'Info'}</span>
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform duration-200 ${detailsOpen ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {detailsOpen && (
          <div className="mt-2 pt-2 border-t border-[#e2e8f0] space-y-1.5 text-[11px] bg-white p-2.5 rounded-lg border border-[#e2e8f0] shadow-sm">
            <div>
              <span className="text-[#64748b] font-medium">Company Code: </span>
              <span className="text-[#0f172a] font-semibold">{companyCode}</span>
            </div>
            <div>
              <span className="text-[#64748b] font-medium">Supplier Name: </span>
              <span className="text-[#0f172a] font-semibold">{supplierName}</span>
            </div>
            <div>
              <span className="text-[#64748b] font-medium">Supplier Location: </span>
              <span className="text-[#0f172a] font-semibold">{supplierLocation}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
