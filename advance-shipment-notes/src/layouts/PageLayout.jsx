import Header from '../components/Header.jsx'

export default function PageLayout({
  companyCode,
  supplierName,
  supplierLocation,
  onBack,
  children,
}) {
  return (
    <div className="min-h-screen bg-[#f5f6f7] flex flex-col font-sans">
      <Header
        companyCode={companyCode}
        supplierName={supplierName}
        supplierLocation={supplierLocation}
        onBack={onBack}
      />
      <div className="flex-1 flex flex-col min-h-0">
        {children}
      </div>
    </div>
  )
}
