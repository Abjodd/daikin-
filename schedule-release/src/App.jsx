import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ScheduleRelease from './pages/Schedulerelease.jsx'
import SRlineitem from './pages/Srlineitem.jsx'
import CreateASN2 from './pages/Createasn2.jsx'

// On BTP the app is served under /srui; locally (npm run dev) it's at /
export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.PROD ? '/srui' : '/'}>
      <Routes>
        <Route path="/" element={<ScheduleRelease />} />
        <Route path="/sr-lineitem" element={<SRlineitem />} />
        <Route path="/create-asn2" element={<CreateASN2 />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}