import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PurchaseOrder from './pages/PurchaseOrder.jsx'
import POlineitem from './pages/POlineitem.jsx'
import CreateASN from './pages/createASN.jsx'

export default function App() {
  return (
    <BrowserRouter>
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
