import Header from '../components/Header.jsx'

export default function PageLayout({
  children,
  companyCode,
  supplierName,
  supplierLocation,
  onBack,
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
