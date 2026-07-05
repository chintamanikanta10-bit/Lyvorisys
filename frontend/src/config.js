const apiOrigin = import.meta.env.VITE_API_ORIGIN || (import.meta.env.DEV ? 'http://localhost:8001' : '');

export const API_ORIGIN = apiOrigin.replace(/\/$/, '');
export const API_BASE = `${API_ORIGIN}/api`;
