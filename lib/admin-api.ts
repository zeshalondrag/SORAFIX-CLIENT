import { api } from './api';

// Типы для аудит-логов
export type AuditLog = {
  id: number;
  tableName: string;
  table_name?: string;
  operation: string;
  recordId: string | number;
  record_id?: string | number;
  oldData: string | null;
  old_data?: string | null;
  newData: string | null;
  new_data?: string | null;
  userId: number | null;
  user_id?: number | null;
  userIp?: string | null;
  user_ip?: string | null;
  createdAt: string;
  created_at?: string;
};

// Типы для пользователей (расширенный)
export type AdminUser = {
  id: number;
  roleId: number;
  role_id?: number;
  lastName: string;
  last_name?: string;
  firstName: string;
  first_name?: string;
  middleName: string | null;
  middle_name?: string | null;
  email: string;
  phone: string;
  isActive: boolean;
  is_active?: boolean;
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  updated_at?: string;
  emailVerified: boolean;
  email_verified?: boolean;
};

export type UpdateUserPayload = {
  lastName: string;
  firstName: string;
  middleName?: string | null;
  email: string;
  phone: string;
};

// Роли
export const ROLE_LABELS: Record<number, string> = {
  1: 'Администратор',
  2: 'Менеджер',
  3: 'Технический специалист',
  4: 'Клиент',
};

// Хелперы
export function getAuditTableName(log: AuditLog): string {
  return log.tableName ?? log.table_name ?? '';
}
export function getAuditRecordId(log: AuditLog): string {
  const id = log.recordId ?? log.record_id;
  return id === undefined || id === null ? '' : String(id);
}
export function getAuditOldData(log: AuditLog): string | null {
  return log.oldData ?? log.old_data ?? null;
}
export function getAuditNewData(log: AuditLog): string | null {
  return log.newData ?? log.new_data ?? null;
}
export function getAuditUserId(log: AuditLog): number | null {
  return log.userId ?? log.user_id ?? null;
}
export function getAuditCreatedAt(log: AuditLog): string {
  return log.createdAt ?? log.created_at ?? '';
}

export function getUserRoleId(user: AdminUser): number {
  return user.roleId ?? user.role_id ?? 0;
}
export function getUserIsActive(user: AdminUser): boolean {
  return user.isActive ?? user.is_active ?? false;
}
export function getUserEmailVerified(user: AdminUser): boolean {
  return user.emailVerified ?? user.email_verified ?? false;
}
export function getUserCreatedAt(user: AdminUser): string {
  return user.createdAt ?? user.created_at ?? '';
}
export function getUserLastName(user: AdminUser): string {
  return user.lastName ?? user.last_name ?? '';
}
export function getUserFirstName(user: AdminUser): string {
  return user.firstName ?? user.first_name ?? '';
}
export function getUserMiddleName(user: AdminUser): string {
  return user.middleName ?? user.middle_name ?? '';
}

// API
export const auditApi = {
  async getLogs(): Promise<AuditLog[]> {
    return api.get<AuditLog[]>('/AuditLogs');
  },
  async getLog(id: number): Promise<AuditLog> {
    return api.get<AuditLog>(`/AuditLogs/${id}`);
  },
};

export const adminUsersApi = {
  async getUsers(): Promise<AdminUser[]> {
    return api.get<AdminUser[]>('/Users');
  },
  async getUser(id: number): Promise<AdminUser> {
    return api.get<AdminUser>(`/Users/${id}`);
  },
  async getUsersByRole(roleId: number): Promise<AdminUser[]> {
    return api.get<AdminUser[]>(`/Users/role/${roleId}`);
  },
  async updateUser(userId: number, data: UpdateUserPayload): Promise<AdminUser> {
    return api.put<AdminUser>(`/Users/${userId}`, data);
  },
  // Изменить роль пользователя
  async changeRole(userId: number, roleId: number): Promise<void> {
    return api.patch(`/Users/${userId}/role`, { roleId });
  },
  // Деактивировать/активировать пользователя
  async toggleActive(userId: number, isActive: boolean): Promise<void> {
    return api.patch(`/Users/${userId}/active`, { isActive });
  },
};

// Маскировка данных
export function maskEmail(email: string): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const visibleLocal = local.length > 2 ? local[0] + '***' + local[local.length - 1] : '***';
  return `${visibleLocal}@${domain}`;
}

export function maskPhone(phone: string): string {
  if (!phone) return '';
  if (phone.length < 6) return '***';
  return phone.slice(0, 4) + '****' + phone.slice(-2);
}

// Форматирование даты для аудита
export function formatAuditDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

// Названия таблиц для отображения
export const TABLE_LABELS: Record<string, string> = {
  users: 'Пользователи',
  requests: 'Заявки',
  request_statuses: 'Статусы заявок',
  request_types: 'Типы заявок',
  chat_messages: 'Сообщения чата',
  notifications: 'Уведомления',
  attachments: 'Вложения',
  request_status_history: 'История статусов',
  roles: 'Роли',
  audit_logs: 'Аудит',
};

// Названия операций
export const OPERATION_LABELS: Record<string, string> = {
  INSERT: 'Создание',
  UPDATE: 'Обновление',
  DELETE: 'Удаление',
};

export const OPERATION_COLORS: Record<string, string> = {
  INSERT: '#10B981',
  UPDATE: '#F59E0B',
  DELETE: '#EF4444',
};
