export interface ParsedSong {
  position: number;
  title: string;
  key: string | null;
  hymnNumber: number | null;
  found: boolean;
  isPalabra?: boolean;
  isOracion?: boolean;
  isGrouped?: boolean;
  groupedWith?: ParsedSong | null;
  firstLine?: string | null;
  psalmTitle?: boolean;
}

export interface Autor {
  nombre: string;
  color: string;
}

export interface MinutaData {
  id: string;
  titulo: string;
  fecha: string;
  cantos: ParsedSong[];
  texto_original: string | null;
  fijada: boolean;
  /** true: la ven todos. false: solo quien la creó (borrador privado). */
  publicada: boolean;
  /** La creó este celular (para mostrarle si está publicada o es solo suya). */
  mia: boolean;
  creada: string;
  actualizada: string;
  creador: Autor | null;
  editor: Autor | null;
}
