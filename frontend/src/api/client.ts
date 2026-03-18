import axios from 'axios';

// In production: VITE_API_URL is empty → requests go to same origin (nginx proxies /api/* to backend)
// In development: VITE_API_URL=http://localhost:8000 → direct to backend
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
});

/** Set or clear the auth token used for API requests */
export function setAuthToken(token: string | null) {
  if (token) {
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common['Authorization'];
  }
}

export default client;
