import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

async function getItemWeb(key: string): Promise<string | null> {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(key);
}

async function setItemWeb(key: string, value: string): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key, value);
}

async function removeItemWeb(key: string): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(key);
}

export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return getItemWeb(key);
    return AsyncStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') return setItemWeb(key, value);
    return AsyncStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') return removeItemWeb(key);
    return AsyncStorage.removeItem(key);
  },
};