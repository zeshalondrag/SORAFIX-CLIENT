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
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';

import { Colors } from '@/constants/theme';
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

const isWeb = Platform.OS === 'web';

const STATUS_FILTER_OPTIONS = [
  { id: 0, label: 'Все статусы' },
  { id: 1, label: 'Новая' },
  { id: 2, label: 'Ожидание' },
  { id: 3, label: 'В работе' },
  { id: 4, label: 'Проверка' },
  { id: 5, label: 'Готова' },
  { id: 6, label: 'Закрыта' },
  { id: 7, label: 'Отменена' },
];

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
            <Text style={styles.requestTitleInline} numberOfLines={1}>
              {request.title}
            </Text>
            <Text style={styles.requestId} numberOfLines={1}>
              №{request.id}
            </Text>
            <Text style={styles.requestType} numberOfLines={2}>
              {serviceLabel}
            </Text>
            <Text
              style={[styles.requestDate, isPhone && styles.requestDatePhone]}
              numberOfLines={2}
            >
              {createdAt}
            </Text>
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
      <MaterialCommunityIcons name="file-document-outline" size={64} color={Colors.light.link} />
      <Text style={styles.emptyText}>Заявок не найдено</Text>
    </View>
  );
}

export default function RequestsPage() {
  const { width } = useWindowDimensions();
  const isPhone = width < 768;
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [statusFilter, setStatusFilter] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      const data = await requestsApi.getRequests();
      setRequests(data);
    } catch (e) {
      console.error(e);
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadRequests();
    }, 1500);
    return () => clearInterval(intervalId);
  }, [loadRequests]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const handleSelectStatus = (id: number) => {
    setStatusFilter(id);
    setDropdownOpen(false);
  };

  const selectedStatusLabel = STATUS_FILTER_OPTIONS.find((o) => o.id === statusFilter)?.label || 'Все статусы';

  // Фильтрация на клиенте
  const filteredRequests = requests.filter((r) => {
    const matchesStatus = statusFilter === 0 || getStatusId(r) === statusFilter;
    const matchesSearch = !search.trim() || r.title.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <View style={styles.container}>
      {/* Фильтры */}
      <View style={[styles.filtersRow, isPhone && styles.filtersRowPhone]}>
        <View
          style={[
            styles.searchWrapper,
            isPhone && styles.searchWrapperPhone,
            { borderColor: searchFocused ? Colors.light.button : '#E5E7EB' },
          ]}
        >
          <MaterialIcons name="search" size={22} color={Colors.light.link} />
          <TextInput
            style={[
              styles.searchInput,
              isWeb && ({ outlineStyle: 'none' } as Record<string, unknown>),
            ]}
            placeholder="Поиск по названию..."
            placeholderTextColor={Colors.light.placeholder}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </View>

        <View style={[styles.dropdownContainer, isPhone && styles.dropdownContainerPhone]}>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setDropdownOpen(!dropdownOpen)}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownText}>{selectedStatusLabel}</Text>
            <MaterialIcons
              name={dropdownOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={24}
              color={Colors.light.link}
            />
          </TouchableOpacity>
          {dropdownOpen && (
            <View style={styles.dropdownMenu}>
              {STATUS_FILTER_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.dropdownItem,
                    statusFilter === option.id && styles.dropdownItemActive,
                  ]}
                  onPress={() => handleSelectStatus(option.id)}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      statusFilter === option.id && styles.dropdownItemTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Список заявок */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={[styles.listContent, isPhone && styles.listContentPhone]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.light.button]} />
        }
      >
        <View style={[styles.requestsList, isPhone && styles.requestsListPhone]}>
          {loading ? (
            <Text style={styles.loadingText}>Загрузка...</Text>
          ) : filteredRequests.length === 0 ? (
            <EmptyRequests />
          ) : (
            filteredRequests.map((request) => (
              <RequestItem
                key={request.id}
                request={request}
                onPress={() => router.push(`/(client)/request/${request.id}`)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    zIndex: 100,
  },
  filtersRowPhone: {
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 14,
    minHeight: 48,
    gap: 10,
  },
  searchWrapperPhone: {
    flexBasis: '100%',
    minWidth: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
    paddingVertical: 12,
  },
  dropdownContainer: {
    position: 'relative',
    minWidth: 160,
    zIndex: 100,
  },
  dropdownContainerPhone: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    alignSelf: 'stretch',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  dropdownText: {
    fontSize: 15,
    color: Colors.light.text,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
    zIndex: 1000,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(5, 148, 103, 0.1)',
  },
  dropdownItemText: {
    fontSize: 15,
    color: Colors.light.text,
  },
  dropdownItemTextActive: {
    color: Colors.light.button,
    fontWeight: '500',
  },
  listContainer: {
    flex: 1,
    zIndex: 1,
  },
  listContent: {
    paddingBottom: 32,
  },
  listContentPhone: {
    paddingBottom: 20,
  },
  requestsList: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  requestsListPhone: {
    borderRadius: 12,
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
    paddingHorizontal: 14,
    paddingVertical: 14,
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
  requestType: {
    fontSize: 13,
    color: Colors.light.link,
    flexShrink: 1,
    minWidth: 0,
  },
  requestDate: {
    fontSize: 13,
    color: Colors.light.link,
    flexShrink: 0,
    marginLeft: 'auto',
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
    padding: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.link,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.light.link,
    textAlign: 'center',
    padding: 40,
  },
});
