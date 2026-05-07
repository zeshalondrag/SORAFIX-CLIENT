import { API_BASE_URL, AUTH_TOKEN_KEY } from './config';
import { storage } from './storage';

export type ApiError = {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
  needsRestoration?: boolean;
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await storage.getItem(AUTH_TOKEN_KEY);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: T | { message?: string; errors?: Record<string, string[]> };
  try {
    data = text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    data = { message: text || 'Ошибка сервера' } as T;
  }

  if (!res.ok) {
    const err = data as { message?: string; errors?: Record<string, string[]>; needsRestoration?: boolean };
    throw {
      message: err.message || `Ошибка ${res.status}`,
      status: res.status,
      errors: err.errors,
      needsRestoration: err.needsRestoration,
    } as ApiError;
  }

  return data as T;
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}${path}`, { headers });
    return handleResponse<T>(res);
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  async put<T>(path: string, body?: unknown): Promise<T> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PUT',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PATCH',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  async delete<T>(path: string): Promise<T> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}${path}`, { method: 'DELETE', headers });
    return handleResponse<T>(res);
  },

  /** Отправка FormData (для загрузки файлов). Content-Type устанавливается автоматически. */
  async uploadFormData<T>(path: string, formData: FormData): Promise<T> {
    const token = await storage.getItem(AUTH_TOKEN_KEY);
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return handleResponse<T>(res);
  },
};