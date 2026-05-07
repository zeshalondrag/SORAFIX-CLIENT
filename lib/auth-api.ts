import { api, type ApiError } from './api';
import { AUTH_TOKEN_KEY } from './config';
import { storage } from './storage';

export type User = {
  id: number;
  roleId: number;
  role_id?: number;
  role?: { id: number; name: string; description?: string };
  lastName: string;
  last_name?: string;
  firstName: string;
  first_name?: string;
  middleName?: string | null;
  middle_name?: string | null;
  email: string;
  emailVerified: boolean;
  email_verified?: boolean;
  phone: string;
  tgChatId?: number | null;
  tg_chat_id?: number | null;
  isActive?: boolean;
  is_active?: boolean;
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  updated_at?: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user?: User;
};

export type RegisterRequest = {
  lastName: string;
  firstName: string;
  middleName?: string | null;
  email: string;
  phone: string;
  password: string;
};

export type RegisterResponse = {
  token?: string;
  user?: User;
  message?: string;
};

export type ResetPasswordRequest = {
  email: string;
  code: string;
  newPassword: string;
};

export type VerifyEmailRequest = {
  email: string;
  code: string;
};

export type RequestCodeRequest = {
  email: string;
};

export type LoginErrorResponse = {
  message: string;
  needsRestoration?: boolean;
};

export const authApi = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const res = await api.post<LoginResponse>('/Auth/login', data);
    if (res.token) {
      await storage.setItem(AUTH_TOKEN_KEY, res.token);
    }
    return res;
  },

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const res = await api.post<RegisterResponse>('/Auth/register', data);
    if (res.token) {
      await storage.setItem(AUTH_TOKEN_KEY, res.token);
    }
    return res;
  },

  async validate(): Promise<User> {
    return api.get<User>('/Auth/validate');
  },

  async resetPassword(data: ResetPasswordRequest): Promise<{ message?: string }> {
    return api.post('/Auth/reset-password', data);
  },

  async logout(): Promise<void> {
    await storage.removeItem(AUTH_TOKEN_KEY);
  },

  // Запрос кода для подтверждения почты
  async requestEmailVerification(email: string): Promise<{ message: string }> {
    return api.post('/Auth/request-email-verification', { email } satisfies RequestCodeRequest);
  },

  // Верификация почты/кода
  async verifyEmail(data: VerifyEmailRequest): Promise<{ success: boolean; message: string }> {
    return api.post('/Auth/verify-code', data);
  },

  // Запрос кода для сброса пароля
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    return api.post('/Auth/request-password-reset', { email } satisfies RequestCodeRequest);
  },

  // Деактивация аккаунта
  async deactivateAccount(): Promise<{ message: string }> {
    return api.post('/Auth/deactivate');
  },

  // Запрос кода для восстановления
  async requestRestore(email: string): Promise<{ message: string }> {
    return api.post('/Auth/request-restore', { email } satisfies RequestCodeRequest);
  },

  // Подтверждение восстановления
  async verifyRestore(data: VerifyEmailRequest): Promise<{ message: string; token: string; user: User }> {
    const res = await api.post<{ message: string; token: string; user: User }>('/Auth/verify-restore', data);
    if (res.token) {
      await storage.setItem(AUTH_TOKEN_KEY, res.token);
    }
    return res;
  },
};

export function isApiError(e: unknown): e is ApiError {
  return typeof e === 'object' && e !== null && 'message' in e && 'status' in e;
}
