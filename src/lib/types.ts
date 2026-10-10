export interface ParsedSong {
  position: number;
  title: string;
  key: string | null;
  hymnNumber: number | null;
  found: boolean;
  isPalabra?: boolean;
  isOracion?: boolean;
  isGrouped?: boolean;
  groupedWith?: ParsedSong;
  firstLine?: string;
  psalmTitle?: boolean;
}

export interface MinutaPreview {
  date: string;
  songs: ParsedSong[];
}

export interface MinutaData {
  id: string;
  title: string;
  date: string;
  songs: any;
  raw_text: string | null;
  created_at: string;
  created_by: string | null;
  status: string;
  updated_at?: string;
  pinned?: boolean;
}
