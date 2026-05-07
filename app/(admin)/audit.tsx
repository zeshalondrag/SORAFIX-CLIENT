import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { Colors } from '@/constants/theme';
import {
    type AdminUser,
    adminUsersApi,
    auditApi,
    type AuditLog,
    formatAuditDate,
    getAuditCreatedAt,
    getAuditNewData,
    getAuditOldData,
    getAuditRecordId,
    getAuditTableName,
    getAuditUserId,
    getUserFirstName,
    getUserLastName,
    OPERATION_COLORS,
    OPERATION_LABELS,
    TABLE_LABELS,
} from '@/lib/admin-api';

const isWeb = Platform.OS === 'web';
const PAGE_SIZE = 15;
type AuditSortKey = 'date_desc' | 'date_asc' | 'id_desc' | 'id_asc';
type AuditSelectKey = 'table' | 'operation' | 'sort' | null;

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [tableFilter, setTableFilter] = useState<'all' | string>('all');
  const [operationFilter, setOperationFilter] = useState<'all' | string>('all');
  const [sortBy, setSortBy] = useState<AuditSortKey>('date_desc');
  const [openSelect, setOpenSelect] = useState<AuditSelectKey>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [logsData, usersData] = await Promise.all([
        auditApi.getLogs(),
        adminUsersApi.getUsers(),
      ]);
      setLogs(logsData);
      setUsers(usersData);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Получить имя пользователя по ID
  const getUserName = (userId: number | null): string => {
    if (userId === null || userId === undefined || userId === 0) return 'Система';
    const user = users.find((u) => u.id === userId);
    if (!user) return `Пользователь #${userId}`;
    return `${getUserLastName(user)} ${getUserFirstName(user)}`;
  };

  const filteredLogs = logs.filter((log) => {
    const tableName = getAuditTableName(log);
    if (tableFilter !== 'all' && tableName !== tableFilter) return false;
    if (operationFilter !== 'all' && log.operation !== operationFilter) return false;

    if (!search) return true;
    const s = search.toLowerCase();
    const tableLabel = TABLE_LABELS[tableName] ?? tableName;
    const opLabel = OPERATION_LABELS[log.operation] ?? log.operation;
    const userName = getUserName(getAuditUserId(log));
    const ip = (log.userIp ?? log.user_ip ?? '').toLowerCase();
    return (
      tableLabel.toLowerCase().includes(s) ||
      opLabel.toLowerCase().includes(s) ||
      String(log.id).includes(s) ||
      getAuditRecordId(log).includes(s) ||
      userName.toLowerCase().includes(s) ||
      ip.includes(s)
    );
  });

  const sortedLogs = [...filteredLogs].sort((a, b) => {
    if (sortBy === 'date_desc') return new Date(getAuditCreatedAt(b)).getTime() - new Date(getAuditCreatedAt(a)).getTime();
    if (sortBy === 'date_asc') return new Date(getAuditCreatedAt(a)).getTime() - new Date(getAuditCreatedAt(b)).getTime();
    if (sortBy === 'id_desc') return b.id - a.id;
    return a.id - b.id;
  });

  const totalPages = Math.ceil(sortedLogs.length / PAGE_SIZE);
  const pagedLogs = sortedLogs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const tableOptions = Array.from(new Set(logs.map((l) => getAuditTableName(l)).filter(Boolean)));
  const sortLabelMap: Record<AuditSortKey, string> = {
    date_desc: 'Дата ↓',
    date_asc: 'Дата ↑',
    id_desc: 'ID ↓',
    id_asc: 'ID ↑',
  };

  const renderJsonBlock = (label: string, jsonStr: string | null) => {
    if (!jsonStr) return (
      <View style={styles.jsonBlock}>
        <Text style={styles.jsonLabel}>{label}</Text>
        <Text style={styles.jsonEmpty}>Нет данных</Text>
      </View>
    );
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return (
        <View style={styles.jsonBlock}>
          <Text style={styles.jsonLabel}>{label}</Text>
          <Text style={styles.jsonRaw}>{jsonStr}</Text>
        </View>
      );
    }
    return (
      <View style={styles.jsonBlock}>
        <Text style={styles.jsonLabel}>{label}</Text>
        <View style={styles.jsonTable}>
          {Object.entries(parsed).map(([key, value]) => (
            <View key={key} style={styles.jsonRow}>
              <Text style={styles.jsonKey}>{key}</Text>
              <Text style={styles.jsonValue}>{String(value ?? '—')}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.light.button} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.controlsRow}>
          <View style={styles.selectWrap}>
            <Text style={styles.selectLabel}>Таблица</Text>
            <TouchableOpacity style={styles.selectInput} onPress={() => setOpenSelect(openSelect === 'table' ? null : 'table')}>
              <Text style={styles.selectInputText}>
                {tableFilter === 'all' ? 'Все' : (TABLE_LABELS[tableFilter] ?? tableFilter)}
              </Text>
              <MaterialCommunityIcons name={openSelect === 'table' ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.light.link} />
            </TouchableOpacity>
            {openSelect === 'table' && (
              <View style={styles.selectMenu}>
                <ScrollView style={{ maxHeight: 220 }}>
                  <TouchableOpacity style={styles.selectOption} onPress={() => { setTableFilter('all'); setPage(0); setOpenSelect(null); }}>
                    <Text style={styles.selectOptionText}>Все</Text>
                  </TouchableOpacity>
                  {tableOptions.map((table) => (
                    <TouchableOpacity key={table} style={styles.selectOption} onPress={() => { setTableFilter(table); setPage(0); setOpenSelect(null); }}>
                      <Text style={styles.selectOptionText}>{TABLE_LABELS[table] ?? table}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
          <View style={styles.selectWrap}>
            <Text style={styles.selectLabel}>Операция</Text>
            <TouchableOpacity style={styles.selectInput} onPress={() => setOpenSelect(openSelect === 'operation' ? null : 'operation')}>
              <Text style={styles.selectInputText}>
                {operationFilter === 'all' ? 'Все' : OPERATION_LABELS[operationFilter] ?? operationFilter}
              </Text>
              <MaterialCommunityIcons name={openSelect === 'operation' ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.light.link} />
            </TouchableOpacity>
            {openSelect === 'operation' && (
              <View style={styles.selectMenu}>
                <TouchableOpacity style={styles.selectOption} onPress={() => { setOperationFilter('all'); setPage(0); setOpenSelect(null); }}>
                  <Text style={styles.selectOptionText}>Все</Text>
                </TouchableOpacity>
                {Object.keys(OPERATION_LABELS).map((op) => (
                  <TouchableOpacity key={op} style={styles.selectOption} onPress={() => { setOperationFilter(op); setPage(0); setOpenSelect(null); }}>
                    <Text style={styles.selectOptionText}>{OPERATION_LABELS[op]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <View style={styles.selectWrap}>
            <Text style={styles.selectLabel}>Сортировка</Text>
            <TouchableOpacity style={styles.selectInput} onPress={() => setOpenSelect(openSelect === 'sort' ? null : 'sort')}>
              <Text style={styles.selectInputText}>{sortLabelMap[sortBy]}</Text>
              <MaterialCommunityIcons name={openSelect === 'sort' ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.light.link} />
            </TouchableOpacity>
            {openSelect === 'sort' && (
              <View style={styles.selectMenu}>
                {(Object.keys(sortLabelMap) as AuditSortKey[]).map((key) => (
                  <TouchableOpacity key={key} style={styles.selectOption} onPress={() => { setSortBy(key); setPage(0); setOpenSelect(null); }}>
                    <Text style={styles.selectOptionText}>{sortLabelMap[key]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
        <View style={styles.searchArea}>
          <Text style={styles.selectLabel}>Поиск</Text>
          <View
            style={[styles.searchWrapper, { borderColor: searchFocused ? Colors.light.button : '#E5E7EB' }]}
          >
            <MaterialCommunityIcons name="magnify" size={20} color={Colors.light.link} />
            <TextInput
              style={styles.searchInput}
              placeholder="Поиск по таблице, операции, пользователю..."
              placeholderTextColor={Colors.light.placeholder}
              value={search}
              onChangeText={(t) => { setSearch(t); setPage(0); }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          <Text style={styles.searchInfoText}>Всего записей: {sortedLogs.length}</Text>
          </View>
        </View>
      </View>

      {/* Таблица */}
      <View style={styles.card}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { flex: 0.4 }]}>ID</Text>
          <Text style={[styles.th, { flex: 1.2 }]}>Таблица</Text>
          <Text style={[styles.th, { flex: 0.9 }]}>Операция</Text>
          <Text style={[styles.th, { flex: 0.5 }]}>Запись</Text>
          <Text style={[styles.th, { flex: 1.1 }]}>IP адрес</Text>
          <Text style={[styles.th, { flex: 1.2 }]}>Пользователь</Text>
          <Text style={[styles.th, { flex: 1.3 }]}>Дата</Text>
          <Text style={[styles.th, { flex: 0.5, textAlign: 'center' }]}>Детали</Text>
        </View>
        <ScrollView style={styles.tableBody}>
          {pagedLogs.length === 0 ? (
            <View style={styles.emptyRow}>
              <MaterialCommunityIcons name="shield-search" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>Нет записей аудита</Text>
              <Text style={styles.emptyHint}>Журнал действий пока пуст</Text>
            </View>
          ) : (
            pagedLogs.map((log, index) => {
              const operation = log.operation ?? '';
              const opColor = OPERATION_COLORS[operation] ?? '#6B7280';
              const opLabel = OPERATION_LABELS[operation] ?? operation;
              const tableName = getAuditTableName(log);
              const tableLabel = TABLE_LABELS[tableName] ?? tableName;
              const userId = getAuditUserId(log);
              const userName = getUserName(userId);
              const isEven = index % 2 === 0;

              return (
                <View key={log.id} style={[styles.tableRow, isEven && styles.tableRowEven]}>
                  <Text style={[styles.td, styles.tdId, { flex: 0.4 }]}>{log.id}</Text>
                  <View style={{ flex: 1.2 }}>
                    <Text style={styles.td}>{tableLabel}</Text>
                    <Text style={styles.tdSub}>{tableName}</Text>
                  </View>
                  <View style={[styles.tdWrap, { flex: 0.9 }]}>
                    <View style={[styles.opBadge, { backgroundColor: opColor + '15', borderColor: opColor + '40' }]}>
                      <View style={[styles.opDot, { backgroundColor: opColor }]} />
                      <Text style={[styles.opText, { color: opColor }]}>{opLabel}</Text>
                    </View>
                  </View>
                  <Text style={[styles.td, { flex: 0.5 }]}>#{getAuditRecordId(log)}</Text>
                  <Text style={[styles.td, { flex: 1.1 }]} numberOfLines={1}>{log.userIp ?? log.user_ip ?? '—'}</Text>
                  <View style={{ flex: 1.2 }}>
                    <Text style={styles.td} numberOfLines={1}>{userName}</Text>
                    {userId != null && <Text style={styles.tdSub}>ID: {userId}</Text>}
                  </View>
                  <Text style={[styles.tdDate, { flex: 1.3 }]}>{formatAuditDate(getAuditCreatedAt(log))}</Text>
                  <View style={[styles.tdWrap, { flex: 0.5, alignItems: 'center' }]}>
                    <TouchableOpacity style={styles.detailBtn} onPress={() => setSelectedLog(log)}>
                      <MaterialCommunityIcons name="eye-outline" size={18} color={Colors.light.button} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Пагинация */}
        {totalPages > 1 && (
          <View style={styles.pagination}>
            <TouchableOpacity
              style={[styles.pageBtn, page === 0 && styles.pageBtnDisabled]}
              onPress={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
            >
              <MaterialCommunityIcons name="chevron-left" size={20} color={page === 0 ? '#D1D5DB' : Colors.light.text} />
            </TouchableOpacity>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i;
              } else if (page < 3) {
                pageNum = i;
              } else if (page > totalPages - 4) {
                pageNum = totalPages - 5 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <TouchableOpacity
                  key={pageNum}
                  style={[styles.pageNumBtn, page === pageNum && styles.pageNumBtnActive]}
                  onPress={() => setPage(pageNum)}
                >
                  <Text style={[styles.pageNumText, page === pageNum && styles.pageNumTextActive]}>
                    {pageNum + 1}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.pageBtn, page >= totalPages - 1 && styles.pageBtnDisabled]}
              onPress={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
            >
              <MaterialCommunityIcons name="chevron-right" size={20} color={page >= totalPages - 1 ? '#D1D5DB' : Colors.light.text} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Модальное окно деталей */}
      <Modal visible={!!selectedLog} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Детали записи аудита</Text>
              <TouchableOpacity onPress={() => setSelectedLog(null)} style={styles.modalClose}>
                <MaterialCommunityIcons name="close" size={22} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
            {selectedLog && (
              <ScrollView style={styles.modalContent}>
                <View style={styles.modalGrid}>
                  <View style={styles.modalGridItem}>
                    <Text style={styles.modalInfoLabel}>ID</Text>
                    <Text style={styles.modalInfoValue}>{selectedLog.id}</Text>
                  </View>
                  <View style={styles.modalGridItem}>
                    <Text style={styles.modalInfoLabel}>Таблица</Text>
                    <Text style={styles.modalInfoValue}>
                      {TABLE_LABELS[getAuditTableName(selectedLog)] ?? getAuditTableName(selectedLog)}
                    </Text>
                  </View>
                  <View style={styles.modalGridItem}>
                    <Text style={styles.modalInfoLabel}>Операция</Text>
                    <Text style={[styles.modalInfoValue, { color: OPERATION_COLORS[selectedLog.operation] ?? '#6B7280' }]}>
                      {OPERATION_LABELS[selectedLog.operation] ?? selectedLog.operation}
                    </Text>
                  </View>
                  <View style={styles.modalGridItem}>
                    <Text style={styles.modalInfoLabel}>ID записи</Text>
                    <Text style={styles.modalInfoValue}>#{getAuditRecordId(selectedLog)}</Text>
                  </View>
                  <View style={styles.modalGridItem}>
                    <Text style={styles.modalInfoLabel}>Пользователь</Text>
                    <Text style={styles.modalInfoValue}>{getUserName(getAuditUserId(selectedLog))}</Text>
                  </View>
                  <View style={styles.modalGridItem}>
                    <Text style={styles.modalInfoLabel}>Дата</Text>
                    <Text style={styles.modalInfoValue}>{formatAuditDate(getAuditCreatedAt(selectedLog))}</Text>
                  </View>
                </View>
                <View style={styles.divider} />
                {renderJsonBlock('Старые данные', getAuditOldData(selectedLog))}
                {renderJsonBlock('Новые данные', getAuditNewData(selectedLog))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
    zIndex: 200,
    position: 'relative',
  },
  searchArea: {
    flex: 1,
    gap: 6,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    gap: 8,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
    paddingVertical: 10,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as Record<string, unknown>) : {}),
  },
  searchInfoText: {
    fontSize: 13,
    color: Colors.light.link,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
    flexShrink: 0,
    zIndex: 250,
  },
  selectWrap: {
    gap: 6,
    position: 'relative',
    zIndex: 5,
    width: 180,
  },
  selectLabel: {
    fontSize: 12,
    color: Colors.light.link,
    fontWeight: '600',
  },
  selectInput: {
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectInputText: {
    fontSize: 13,
    color: Colors.light.text,
    fontWeight: '500',
  },
  selectMenu: {
    position: 'absolute',
    top: 66,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 30,
    ...Platform.select({
      web: { boxShadow: '0 8px 20px rgba(0,0,0,0.12)' },
      default: { elevation: 6 },
    }),
  },
  selectOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectOptionText: {
    fontSize: 13,
    color: Colors.light.text,
    fontWeight: '500',
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
      default: { elevation: 1 },
    }),
    zIndex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  th: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.link,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tableBody: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: '#FAFBFC',
  },
  td: {
    fontSize: 13,
    color: Colors.light.text,
  },
  tdId: {
    fontWeight: '600',
    color: Colors.light.link,
  },
  tdSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  tdDate: {
    fontSize: 12,
    color: Colors.light.link,
  },
  tdWrap: {
    justifyContent: 'center',
  },
  opBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  opDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  opText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(5, 148, 103, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyRow: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  emptyHint: {
    fontSize: 13,
    color: Colors.light.link,
  },
  // Пагинация
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageNumBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageNumBtnActive: {
    backgroundColor: Colors.light.button,
  },
  pageNumText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  pageNumTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 640,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
  },
  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  modalGridItem: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
  },
  modalInfoLabel: {
    fontSize: 11,
    color: Colors.light.link,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  modalInfoValue: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
  jsonBlock: {
    marginBottom: 16,
  },
  jsonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 10,
  },
  jsonEmpty: {
    fontSize: 13,
    color: Colors.light.link,
    fontStyle: 'italic',
  },
  jsonRaw: {
    fontSize: 12,
    color: Colors.light.text,
    fontFamily: Platform.select({ web: 'monospace', default: 'monospace' }),
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 10,
  },
  jsonTable: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  jsonRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 2,
  },
  jsonKey: {
    fontSize: 12,
    color: Colors.light.link,
    fontWeight: '600',
    minWidth: 140,
    fontFamily: Platform.select({ web: 'monospace', default: 'monospace' }),
  },
  jsonValue: {
    fontSize: 12,
    color: Colors.light.text,
    flex: 1,
  },
});
