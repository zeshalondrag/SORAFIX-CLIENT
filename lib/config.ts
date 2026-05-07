const isDev = process.env.NODE_ENV === 'development';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (isDev ? 'http://localhost:5104/api' : 'https://sorafix-server.onrender.com/api');