import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PurchaseOrder from './pages/PurchaseOrder.jsx'
import POlineitem from './pages/POlineitem.jsx'
import CreateASN from './pages/createASN.jsx'

// On BTP the app is served under /purchaseorderui; locally (npm run dev) it's at /
export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.PROD ? '/purchaseorderui' : '/'}>
      <Routes>
        <Route path="/" element={<PurchaseOrder />} />
        <Route path="/po-lineitem" element={<POlineitem />} />
        <Route path="/create-asn" element={<CreateASN />} />

        {/* Support matching legacy nested paths */}
        <Route path="/purchasing/PurchaseOrder" element={<PurchaseOrder />} />
        <Route path="/purchasing/PurchaseOrder/po-lineitem" element={<POlineitem />} />
        <Route path="/purchasing/PurchaseOrder/create-asn" element={<CreateASN />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
