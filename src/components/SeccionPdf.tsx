// Ajustes → Himnario en PDF: descargar la versión más reciente del himnario completo.
// El PDF se actualiza con `npm run pdf -- "<ruta del PDF>"` (ver scripts/actualizar-pdf.mjs).
import { Download, FileDown } from 'lucide-react';
import pdf from '@/datos/pdf.json';
import { useI18n } from '@/lib/i18n/index';
import { formatearFecha } from '@/lib/minutaUtils';

export default function SeccionPdf() {
  const { t } = useI18n();
  // Texto a la izquierda y un botón redondo de descarga a la derecha (Josué: el botón a todo lo ancho no le gustaba).
  return (
    <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          <FileDown size={14} className="text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">{t.pdf_title}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {t.pdf_description} {t.pdf_updated} {formatearFecha(pdf.actualizado)} · {Math.round(pdf.bytes / 1024)} KB
        </p>
      </div>
      <a
        href={pdf.archivo}
        download="Himnario 2026.pdf"
        className="tap-btn shrink-0 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
        aria-label={t.pdf_download}
        title={t.pdf_download}
      >
        <Download size={19} />
      </a>
    </div>
  );
}
