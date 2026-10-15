import { Toaster as Sonner } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { I18nProvider } from "@/lib/i18n/index";
import { AccesoProvider, useAcceso } from "@/hooks/useAcceso";
import AppShell from "@/components/AppShell";
import HymnalPage from "@/pages/Hymnal";
import HymnDetail from "@/pages/HymnDetail";
import SettingsPage from "@/pages/Settings";
import Minutas from "@/pages/Minutas";
import MinutaReader from "@/pages/MinutaReader";
import EditorMinuta from "@/pages/EditorMinuta";
import Admin from "@/pages/Admin";
import { CancionFuera, ListaCancionesFuera } from "@/pages/CancionesFuera";

// Sin login: cualquiera que abre la app ve el himnario. Las minutas, solo registrado y con el permiso "Ver minutas"
// que da el administrador (1.11.0, Josué). Crear/editar minutas también lo activa el administrador.
function SoloConMinutas({ children }: { children: JSX.Element }) {
  const { puedeVerMinutas } = useAcceso();
  return puedeVerMinutas ? children : <Navigate to="/" replace />;
}

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
                  <Route path="/hymnal/extra" element={<ListaCancionesFuera />} />
                  <Route path="/hymnal/extra/:id" element={<CancionFuera />} />
                  <Route path="/hymnal/:number" element={<HymnDetail />} />
                  <Route path="/minutas" element={<SoloConMinutas><Minutas /></SoloConMinutas>} />
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
