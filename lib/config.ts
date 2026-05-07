const PROD_API_URL = 'https://sorafix-server.onrender.com/api';
const DEV_API_URL = 'http://localhost:5104/api';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && (window as any).__API_URL__) ||
  DEV_API_URL;

export const AUTH_TOKEN_KEY = 'sorapc_auth_token';
export const USER_DATA_KEY = 'sorapc_user_data';