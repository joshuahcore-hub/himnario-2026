export interface ParsedSong {
  position: number;
  title: string;
  key: string | null;
  hymnNumber: number | null;
  found: boolean;
  isPalabra?: boolean;
  isOracion?: boolean;
  /** (1.13.0) "Especial" + nombre (p. ej. "Especial Javiera"): no es alabanza, no lleva número. */
  isEspecial?: boolean;
  /** Nombre del especial (lo que va después de "Especial"). */
  nombre?: string;
  /** (1.13.0) Alabanza que NO está en el himnario (escrita a mano): sin número; tonalidad e imagen opcionales. */
  fuera?: boolean;
  /** Id de la imagen subida para una alabanza fuera del himnario (sustituto provisorio de la letra). */
  imagen?: string | null;
  /** (1.18.2) Texto libre entre medio (una acotación, "oportunidad de…"): no es alabanza, no lleva número. */
  isTexto?: boolean;
  /** Lo escrito en un texto libre. */
  texto?: string;
  /** (1.18.2) Antes de esta alabanza se anuncia la OFRENDA. */
  ofrenda?: boolean;
  /** (1.18.2) Alabanza fuera del himnario: 'lenta' o 'rapida'. */
  tempo?: 'lenta' | 'rapida' | null;
  isGrouped?: boolean;
  /** Alabanza unida a esta (van juntas). Puede tener a su vez otra unida: grupos de cualquier tamaño (1.18.2). */
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
  /** Solo para el admin: es una copia (se muestra "Duplicada por" en vez de "Creada por"). */
  duplicada?: boolean;
  /** (1.16.0) Espacio (Batuco, Talca…). Las de antes: Batuco. */
  espacio?: string;
}
