import { api } from './api';

export type VerificationCode = {
  id: number;
  userId: number;
  user_id?: number;
  type: 'password' | 'restore' | 'verification' | string;
  code: string;
  createdAt: string;
  created_at?: string;
  expiresAt: string;
  expires_at?: string;
};

export type CreateVerificationCodePayload = {
  userId: number;
  type: 'password' | 'restore' | 'verification' | string;
  code: string;
  expiresAt: string;
};

export const verificationCodesApi = {
  async getAll(): Promise<VerificationCode[]> {
    return api.get<VerificationCode[]>('/VerificationCodes');
  },
  async getById(id: number): Promise<VerificationCode> {
    return api.get<VerificationCode>(`/VerificationCodes/${id}`);
  },
  async create(data: CreateVerificationCodePayload): Promise<VerificationCode> {
    return api.post<VerificationCode>('/VerificationCodes', data);
  },
};
