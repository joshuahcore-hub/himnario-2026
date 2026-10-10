import { Toaster as Sonner } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { I18nProvider } from "@/lib/i18n/index";
import AppShell from "@/components/AppShell";
import HymnalPage from "@/pages/Hymnal";
import HymnDetail from "@/pages/HymnDetail";
import SettingsPage from "@/pages/Settings";

// Sin login: cualquiera que abre la app ve los himnos (rol "visor").
const App = () => (
  <I18nProvider>
    <Sonner />
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<HymnalPage />} />
          <Route path="/hymnal" element={<HymnalPage />} />
          <Route path="/hymnal/:number" element={<HymnDetail />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  </I18nProvider>
);

export default App;
