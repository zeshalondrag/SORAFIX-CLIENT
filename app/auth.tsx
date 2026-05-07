import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthForm } from '@/components/auth/auth-form';
import { Colors } from '@/constants/theme';
import { ADMIN_ROLE_ID, CLIENT_ROLE_ID, MANAGER_ROLE_ID, SPECIALIST_ROLE_ID, useAuth } from '@/contexts/auth-context';
import { getUserRoleId } from '@/lib/user-utils';

const SLIDER_ITEMS = [
  {
    title: 'Централизованное управление заявками',
    text: 'Единый интерфейс для регистрации обращений, распределения задач и мониторинга выполнения.',
  },
  {
    title: 'Вся сервисная коммуникация в одном месте',
    text: 'Комментарии, вложения и документы синхронизированы внутри заявки для прозрачной совместной работы.',
  },
  {
    title: 'Прозрачный сервисный процесс',
    text: 'Контролируйте каждый этап — от первого обращения до успешного закрытия заявки.',
  },
];

export default function AuthScreen() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isPhone = width < 900;
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    if (!isLoading && user) {
      const roleId = getUserRoleId(user);
      if (roleId === ADMIN_ROLE_ID) router.replace('/(admin)' as '/');
      else if (roleId === CLIENT_ROLE_ID) router.replace('/(client)' as '/');
      else if (roleId === MANAGER_ROLE_ID) router.replace('/(manager)' as '/');
      else if (roleId === SPECIALIST_ROLE_ID) router.replace('/(specialist)' as '/');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (isPhone) return;
    const id = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % SLIDER_ITEMS.length);
    }, 3800);
    return () => clearInterval(id);
  }, [isPhone]);

  if (isLoading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.light.button} />
      </View>
    );
  }

  if (isPhone) {
    return (
      <View
        style={[
          styles.root,
          styles.phoneRoot,
          { paddingTop: Math.max(insets.top, 8), paddingBottom: Math.max(insets.bottom, 8) },
        ]}
      >
        <View style={styles.phoneFormWrapper}>
          <AuthForm />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={styles.bgCircleA} />
      <View pointerEvents="none" style={styles.bgCircleB} />
      <View pointerEvents="none" style={styles.bgCircleC} />
      <View pointerEvents="none" style={styles.bgGrid} />

      <View
        style={[
          styles.page,
          isPhone && styles.pagePhone,
          { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        {!isPhone && (
          <View style={styles.leftPanel}>
            <View style={styles.leftTopRow}>
              <Text style={styles.serviceName}>SORAFIX</Text>
              <TouchableOpacity
                style={styles.backLink}
                onPress={() => router.replace('/' as '/')}
                accessibilityRole="button"
                accessibilityLabel="Назад на главную"
              >
                <MaterialIcons name="arrow-back" size={18} color="#111827" />
                <Text style={styles.backLinkText}>Назад на главную</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.leftBottomText}>
            <Text style={styles.leftTitle}>Единая экосистема сервисного обслуживания</Text>
              <View style={styles.sliderCard}>
                <Text style={styles.sliderTitle}>
                  <Text style={styles.leftAccent}>{SLIDER_ITEMS[slideIndex].title}</Text>
                </Text>
                <Text style={styles.leftSubtitle}>{SLIDER_ITEMS[slideIndex].text}</Text>
                <View style={styles.sliderDots}>
                  {SLIDER_ITEMS.map((_, index) => (
                    <View
                      key={index}
                      style={[styles.sliderDot, index === slideIndex && styles.sliderDotActive]}
                    />
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={[styles.formCard, isPhone && styles.formCardPhone]}>
          {isPhone && (
            <TouchableOpacity
              style={styles.backLinkPhone}
              onPress={() => router.replace('/' as '/')}
              accessibilityRole="button"
              accessibilityLabel="Назад на главную"
            >
              <MaterialIcons name="arrow-back" size={18} color="#334155" />
              <Text style={styles.backLinkPhoneText}>Назад на главную</Text>
            </TouchableOpacity>
          )}
          <View style={styles.formWrapper}>
            <AuthForm />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  page: {
    flex: 1,
    flexDirection: 'row',
    gap: 32,
    alignItems: 'stretch',
    paddingLeft: 100,
    paddingRight: 20,
    zIndex: 2,
  },
  pagePhone: {
    paddingHorizontal: 12,
  },
  phoneRoot: {
    backgroundColor: Colors.light.background,
    paddingHorizontal: 10,
  },
  phoneFormWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'center',
  },
  leftPanel: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 28,
    paddingVertical: 24,
    justifyContent: 'space-between',
    minHeight: 560,
  },
  leftTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  serviceName: {
    color: '#059467',
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingRight: 50,
  },
  backLinkText: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '600',
  },
  leftBottomText: {
    gap: 10,
    maxWidth: '100%',
  },
  leftTitle: {
    color: '#111827',
    fontSize: 55,
    lineHeight: 35,
    fontWeight: '700',
  },
  sliderCard: {
    marginTop: 8,
    paddingVertical: 12,
    gap: 10,
  },
  sliderTitle: {
    fontSize: 35,
    lineHeight: 45,
    fontWeight: '700',
    color: '#111827',
  },
  leftSubtitle: {
    color: '#111827',
    fontSize: 24,
    lineHeight: 35,
    maxWidth: '60%',
  },
  sliderDots: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sliderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C7D2FE',
  },
  sliderDotActive: {
    width: 22,
    backgroundColor: '#059467',
  },
  leftAccent: {
    color: '#059467',
    fontWeight: '800',
  },
  formCard: {
    width: '40%',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
    padding: 24,
    justifyContent: 'center',
  },
  formCardPhone: {
    maxWidth: '100%',
    borderRadius: 16,
    padding: 16,
    flex: 1,
  },
  formWrapper: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  backLinkPhone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  backLinkPhoneText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgCircleA: {
    position: 'absolute',
    top: -120,
    right: -120,
    width: 520,
    height: 520,
    borderRadius: 260,
    backgroundColor: 'rgba(16,185,129,0.12)',
    zIndex: 0,
  },
  bgCircleB: {
    position: 'absolute',
    top: 580,
    left: -180,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(5,148,103,0.09)',
    zIndex: 0,
  },
  bgCircleC: {
    position: 'absolute',
    bottom: 160,
    right: -140,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(16,185,129,0.10)',
    zIndex: 0,
  },
  bgGrid: {
    ...Platform.select({
      web: {
        position: 'absolute',
        inset: 0,
        backgroundSize: '36px 36px',
        backgroundImage:
          'linear-gradient(to right, rgba(15,23,42,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.03) 1px, transparent 1px)',
      },
      default: {},
    }),
  },
});