import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform } from 'react-native';

import { api } from './api';

// Статусы заявок
export const REQUEST_STATUSES = {
  NEW: 1,        // Новая
  WAITING: 2,    // Ожидание
  IN_PROGRESS: 3, // В работе
  CHECKING: 4,   // Проверка
  READY: 5,      // Готова
  CLOSED: 6,     // Закрыта
  CANCELLED: 7,  // Отменена
} as const;

export const STATUS_LABELS: Record<number, string> = {
  1: 'Новая',
  2: 'Ожидание',
  3: 'В работе',
  4: 'Проверка',
  5: 'Готова',
  6: 'Закрыта',
  7: 'Отменена',
};

export const STATUS_DESCRIPTIONS: Record<number, string> = {
  1: 'Ожидает обработки',
  2: 'Ожидание запчастей или обратной связи',
  3: 'Мастер выполняет заказ',
  4: 'Проверка качества выполненных работ',
  5: 'Можно забирать',
  6: 'Заказ выдан и оплачен',
  7: 'Отказ от обслуживания',
};

export const STATUS_COLORS: Record<number, string> = {
  1: '#3B82F6', // blue
  2: '#8B5CF6', // violet
  3: '#F59E0B', // amber
  4: '#06B6D4', // cyan
  5: '#10B981', // green
  6: '#6B7280', // gray
  7: '#EF4444', // red
};

// Типы услуг
export const SERVICE_TYPES = {
  DIAGNOSTIC: 1,   // Диагностика
  PC_BUILD: 2,     // Сборка ПК
  UPGRADE: 3,      // Апгрейд
  MAINTENANCE: 4,  // Обслуживание
  SOFTWARE: 5,     // Софт
} as const;

export const SERVICE_TYPE_LABELS: Record<number, string> = {
  1: 'Диагностика',
  2: 'Сборка ПК',
  3: 'Апгрейд',
  4: 'Обслуживание',
  5: 'Софт',
};

export type RequestStatus = {
  id: number;
  name: string;
  description?: string;
};

export type ServiceType = {
  id: number;
  name: string;
  description?: string;
};

export type Request = {
  id: number;
  title: string;
  description?: string;
  statusId?: number;
  status_id?: number;
  status?: RequestStatus;
  requestTypeId?: number;
  request_type_id?: number;
  requestType?: ServiceType;
  clientId?: number;
  client_id?: number;
  employeeId?: number;
  employee_id?: number;
  price?: number;
  Price?: number;
  isPriceConfirmed?: boolean;
  is_price_confirmed?: boolean;
  IsPriceConfirmed?: boolean;
  isPaid?: boolean;
  is_paid?: boolean;
  IsPaid?: boolean;
  yookassaPaymentId?: string | null;
  yookassa_payment_id?: string | null;
  YookassaPaymentId?: string | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  closedAt?: string;
  closed_at?: string;
  photos?: string[];
};

export type AssignEmployeePayload = {
  employeeId: number;
};

export type UpdatePricePayload = {
  price: number;
};

export type VerifyRequestPayload = {
  isApproved: boolean;
};

export type CreateRequestData = {
  title: string;
  description?: string;
  requestTypeId: number;
};

export type RequestStats = {
  inProgress: number;
  closed: number;
  total: number;
};

export type RequestsFilter = {
  statusId?: number;
  search?: string;
  limit?: number;
  offset?: number;
};

/** Вложение в сообщении чата (после нормализации) */
export type ChatAttachmentItem = {
  url: string;
  originalName?: string;
  fileType?: string;
};

/** Сырой элемент из API: URL-строка или объект вложения */
type ChatAttachmentRaw =
  | string
  | {
      filePath?: string;
      file_path?: string;
      FilePath?: string;
      url?: string;
      originalName?: string;
      original_name?: string;
      OriginalName?: string;
      fileType?: string;
      file_type?: string;
      FileType?: string;
    };

// Типы для чата
export type ChatMessage = {
  id: number;
  requestId: number;
  request_id?: number;
  text: string;
  messageText?: string | null;
  message_text?: string | null;
  createdAt: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  /** Поддержка PascalCase из части C#-ответов */
  UpdatedAt?: string;
  userId: number;
  user_id?: number;
  firstName: string;
  lastName: string;
  roleName: string;
  isEdited?: boolean;
  is_edited?: boolean;
  IsEdited?: boolean;
  attachments?: ChatAttachmentItem[];
  /** PascalCase / сырой ответ C# */
  Attachments?: ChatAttachmentRaw[];
};

function parseChatAttachmentRaw(entry: ChatAttachmentRaw): ChatAttachmentItem | null {
  if (typeof entry === 'string' && entry.trim()) {
    return { url: entry.trim() };
  }
  if (entry && typeof entry === 'object') {
    const url =
      (entry.filePath ?? entry.file_path ?? (entry as { FilePath?: string }).FilePath ?? entry.url) || '';
    if (typeof url !== 'string' || !url.trim()) return null;
    const originalName = (entry.originalName ??
      entry.original_name ??
      (entry as { OriginalName?: string }).OriginalName) as string | undefined;
    const fileType = (entry.fileType ??
      entry.file_type ??
      (entry as { FileType?: string }).FileType) as string | undefined;
    return {
      url: url.trim(),
      originalName: typeof originalName === 'string' && originalName.trim() ? originalName.trim() : undefined,
      fileType: typeof fileType === 'string' && fileType ? fileType : undefined,
    };
  }
  return null;
}

export function getChatAttachmentDisplayName(item: ChatAttachmentItem): string {
  if (item.originalName?.trim()) return item.originalName.trim();
  return fileNameFromUrl(item.url, 'файл');
}

export type SendMessageData = {
  requestId: number;
  text: string;
};

export type UpdateMessageData = {
  text: string;
};

export type ChatUploadFile = {
  uri: string;
  name: string;
  type: string;
};

export type UploadChatMessageFileResult = {
  messageId: number;
  filePath?: string;
};

// История статусов
export type StatusHistoryItem = {
  id: number;
  requestId: number;
  statusId: number;
  changedBy: number;
  changedAt: string;
  changed_at?: string;
  status_id?: number;
};

// Пользователь (для отображения данных клиента/исполнителя)
export type UserInfo = {
  id: number;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phone: string;
  roleId: number;
  isActive?: boolean;
  emailVerified?: boolean;
};

export const requestsApi = {
  // Получить заявки клиента
  async getRequests(): Promise<Request[]> {
    return api.get<Request[]>('/Requests');
  },

  // Получить заявку по ID
  async getRequest(id: number): Promise<Request> {
    return api.get<Request>(`/Requests/${id}`);
  },

  // Создать заявку
  async createRequest(data: CreateRequestData): Promise<Request> {
    return api.post<Request>('/Requests', data);
  },

  // Обновить цену заявки
  async updateRequestPrice(id: number, price: number): Promise<void> {
    return api.patch(`/Requests/${id}/price`, { price });
  },

  // Подтвердить/отклонить цену клиентом
  async confirmRequestPrice(id: number, isConfirmed = true): Promise<void> {
    return api.patch(`/Requests/${id}/confirm-price`, { isConfirmed });
  },

  // Сформировать ссылку на оплату (ЮKassa) для клиента
  async generatePayment(id: number): Promise<{ paymentUrl: string }> {
    return api.post<{ paymentUrl: string }>(`/Payments/${id}/generate`, {});
  },

  // Назначить исполнителя
  async assignEmployee(id: number, employeeId: number): Promise<void> {
    return api.patch(`/Requests/${id}/assign`, { employeeId });
  },

  // Отменить заявку
  async cancelRequest(id: number): Promise<void> {
    return api.patch(`/Requests/${id}/cancel`, {});
  },

  // Закрыть заявку
  async closeRequest(id: number): Promise<void> {
    return api.patch(`/Requests/${id}/close`, {});
  },

  // Специалист принимает заявку (статус → В работе)
  async acceptRequest(id: number): Promise<void> {
    return api.patch(`/Requests/${id}/accept`, {});
  },

  // Специалист завершает выполнение (статус → Готова)
  async completeRequest(id: number): Promise<void> {
    return api.patch(`/Requests/${id}/complete`, {});
  },

  // Менеджер подтверждает/отклоняет результат (статус "Проверка")
  async verifyRequest(id: number, isApproved: boolean): Promise<void> {
    return api.patch(`/Requests/${id}/verify`, { isApproved } satisfies VerifyRequestPayload);
  },

  // Сформировать договор по заявке
  async generateContract(id: number): Promise<{ filePath?: string; url?: string; message?: string }> {
    return api.post(`/Requests/${id}/generate-contract`, {});
  },

  // Вычислить статистику из списка заявок
  calculateStats(requests: Request[]): RequestStats {
    const inProgress = requests.filter((r) => getStatusId(r) === REQUEST_STATUSES.IN_PROGRESS).length;
    const closed = requests.filter((r) => getStatusId(r) === REQUEST_STATUSES.CLOSED).length;
    return { inProgress, closed, total: requests.length };
  },
};

// API для чата
export const chatApi = {
  // Получить сообщения чата по заявке
  async getMessages(requestId: number): Promise<ChatMessage[]> {
    const messages = await api.get<ChatMessage[]>(`/ChatMessages/request/${requestId}`);
    return messages.map(normalizeChatMessage);
  },

  // Отправить сообщение
  async sendMessage(data: SendMessageData): Promise<ChatMessage> {
    const message = await api.post<ChatMessage>('/ChatMessages', data);
    return normalizeChatMessage(message);
  },

  // Обновить сообщение
  async updateMessage(id: number, data: UpdateMessageData): Promise<void> {
    return api.put(`/ChatMessages/${id}`, data);
  },

  // Удалить сообщение
  async deleteMessage(id: number): Promise<void> {
    return api.delete(`/ChatMessages/${id}`);
  },

  // Загрузить вложение в сообщение
  async uploadMessageFile(
    requestId: number,
    file: File | ChatUploadFile
  ): Promise<UploadChatMessageFileResult> {
    const formData = new FormData();
    // Бэкенд: UploadChatFile(int requestId, IFormFile file) — имя поля в multipart: "file"
    if (file instanceof File) {
      formData.append('file', file);
    } else {
      // Web: convert URI to real File/Blob, otherwise browser sends "[object Object]".
      if (typeof window !== 'undefined') {
        const response = await fetch(file.uri);
        const blob = await response.blob();
        const preparedFile = new File([blob], file.name, {
          type: file.type || blob.type || 'application/octet-stream',
        });
        formData.append('file', preparedFile);
      } else {
        const prepared = {
          uri: file.uri,
          name: file.name,
          type: file.type,
        } as unknown as Blob;
        formData.append('file', prepared);
      }
    }
    const data = await api.uploadFormData<Record<string, unknown>>(
      `/ChatMessages/${requestId}/upload`,
      formData
    );
    const messageId = Number(
      (data as { id?: number }).id ??
        (data as { Id?: number }).Id ??
        (data as { messageId?: number }).messageId
    );
    if (!Number.isFinite(messageId) || messageId <= 0) {
      throw new Error('Invalid upload response');
    }
    const filePath = (() => {
      const v = (data as { filePath?: string; FilePath?: string }).filePath;
      if (v) return v;
      return (data as { FilePath?: string }).FilePath;
    })();
    return { messageId, filePath };
  },
};

// API для истории статусов
export const statusHistoryApi = {
  // Получить всю историю статусов
  async getAll(): Promise<StatusHistoryItem[]> {
    return api.get<StatusHistoryItem[]>('/RequestStatusHistories');
  },

  // Получить историю статусов заявки
  async getHistory(requestId: number): Promise<StatusHistoryItem[]> {
    return api.get<StatusHistoryItem[]>(`/RequestStatusHistories/request/${requestId}`);
  },

  // Получить запись истории по ID
  async getById(id: number): Promise<StatusHistoryItem> {
    return api.get<StatusHistoryItem>(`/RequestStatusHistories/${id}`);
  },
};

// API для пользователей
export const usersApi = {
  // Получить всех пользователей
  async getUsers(): Promise<UserInfo[]> {
    return api.get<UserInfo[]>('/Users');
  },

  // Получить пользователя по ID
  async getUser(id: number): Promise<UserInfo> {
    return api.get<UserInfo>(`/Users/${id}`);
  },

  // Получить пользователей по роли
  async getUsersByRole(roleId: number): Promise<UserInfo[]> {
    return api.get<UserInfo[]>(`/Users/role/${roleId}`);
  },

  // Получить технических специалистов (roleId = 3)
  async getTechnicians(): Promise<UserInfo[]> {
    return api.get<UserInfo[]>('/Users/role/3');
  },

  // Обновить пользователя
  async updateUser(id: number, data: {
    lastName: string;
    firstName: string;
    middleName?: string | null;
    email: string;
    phone: string;
  }): Promise<void> {
    return api.patch(`/Users/${id}/profile`, data);
  },

  // Изменить роль пользователя
  async changeRole(id: number, roleId: number): Promise<void> {
    return api.patch(`/Users/${id}/role`, { roleId });
  },

  // Активировать/деактивировать пользователя
  async toggleActive(id: number, isActive: boolean): Promise<void> {
    return api.patch(`/Users/${id}/active`, { isActive });
  },
};

// Тип фото
export type Photo = {
  id: number;
  requestId: number;
  request_id?: number;
  uploadedBy: number;
  uploaded_by?: number;
  filePath: string;
  file_path?: string;
  originalName?: string;
  original_name?: string;
  fileType: string;
  file_type?: string;
  fileSize?: number;
  file_size?: number;
  attachmentType?: string;
  attachment_type?: string;
  createdAt: string;
  created_at?: string;
};

// API для фотографий
export const photosApi = {
  // Получить фото заявки
  async getPhotos(requestId: number): Promise<Photo[]> {
    const items = await api.get<Photo[]>(`/Attachments/request/${requestId}`);
    return items.map(normalizeAttachment);
  },

  // Загрузить фото к заявке
  async uploadPhoto(requestId: number, file: { uri: string; name: string; type: string }): Promise<Photo> {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);
    const item = await api.uploadFormData<Photo>(`/Requests/${requestId}/upload-images`, formData);
    return normalizeAttachment(item);
  },

  // Загрузка фото для веб (из File объекта)
  async uploadPhotoWeb(requestId: number, file: File): Promise<Photo> {
    const formData = new FormData();
    formData.append('files', file);
    const item = await api.uploadFormData<Photo>(`/Requests/${requestId}/upload-images`, formData);
    return normalizeAttachment(item);
  },

  // Загрузка фото из URI (для expo/web)
  async uploadFromUri(requestId: number, uri: string, index: number): Promise<Photo> {
    const formData = new FormData();

    // На вебе fetch URI и создать Blob
    const response = await fetch(uri);
    const blob = await response.blob();
    const ext = blob.type.includes('png') ? 'png' : 'jpg';
    const fileName = `photo_${index + 1}.${ext}`;
    const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
    formData.append('files', file);

    const item = await api.uploadFormData<Photo>(`/Requests/${requestId}/upload-images`, formData);
    return normalizeAttachment(item);
  },

  // Удалить фото
  async deletePhoto(id: number): Promise<void> {
    return api.delete(`/Attachments/${id}`);
  },
};

// Хелпер для получения URL фото
export function getPhotoUrl(photo: Photo): string {
  return photo.filePath ?? photo.file_path ?? '';
}

/** Служебные подписи в чате при загрузке файла (скрываем, если показываем миниатюру) */
const CHAT_PLACEHOLDER_TEXTS = new Set(['[Фотография]', '[Документ]']);

export function isChatPlaceholderText(text: string | null | undefined): boolean {
  const t = (text ?? '').trim();
  return CHAT_PLACEHOLDER_TEXTS.has(t);
}

export function isLikelyPdfUrl(url: string): boolean {
  if (!url) return false;
  return /\.pdf($|\?|#)/i.test(url.split(/[?#]/)[0] ?? url);
}

export function isLikelyImageUrl(url: string): boolean {
  if (!url) return false;
  if (isLikelyPdfUrl(url)) return false;
  const path = url.split(/[?#]/)[0] ?? url;
  return /\.(jpe?g|png|gif|webp|bmp)($|\/)/i.test(path);
}

export function fileNameFromUrl(url: string, fallback: string): string {
  try {
    const u = new URL(url);
    const seg = u.pathname.split('/').filter(Boolean).pop() || fallback;
    return decodeURIComponent(seg) || fallback;
  } catch {
    return fallback;
  }
}

function isYooKassaHostedPaymentUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return host === 'yoomoney.ru' || host.endsWith('.yoomoney.ru') || host === 'yookassa.ru' || host.endsWith('.yookassa.ru');
  } catch {
    return false;
  }
}

/** В блоке «Фото» справа — только изображения, без PDF и прочих документов */
export function isPhotoForRequestSidebar(photo: Photo): boolean {
  const mime = (photo.fileType ?? (photo as { file_type?: string }).file_type ?? '').toLowerCase();
  if (mime === 'application/pdf') return false;
  if (mime.startsWith('image/')) return true;
  const u = (photo.filePath ?? (photo as { file_path?: string }).file_path ?? '').toLowerCase();
  if (u.includes('.pdf')) return false;
  if (/\.(jpe?g|png|gif|webp|bmp)($|\/|\?|#)/i.test(u)) return true;
  return false;
}

/** Скачать/открыть вложение (веб: скачивание blob при возможности) */
export async function openAttachmentUrl(url: string, suggestedName?: string) {
  if (!url) return;
  const name = suggestedName || fileNameFromUrl(url, 'file');
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (isYooKassaHostedPaymentUrl(url)) {
      // confirmation_url от ЮKassa — это hosted payment page, ее нельзя читать через fetch (CORS).
      window.location.assign(url);
      return;
    }

    try {
      const res = await fetch(url, { mode: 'cors' });
      if (res.ok) {
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = name;
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 2500);
        return;
      }
    } catch {
      // fallback below
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    await Linking.openURL(url);
  }
}

function normalizeChatMessage(message: ChatMessage): ChatMessage {
  const createdAt = message.createdAt ?? message.created_at ?? '';
  const updatedAt =
    message.updatedAt ?? message.updated_at ?? message.UpdatedAt ?? createdAt;
  const explicitEdited = message.isEdited ?? message.is_edited ?? message.IsEdited;
  const inferredEdited = Boolean(createdAt && updatedAt && createdAt !== updatedAt);

  const rawAttach = (message as { attachments?: unknown; Attachments?: unknown }).attachments ?? message.Attachments;
  const normalizedAttachments: ChatAttachmentItem[] = Array.isArray(rawAttach)
    ? (rawAttach as ChatAttachmentRaw[]).map(parseChatAttachmentRaw).filter((x): x is ChatAttachmentItem => x != null)
    : [];

  const hasAttachments = normalizedAttachments.length > 0;
  const t0 = new Date(createdAt).getTime();
  const t1 = new Date(updatedAt).getTime();
  const timeDiffMs = Number.isFinite(t0) && Number.isFinite(t1) ? t1 - t0 : 0;
  const baseEdited = explicitEdited ?? inferredEdited ?? false;
  // PUT после upload выставляет IsEdited, хотя для пользователя это первая подпись к файлу
  const isEdited =
    hasAttachments && baseEdited && timeDiffMs < 20_000 ? false : baseEdited;

  return {
    ...message,
    requestId: message.requestId ?? message.request_id ?? 0,
    userId: message.userId ?? message.user_id ?? 0,
    text: message.text ?? message.messageText ?? message.message_text ?? '',
    firstName: message.firstName ?? '',
    lastName: message.lastName ?? '',
    roleName: message.roleName ?? '',
    createdAt,
    updatedAt,
    isEdited,
    attachments: normalizedAttachments,
  };
}

function normalizeAttachment(item: Photo): Photo {
  return {
    ...item,
    requestId: item.requestId ?? item.request_id ?? 0,
    uploadedBy: item.uploadedBy ?? item.uploaded_by ?? 0,
    filePath: item.filePath ?? item.file_path ?? '',
    fileType: item.fileType ?? item.file_type ?? '',
    createdAt: item.createdAt ?? item.created_at ?? '',
    originalName: item.originalName ?? item.original_name,
    fileSize: item.fileSize ?? item.file_size,
    attachmentType: item.attachmentType ?? item.attachment_type,
  };
}

// Хелперы
export function getStatusId(request: Request): number {
  return request.statusId ?? request.status_id ?? 0;
}

export function getRequestTypeId(request: Request): number {
  return request.requestTypeId ?? request.request_type_id ?? 0;
}

export function getClientId(request: Request): number {
  return request.clientId ?? request.client_id ?? 0;
}

export function getEmployeeId(request: Request): number | null {
  const id = request.employeeId ?? request.employee_id;
  return id ?? null;
}

export function getCreatedAt(request: Request): string {
  return request.createdAt ?? request.created_at ?? '';
}

export function getPrice(request: Request): number {
  return request.price ?? request.Price ?? 0;
}

export function getIsPriceConfirmed(request: Request): boolean {
  return request.isPriceConfirmed ?? request.is_price_confirmed ?? request.IsPriceConfirmed ?? false;
}

export function getIsPaid(request: Request): boolean {
  return request.isPaid ?? request.is_paid ?? request.IsPaid ?? false;
}

export function formatRequestDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function formatDateTime(dateStr: string): string {
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

export function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function formatPrice(price: number): string {
  if (!price || price === 0) return 'Уточняется';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
  }).format(price);
}

export function getUserInitialsFromName(firstName: string, lastName: string): string {
  const f = firstName?.[0]?.toUpperCase() ?? '';
  const l = lastName?.[0]?.toUpperCase() ?? '';
  return f + l || '?';
}

export function getUserDisplayFromName(firstName: string, lastName: string): string {
  const l = lastName?.[0] ? `${lastName[0]}.` : '';
  return `${firstName} ${l}`.trim() || 'Пользователь';
}
