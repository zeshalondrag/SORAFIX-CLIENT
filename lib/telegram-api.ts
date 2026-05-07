import { api } from './api';

export type TelegramConnectLinkResponse = {
  link?: string;
  url?: string;
  message?: string;
};

export const telegramApi = {
  async getConnectLink(): Promise<TelegramConnectLinkResponse> {
    return api.get<TelegramConnectLinkResponse>('/Telegram/connect-link');
  },
};
