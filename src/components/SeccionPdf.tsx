// Ajustes → Himnario en PDF: descargar la versión más reciente del himnario completo.
// El PDF se actualiza con `npm run pdf -- "<ruta del PDF>"` (ver scripts/actualizar-pdf.mjs).
import { FileDown } from 'lucide-react';
import pdf from '@/datos/pdf.json';
import { useI18n } from '@/lib/i18n/index';
import { formatearFecha } from '@/lib/minutaUtils';

export default function SeccionPdf() {
  const { t } = useI18n();
  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FileDown size={14} className="text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">{t.pdf_title}</span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {t.pdf_description} {t.pdf_updated} {formatearFecha(pdf.actualizado)} · {Math.round(pdf.bytes / 1024)} KB
      </p>
      <a
        href={pdf.archivo}
        download="Himnario 2026.pdf"
        className="tap-btn flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
      >
        <FileDown size={16} />
        {t.pdf_download}
      </a>
    </div>
  );
}
