import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Cursor from "./components/Cursor";
import SiteFooter from "./components/SiteFooter";
import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing";
import Learn from "./pages/Learn";
import Locator from "./pages/Locator";
import RelayPortal from "./pages/RelayPortal";
import RadioPortal from "./pages/RadioPortal";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Cursor />
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
      <SiteFooter />
    </BrowserRouter>
  );
}
