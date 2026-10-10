/**
 * Shared hymnal state that persists across navigation within a session.
 * Module-level variables survive React component unmount/remount.
 */

export type TempoFilter = 'all' | 'fast' | 'slow';

// Filter state
let _selectedKey: string | null = null;
let _selectedTempo: TempoFilter = 'all';
let _search: string = '';

// Scroll restoration
let _scrollTop: number = 0;

// Navigation context: filtered hymn numbers for swipe in HymnDetail
let _filteredNumbers: number[] = [];

export function getFilters() {
  return { selectedKey: _selectedKey, selectedTempo: _selectedTempo, search: _search };
}

export function setFilters(key: string | null, tempo: TempoFilter, search: string) {
  _selectedKey = key;
  _selectedTempo = tempo;
  _search = search;
}

export function getScrollTop() {
  return _scrollTop;
}

export function setScrollTop(v: number) {
  _scrollTop = v;
}

export function getFilteredNumbers() {
  return _filteredNumbers;
}

export function setFilteredNumbers(nums: number[]) {
  _filteredNumbers = nums;
}
