/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
export const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
export const debounce = (fn, milliseconds = 150) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), milliseconds);
  };
};
export const storageGet = (key, fallback = '') => {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
};
export const storageSet = (key, value) => {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
};
export const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));
export const slug = value => String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'filter';
