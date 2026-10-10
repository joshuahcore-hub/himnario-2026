import { Toaster as Sonner } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { I18nProvider } from "@/lib/i18n/index";
import { AccesoProvider } from "@/hooks/useAcceso";
import AppShell from "@/components/AppShell";
import HymnalPage from "@/pages/Hymnal";
import HymnDetail from "@/pages/HymnDetail";
import SettingsPage from "@/pages/Settings";
import Minutas from "@/pages/Minutas";
import MinutaReader from "@/pages/MinutaReader";
import EditorMinuta from "@/pages/EditorMinuta";
import Admin from "@/pages/Admin";

// Sin login: cualquiera que abre la app ve himnos y minutas (rol "visor").
// Crear/editar minutas requiere que el administrador apruebe este celular (ver Ajustes).
const App = () => (
  <I18nProvider>
    <AccesoProvider>
      <Sonner position="top-center" />
      <BrowserRouter>
        <Routes>
          <Route path="/minuta/:id" element={<MinutaReader />} />
          <Route
            path="/*"
            element={
              <AppShell>
                <Routes>
                  <Route path="/" element={<HymnalPage />} />
                  <Route path="/hymnal" element={<HymnalPage />} />
                  <Route path="/hymnal/:number" element={<HymnDetail />} />
                  <Route path="/minutas" element={<Minutas />} />
                  <Route path="/crear" element={<EditorMinuta />} />
                  <Route path="/editar/:id" element={<EditorMinuta />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AppShell>
            }
          />
        </Routes>
      </BrowserRouter>
    </AccesoProvider>
  </I18nProvider>
);

export default App;
