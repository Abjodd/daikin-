import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ListPage from "./pages/ListPage.jsx";

// On BTP the app is served under /asnui; locally (npm run dev) it's at /
export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.PROD ? '/asnui' : '/'}>
      <Routes>
        <Route path="/" element={<ListPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}