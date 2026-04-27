import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing";
import Learn from "./pages/Learn";
import Locator from "./pages/Locator";
import RelayPortal from "./pages/RelayPortal";
import RadioPortal from "./pages/RadioPortal";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/radio/:provinceId" element={<RadioPortal />} />
        <Route path="/radio" element={<RadioPortal />} />
        <Route path="/locator" element={<Locator />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/relay" element={<RelayPortal />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
