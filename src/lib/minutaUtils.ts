import type { ParsedSong } from '@/lib/types';

/**
 * For exactly 3 real songs (no Palabra/Oración), insert ORACIÓN between songs 2 and 3.
 * For more than 3 real songs, append PALABRA at the end.
 */
export function applyOracionRule(songs: ParsedSong[]): ParsedSong[] {
  const realSongs = songs.filter(s => !s.isPalabra && !s.isOracion);

  // Already has Palabra or Oración? Don't double-insert
  if (songs.some(s => s.isPalabra || s.isOracion)) return songs;

  if (realSongs.length === 3) {
    return [
      { ...realSongs[0], position: 1 },
      { ...realSongs[1], position: 2 },
      { position: 0, title: 'ORACIÓN', key: null, hymnNumber: null, found: true, isOracion: true },
      { ...realSongs[2], position: 3 },
    ];
  }

  if (realSongs.length > 3) {
    return [
      ...songs,
      { position: 0, title: 'PALABRA', key: null, hymnNumber: null, found: true, isPalabra: true },
    ];
  }

  return songs;
}
