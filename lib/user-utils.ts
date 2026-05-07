import type { User } from './auth-api';

export function isValidUser(user: User | null | undefined): user is User {
  if (!user) return false;
  if (typeof user !== 'object') return false;
  if (!user.id) return false;
  if (!user.email) return false;
  return true;
}

export function getUserDisplayName(user: User | null | undefined): string {
  if (!user) return 'Гость';
  const firstName = user.firstName ?? user.first_name ?? '';
  const lastName = user.lastName ?? user.last_name ?? '';
  const name = `${firstName} ${lastName}`.trim();
  return name || user.email || 'Гость';
}

export function getUserFullName(user: User | null | undefined): string {
  if (!user) return 'Гость';
  const lastName = user.lastName ?? user.last_name ?? '';
  const firstName = user.firstName ?? user.first_name ?? '';
  const middleName = user.middleName ?? user.middle_name ?? '';
  const name = [lastName, firstName, middleName].filter(Boolean).join(' ').trim();
  return name || user.email || 'Гость';
}

export function getUserInitials(user: User | null | undefined): string {
  if (!user) return '?';
  
  const firstName = user.firstName ?? user.first_name ?? '';
  const lastName = user.lastName ?? user.last_name ?? '';
  
  const first = firstName[0]?.toUpperCase() ?? '';
  const last = lastName[0]?.toUpperCase() ?? '';
  
  if (first || last) {
    return (first + last) || first || last;
  }
  
  const emailChar = user.email?.[0]?.toUpperCase() ?? '';
  return emailChar || '?';
}

export function getUserRoleId(user: User | null | undefined): number {
  if (!user) return 0;
  return user.roleId ?? user.role_id ?? 0;
}