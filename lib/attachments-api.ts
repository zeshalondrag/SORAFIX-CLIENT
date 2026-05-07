import { api } from './api';
import { type Photo } from './requests-api';

export const attachmentsApi = {
  async getAll(): Promise<Photo[]> {
    return api.get<Photo[]>('/Attachments');
  },
  async getById(id: number): Promise<Photo> {
    return api.get<Photo>(`/Attachments/${id}`);
  },
  async getByRequestId(requestId: number): Promise<Photo[]> {
    return api.get<Photo[]>(`/Attachments/request/${requestId}`);
  },
};
