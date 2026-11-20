import Header from '../components/Header.jsx'

export default function PageLayout({
  companyCode,
  supplierName,
  supplierLocation,
  hideSubheader = false,
  onBack,
  children,
}) {
  return (
    <div className="h-screen bg-[#f5f6f7] flex flex-col font-sans overflow-hidden">
      <Header
        companyCode={companyCode}
        supplierName={supplierName}
        supplierLocation={supplierLocation}
        hideSubheader={hideSubheader}
        onBack={onBack}
      />
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
