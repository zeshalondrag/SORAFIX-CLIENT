import { api } from './api';

export type Role = {
  id: number;
  name: string;
  description: string;
};

export type RequestType = {
  id: number;
  name: string;
  description: string;
};

export type RequestStatus = {
  id: number;
  name: string;
  description: string;
};

export const rolesApi = {
  async getAll(): Promise<Role[]> {
    return api.get<Role[]>('/Roles');
  },
  async getById(id: number): Promise<Role> {
    return api.get<Role>(`/Roles/${id}`);
  },
};

export const requestTypesApi = {
  async getAll(): Promise<RequestType[]> {
    return api.get<RequestType[]>('/RequestTypes');
  },
  async getById(id: number): Promise<RequestType> {
    return api.get<RequestType>(`/RequestTypes/${id}`);
  },
};

export const requestStatusesApi = {
  async getAll(): Promise<RequestStatus[]> {
    return api.get<RequestStatus[]>('/RequestStatus');
  },
  async getById(id: number): Promise<RequestStatus> {
    return api.get<RequestStatus>(`/RequestStatus/${id}`);
  },
};
