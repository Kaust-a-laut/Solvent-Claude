const isBrowser = typeof window !== 'undefined';
const isElectron = isBrowser && /Electron/i.test(navigator.userAgent);

// In Electron with file://, window.location.hostname is empty. Default to localhost.
const host = (isBrowser && window.location.hostname && window.location.hostname !== '') 
  ? window.location.hostname 
  : 'localhost';

export const BASE_URL = isElectron ? `http://${host}:3001` : '';
export const API_BASE_URL = `${BASE_URL}/api/v1`;
