// Himnario → "Canciones que no están en el himnario" (1.13.0, Josué): subcarpeta con las canciones guardadas al crear
// minutas (título, tonalidad e imagen opcional). Botón atrás arriba a la izquierda (además del "atrás" del celular).
// Al cambiar de pestaña y volver, la app regresa aquí (ver AppShell: última pantalla del himnario).
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Music2 } from 'lucide-react';
import { useState } from 'react';
import Zoomable from '@/components/Zoomable';
import { useI18n } from '@/lib/i18n/index';
import { urlImagen, useCancionesExtra } from '@/lib/cancionesExtra';

function Volver({ titulo }: { titulo: string }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2 px-3 pt-3 pb-2">
      <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))} aria-label={t.tab_hymnal}
              className="tap-btn p-2 rounded-full text-foreground"><ArrowLeft size={20} /></button>
      <h1 className="text-base font-bold text-foreground truncate">{titulo}</h1>
    </div>
  );
}

export function ListaCancionesFuera() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const lista = useCancionesExtra();
  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto" style={{ height: 'calc(100dvh - var(--barra))' }}>
      <Volver titulo={t.fuera_seccion} />
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-6 space-y-0.5">
        {lista.map(c => (
          <button key={c.id} onClick={() => navigate(`/hymnal/extra/${c.id}`)}
                  className="tap-btn flex items-center gap-2 py-2 px-2.5 rounded-lg w-full text-left">
            <Music2 size={14} className="text-muted-foreground/70 shrink-0" />
            <span className="flex-1 min-w-0 text-foreground text-xs font-medium truncate">{c.titulo}</span>
            {c.tonalidad && <span translate="no" className="text-hymn-key font-semibold text-xs w-7 shrink-0 text-center">{c.tonalidad}</span>}
          </button>
        ))}
        {lista.length === 0 && <p className="text-muted-foreground text-xs text-center py-8">{t.fuera_vacio}</p>}
      </div>
    </div>
  );
}

export function CancionFuera() {
  const { t } = useI18n();
  const { id } = useParams();
  const c = useCancionesExtra().find(x => x.id === id);
  const [error, setError] = useState(false);
  if (!c) return <div className="p-6 text-center text-sm text-muted-foreground">{t.hymnal_no_results}</div>;
  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto overflow-clip" style={{ height: 'calc(100dvh - var(--barra))' }}>
      <Volver titulo={c.titulo} />
      {c.imagen && !error ? (
        <Zoomable className="flex-1 min-h-0 w-full" reiniciarCon={c.imagen}>
          <div className="h-full w-full flex flex-col items-center px-3 pb-4 gap-2">
            <div className="flex items-center gap-2">
              {c.tonalidad && <span translate="no" className="font-semibold text-hymn-key">{c.tonalidad}</span>}
              <span className="rounded-md border border-border px-1.5 py-px text-[10px] text-muted-foreground">{t.fuera_etiqueta}</span>
            </div>
            {/* Contorno y marca: es una imagen subida, no parte de la app (sustituto provisorio). */}
            <div className="relative flex-1 min-h-0 w-full max-w-lg flex items-center justify-center pt-2">
              <div className="relative rounded-lg border-2 border-dashed border-muted-foreground/40 p-1.5 max-h-full">
                <span className="absolute -top-2.5 left-3 bg-background px-1.5 text-[10px] text-muted-foreground">{t.fuera_imagen_subida}</span>
                <img src={urlImagen(c.imagen)} alt={c.titulo} draggable={false} onError={() => setError(true)}
                     className="block w-full max-h-[calc(100dvh-var(--barra)-9rem)] object-contain rounded" />
              </div>
            </div>
          </div>
        </Zoomable>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
          <Music2 size={34} className="text-muted-foreground/60" />
          <span className="text-2xl font-semibold text-foreground">{c.titulo}</span>
          {c.tonalidad && <span translate="no" className="text-xl font-semibold text-hymn-key">{c.tonalidad}</span>}
          <span className="text-xs text-muted-foreground mt-2">{t.fuera_no_esta}</span>
        </div>
      )}
    </div>
  );
}
