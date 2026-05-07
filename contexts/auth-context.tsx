import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { authApi, type User } from '@/lib/auth-api';
import { AUTH_TOKEN_KEY, USER_DATA_KEY } from '@/lib/config';
import { storage } from '@/lib/storage';

const ADMIN_ROLE_ID = 1;
const CLIENT_ROLE_ID = 4;
const MANAGER_ROLE_ID = 2;
const SPECIALIST_ROLE_ID = 3;

type AuthState = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

type RegisterData = {
  lastName: string;
  firstName: string;
  middleName?: string | null;
  email: string;
  phone: string;
  password: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Хелпер для сохранения пользователя в storage
async function saveUserToStorage(user: User | null): Promise<void> {
  if (user) {
    await storage.setItem(USER_DATA_KEY, JSON.stringify(user));
  } else {
    await storage.removeItem(USER_DATA_KEY);
  }
}

// Хелпер для загрузки пользователя из storage
async function loadUserFromStorage(): Promise<User | null> {
  try {
    const data = await storage.getItem(USER_DATA_KEY);
    if (data) {
      const user = JSON.parse(data) as User;
      // Проверяем что данные валидные
      if (user && user.id && user.email) {
        return user;
      }
    }
  } catch {
    // Ошибка парсинга - игнорируем
  }
  return null;
}

// Проверка валидности данных пользователя
function isUserDataValid(user: User | null | undefined): boolean {
  return !!(user && user.id && user.email);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Обновляем пользователя и сохраняем в storage
  const updateUser = useCallback(async (newUser: User | null) => {
    setUser(newUser);
    await saveUserToStorage(newUser);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = await storage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      await updateUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const profile = await authApi.validate();
      await updateUser(profile);
    } catch {
      await updateUser(null);
      await storage.removeItem(AUTH_TOKEN_KEY);
    } finally {
      setIsLoading(false);
    }
  }, [updateUser]);

  // Инициализация: сначала загружаем из storage, потом валидируем через API
  useEffect(() => {
    const init = async () => {
      // Сначала пробуем загрузить из storage для быстрого отображения
      const cachedUser = await loadUserFromStorage();
      const token = await storage.getItem(AUTH_TOKEN_KEY);

      if (cachedUser && token) {
        // Есть кешированные данные - показываем сразу
        setUser(cachedUser);
        setIsLoading(false);

        // В фоне проверяем актуальность через API
        try {
          const profile = await authApi.validate();
          // Обновляем только если API вернул валидные данные
          if (isUserDataValid(profile)) {
            await updateUser(profile);
          }
          // Если API вернул невалидные данные - оставляем кешированные
        } catch {
          // Токен невалидный - очищаем
          await updateUser(null);
          await storage.removeItem(AUTH_TOKEN_KEY);
        }
      } else if (token) {
        // Есть токен, но нет кеша - загружаем из API
        await refreshUser();
      } else {
        // Нет токена - пользователь не авторизован
        setIsLoading(false);
      }
    };

    init();
  }, [refreshUser, updateUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login({ email, password });
      const profile = res.user || (await authApi.validate().catch(() => null));
      if (profile) {
        await updateUser(profile);
      } else {
        await refreshUser();
      }
      const roleId = profile?.roleId ?? (profile as { role_id?: number })?.role_id;
      if (roleId === ADMIN_ROLE_ID) router.replace('/(admin)' as '/');
      else if (roleId === CLIENT_ROLE_ID) router.replace('/(client)' as '/');
      else if (roleId === MANAGER_ROLE_ID) router.replace('/(manager)' as '/');
      else if (roleId === SPECIALIST_ROLE_ID) router.replace('/(specialist)' as '/');
    },
    [refreshUser, updateUser]
  );

  const register = useCallback(
    async (data: RegisterData) => {
      const res = await authApi.register(data);
      const profile = res.user || (await authApi.validate().catch(() => null));
      if (profile) {
        await updateUser(profile);
      } else if (res.token) {
        await refreshUser();
      }
      const roleId = profile?.roleId ?? (profile as { role_id?: number })?.role_id;
      if (roleId === ADMIN_ROLE_ID) router.replace('/(admin)' as '/');
      else if (roleId === CLIENT_ROLE_ID) router.replace('/(client)' as '/');
      else if (roleId === MANAGER_ROLE_ID) router.replace('/(manager)' as '/');
      else if (roleId === SPECIALIST_ROLE_ID) router.replace('/(specialist)' as '/');
    },
    [refreshUser, updateUser]
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    await updateUser(null);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = '/';
    } else {
      router.dismissTo('/' as '/');
    }
  }, [updateUser]);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { ADMIN_ROLE_ID, CLIENT_ROLE_ID, MANAGER_ROLE_ID, SPECIALIST_ROLE_ID };

