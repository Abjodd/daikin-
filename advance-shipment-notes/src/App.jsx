import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ListPage from "./pages/ListPage.jsx";

export default function App() {
  return (
    <BrowserRouter basename="/asnui">
      <Routes>
        <Route path="/" element={<ListPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}