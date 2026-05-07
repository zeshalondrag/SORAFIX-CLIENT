import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { telegramApi } from '@/lib/telegram-api';

const isWeb = Platform.OS === 'web';

export default function ClientTelegramPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string>('');
  const [opening, setOpening] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);

  const tgChatId =
    user?.tgChatId ??
    (user as { tg_chat_id?: number | null } | null)?.tg_chat_id ??
    null;
  const isConnected = !!tgChatId;
  const qrUrl = link
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(link)}`
    : '';

  const openLink = useCallback(async (url: string) => {
    if (!url) return;
    setOpening(true);
    try {
      if (isWeb && typeof window !== 'undefined') {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        await Linking.openURL(url);
      }
    } finally {
      setOpening(false);
    }
  }, []);

  const requestLink = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await telegramApi.getConnectLink();
      const url = data.link ?? data.url ?? '';
      if (!url) throw new Error('Ссылка не получена');
      setLink(url);
      await openLink(url);
    } catch (e) {
      setError((e as { message?: string })?.message ?? 'Ошибка получения ссылки на Telegram бота');
    } finally {
      setLoading(false);
    }
  }, [openLink]);

  useEffect(() => {
    requestLink();
  }, [requestLink]);

  const handleRefreshStatus = useCallback(async () => {
    setRefreshingStatus(true);
    try {
      await refreshUser();
    } finally {
      setRefreshingStatus(false);
    }
  }, [refreshUser]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable style={styles.backLink} onPress={() => router.back()}>
        <MaterialIcons name="arrow-back" size={20} color="#1F2937" />
        <Text style={styles.backLinkText}>Вернуться назад</Text>
      </Pressable>

      <View style={styles.heroCard}>
        <View style={styles.header}>
          <View style={styles.telegramIconWrap}>
            <FontAwesome name="telegram" size={24} color="#229ED9" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Telegram Бот</Text>
            <Text style={styles.description}>
              Подключите бота, чтобы получать уведомления по заявкам в Telegram в реальном времени.
            </Text>
          </View>
        </View>

        <View style={[styles.statusPill, isConnected ? styles.statusPillOk : styles.statusPillPending]}>
          <Text style={[styles.statusPillText, isConnected && styles.statusPillTextOk]}>
            Статус: {isConnected ? 'Подключено ✅' : 'Не подключено'}
          </Text>
        </View>

        {!isConnected && (
          <TouchableOpacity
            style={[styles.ctaButton, opening && styles.buttonDisabled]}
            onPress={() => openLink(link)}
            disabled={!link || opening}
          >
            <FontAwesome name="telegram" size={18} color={Colors.light.buttonText} />
            <Text style={styles.buttonText}>{opening ? 'Открытие...' : 'Перейти в бота'}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>Что даёт бот</Text>
          <Text style={styles.featureItem}>• уведомления о новых сообщениях в чате заявки</Text>
          <Text style={styles.featureItem}>• оповещения о смене статуса и назначении стоимости</Text>
          <Text style={styles.featureItem}>• быстрый переход в нужную заявку из веб-кабинета</Text>
        </View>

        {!isConnected && (
          <View style={styles.stepsCard}>
            <Text style={styles.stepsTitle}>Как подключить</Text>
            <Text style={styles.stepItem}>1. Нажмите кнопку «Перейти в бота».</Text>
            <Text style={styles.stepItem}>2. В Telegram нажмите Start.</Text>
            <Text style={styles.stepItem}>3. Вернитесь сюда и обновите статус.</Text>
          </View>
        )}

        {isWeb && !isConnected && !!qrUrl && (
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>Подключение через QR</Text>
            <Text style={styles.qrHint}>Отсканируйте код камерой телефона, чтобы сразу открыть бота.</Text>
            <View style={styles.qrWrap}>
              <Image source={{ uri: qrUrl }} style={styles.qrImage} contentFit="cover" />
            </View>
          </View>
        )}

        {loading ? (
          <Text style={styles.stateText}>Готовим ссылку...</Text>
        ) : error ? (
          <View style={styles.statusCardError}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.button} onPress={requestLink}>
              <Text style={styles.buttonText}>Повторить</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.statusCard}>
            {isConnected ? (
              <>
                <Text style={styles.stateText}>Telegram успешно подключен. Уведомления уже активны.</Text>
                <TouchableOpacity style={[styles.button, styles.buttonGhost]} disabled>
                  <MaterialCommunityIcons name="link-off" size={18} color={Colors.light.link} />
                  <Text style={styles.buttonGhostText}>Отключить уведомления (скоро)</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary, refreshingStatus && styles.buttonDisabled]}
                onPress={handleRefreshStatus}
                disabled={refreshingStatus}
              >
                <MaterialIcons name="refresh" size={18} color={Colors.light.button} />
                <Text style={styles.buttonSecondaryText}>
                  {refreshingStatus ? 'Обновление...' : 'Проверить статус подключения'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.securityCard}>
          <MaterialIcons name="verified-user" size={18} color="#166534" />
          <Text style={styles.securityText}>
            Бот не получает доступ к вашему паролю и личным данным. Он только отправляет уведомления по вашим заявкам.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  backLinkText: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
  },
  heroCard: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    padding: 22,
    gap: 14,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  telegramIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(34, 158, 217, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
    color: Colors.light.link,
    lineHeight: 20,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPillPending: {
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
  },
  statusPillOk: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B45309',
  },
  statusPillTextOk: {
    color: '#166534',
  },
  ctaButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#229ED9',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#229ED9',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  featuresCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 2,
  },
  featureItem: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },
  stepsCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  stepsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 2,
  },
  stepItem: {
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
  },
  qrCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  qrTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  qrHint: {
    fontSize: 13,
    color: Colors.light.link,
  },
  qrWrap: {
    alignItems: 'center',
    paddingTop: 4,
  },
  qrImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  statusCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  statusCardError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  stateText: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#B91C1C',
    lineHeight: 20,
  },
  button: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.light.button,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonSecondary: {
    backgroundColor: 'rgba(5, 148, 103, 0.1)',
  },
  buttonSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.button,
  },
  buttonGhost: {
    backgroundColor: '#F3F4F6',
  },
  buttonGhostText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.link,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.buttonText,
  },
  securityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 12,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#166534',
  },
});
