import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Cursor from "./components/Cursor";
import RequireRole from "./components/RequireRole";
import SiteFooter from "./components/SiteFooter";
import { AuthProvider } from "./lib/auth";
import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing";
import Learn from "./pages/Learn";
import Locator from "./pages/Locator";
import RelayPortal from "./pages/RelayPortal";
import RadioPortal from "./pages/RadioPortal";
import SignIn from "./pages/SignIn";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Cursor />
        <Routes>
          {/* Public: women, girls and anyone looking for care */}
          <Route path="/" element={<Landing />} />
          <Route path="/locator" element={<Locator />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/connexion" element={<SignIn />} />

          {/* Staff spaces */}
          <Route path="/dashboard" element={<RequireRole path="/dashboard"><Dashboard /></RequireRole>} />
          <Route path="/radio/:provinceId" element={<RequireRole path="/radio"><RadioPortal /></RequireRole>} />
          <Route path="/radio" element={<RequireRole path="/radio"><RadioPortal /></RequireRole>} />
          <Route path="/relay" element={<RequireRole path="/relay"><RelayPortal /></RequireRole>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <SiteFooter />
      </BrowserRouter>
    </AuthProvider>
  );
}
