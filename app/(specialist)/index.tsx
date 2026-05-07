import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import {
  formatRequestDate,
  getCreatedAt,
  getRequestTypeId,
  getStatusId,
  requestsApi,
  SERVICE_TYPE_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  type Request,
} from '@/lib/requests-api';
import { getUserDisplayName } from '@/lib/user-utils';

const isWeb = Platform.OS === 'web';

function getUpdatedAt(request: Request): string {
  return request.updatedAt ?? request.updated_at ?? '';
}

function calculateAvgTime(requests: Request[]): string {
  // Учитываем заявки со статусом "Готова" (5) и "Закрыта" (6)
  const completed = requests.filter((r) => {
    const s = getStatusId(r);
    return s === 5 || s === 6;
  });
  if (completed.length === 0) return '—';
  let totalHours = 0;
  let count = 0;
  for (const r of completed) {
    const created = getCreatedAt(r);
    const updated = getUpdatedAt(r);
    if (!created || !updated) continue;
    const createdMs = new Date(created).getTime();
    const updatedMs = new Date(updated).getTime();
    if (Number.isNaN(createdMs) || Number.isNaN(updatedMs) || updatedMs <= createdMs) continue;
    totalHours += (updatedMs - createdMs) / (1000 * 60 * 60);
    count++;
  }
  if (count === 0) return '—';
  const avg = totalHours / count;
  return `${avg.toFixed(1)}ч`;
}

type StatCardProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  label: string;
  description?: string;
  value?: number | string;
  onPress?: () => void;
};

function StatCard({ icon, iconColor, label, description, value, onPress }: StatCardProps) {
  const [hovered, setHovered] = useState(false);
  const mouseProps = isWeb
    ? { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) }
    : {};

  return (
    <View style={[styles.statCard, hovered && styles.statCardHover]} {...mouseProps}>
      <TouchableOpacity style={styles.statCardInner} onPress={onPress} activeOpacity={0.7}>
        <MaterialCommunityIcons name={icon} size={32} color={iconColor} />
        {value !== undefined && value !== '' && (
          <Text style={styles.statValue}>{value}</Text>
        )}
        <Text style={styles.statLabel}>{label}</Text>
        {description && <Text style={styles.statDescription}>{description}</Text>}
      </TouchableOpacity>
    </View>
  );
}

type RequestItemProps = {
  request: Request;
  onPress?: () => void;
};

function RequestItem({ request, onPress }: RequestItemProps) {
  const { width } = useWindowDimensions();
  const isPhone = width < 768;
  const [hovered, setHovered] = useState(false);
  const mouseProps = isWeb
    ? { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) }
    : {};

  const statusId = getStatusId(request);
  const serviceTypeId = getRequestTypeId(request);
  const statusColor = STATUS_COLORS[statusId] || '#6B7280';
  const statusLabel = STATUS_LABELS[statusId] || 'Неизвестно';
  const serviceLabel = SERVICE_TYPE_LABELS[serviceTypeId] || 'Услуга';
  const createdAt = formatRequestDate(getCreatedAt(request));

  return (
    <View style={[styles.requestItem, hovered && styles.requestItemHover]} {...mouseProps}>
      <TouchableOpacity style={styles.requestItemInner} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.requestIconWrap}>
          <MaterialCommunityIcons name="file-document-outline" size={24} color={Colors.light.button} />
        </View>
        <View style={styles.requestInfo}>
          <View style={styles.requestMetaSingleRow}>
            <Text style={styles.requestTitleInline} numberOfLines={1}>{request.title}</Text>
            <Text style={styles.requestId} numberOfLines={1}>№{request.id}</Text>
            <Text style={styles.requestType} numberOfLines={2}>{serviceLabel}</Text>
            <Text style={[styles.requestDate, isPhone && styles.requestDatePhone]} numberOfLines={2}>{createdAt}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={Colors.light.link} />
      </TouchableOpacity>
    </View>
  );
}

function EmptyRequests() {
  return (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="file-document-outline" size={48} color={Colors.light.link} />
      <Text style={styles.emptyText}>Заявок не найдено</Text>
    </View>
  );
}

export default function SpecialistDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const name = user ? getUserDisplayName(user) : '';

  const [fullRequests, setFullRequests] = useState<Request[]>([]);
  const [recentRequests, setRecentRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const handleAllRequests = () => {
    router.push('/(specialist)/requests' as '/');
  };

  const loadDataWithStats = useCallback(async () => {
    try {
      const requests = await requestsApi.getRequests().catch(() => []);
      setFullRequests(requests);
      const sorted = [...requests].sort((a, b) => {
        const dateA = new Date(getCreatedAt(a)).getTime();
        const dateB = new Date(getCreatedAt(b)).getTime();
        return dateB - dateA;
      });
      setRecentRequests(sorted.slice(0, 5));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDataWithStats();
  }, [loadDataWithStats]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadDataWithStats();
    }, 1500);
    return () => clearInterval(intervalId);
  }, [loadDataWithStats]);

  const onRefreshHandler = () => {
    setRefreshing(true);
    loadDataWithStats();
  };

  const assignedTotal = fullRequests.filter((r) => getStatusId(r) !== 5 && getStatusId(r) !== 6).length;
  const completedCount = fullRequests.filter((r) => getStatusId(r) === 5 || getStatusId(r) === 6).length;
  const avgTime = calculateAvgTime(fullRequests);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefreshHandler} colors={[Colors.light.button]} />
      }
    >
      <Text style={styles.greeting}>
        <Text style={styles.greetingBold}>Добро пожаловать</Text>, {name}!
      </Text>

      {/* Статистические карточки */}
      <View style={styles.statsRow}>
        <StatCard
          icon="clipboard-check-outline"
          iconColor="#3B82F6"
          label="Назначено"
          value={assignedTotal}
        />
        <StatCard
          icon="check-circle-outline"
          iconColor={Colors.light.button}
          label="Выполнено"
          value={completedCount}
        />
        <StatCard
          icon="clock-outline"
          iconColor="#F59E0B"
          label="Среднее время"
          value={avgTime}
        />
      </View>

      {/* Последние назначенные заявки */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Последние назначенные заявки</Text>
          <TouchableOpacity style={styles.allRequestsButton} onPress={handleAllRequests}>
            <Text style={styles.allRequestsButtonText}>Все заявки</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.requestsList}>
          {loading ? (
            <Text style={styles.loadingText}>Загрузка...</Text>
          ) : recentRequests.length === 0 ? (
            <EmptyRequests />
          ) : (
            recentRequests.map((request) => (
              <RequestItem
                key={request.id}
                request={request}
                onPress={() => router.push(`/(specialist)/request/${request.id}` as '/')}
              />
            ))
          )}
        </View>
      </View>

      {/* Блок помощи */}
      <View style={styles.helpBlock}>
        <MaterialCommunityIcons name="help-circle-outline" size={32} color={Colors.light.button} />
        <Text style={styles.helpText}>
          <Text style={styles.helpTitle}>Нужна помощь?</Text>
          {'  '}Телефон: +7 (800) 555-35-35 | Почта: support@sorafix.ru
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  greeting: {
    fontSize: 18,
    color: Colors.light.text,
    marginBottom: 24,
  },
  greetingBold: {
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  statCardHover: {
    borderColor: Colors.light.button,
  },
  statCardInner: {
    alignItems: 'center',
    padding: 20,
    gap: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.light.text,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  statDescription: {
    fontSize: 12,
    color: Colors.light.link,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  allRequestsButton: {
    backgroundColor: Colors.light.button,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  allRequestsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.buttonText,
  },
  requestsList: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  requestItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  requestItemHover: {
    backgroundColor: '#F9FAFB',
  },
  requestItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  requestIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(5, 148, 103, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestInfo: {
    flex: 1,
    minWidth: 0,
  },
  requestTitleInline: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.light.text,
    flexShrink: 1,
    minWidth: 0,
  },
  requestMetaSingleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    minWidth: 0,
  },
  requestId: {
    fontSize: 13,
    color: Colors.light.link,
  },
  requestDot: {
    fontSize: 13,
    color: Colors.light.link,
  },
  requestType: {
    fontSize: 13,
    color: Colors.light.link,
    flexShrink: 1,
    minWidth: 0,
  },
  requestDate: {
    fontSize: 13,
    color: Colors.light.link,
    marginLeft: 'auto',
    flexShrink: 0,
  },
  requestDatePhone: {
    fontSize: 13,
    color: Colors.light.link,
    flexShrink: 0,
    marginRight: '100%',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.light.link,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.light.link,
    textAlign: 'center',
    padding: 40,
  },
  helpBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    gap: 16,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  helpText: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.link,
  },
});
