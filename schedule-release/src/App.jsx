import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ScheduleRelease from './pages/Schedulerelease.jsx'
import SRlineitem from './pages/Srlineitem.jsx'
import CreateASN2 from './pages/Createasn2.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ScheduleRelease />} />
        <Route path="/sr-lineitem" element={<SRlineitem />} />
        <Route path="/create-asn2" element={<CreateASN2 />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}