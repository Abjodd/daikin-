import Header from '../components/Header.jsx'

export default function PageLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#f5f6f7] flex flex-col font-sans">
      <Header />
      <div className="flex-1 flex flex-col min-h-0">
        {children}
      </div>
    </div>
  )
}