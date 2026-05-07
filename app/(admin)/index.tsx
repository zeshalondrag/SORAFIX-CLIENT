import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Polyline, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import type { AnalyticsPdfChartPayload } from '@/lib/admin-analytics-pdf';
import { buildAndSaveAnalyticsPdf } from '@/lib/admin-analytics-pdf';
import {
    getCreatedAt,
    getEmployeeId,
    getPrice,
    getRequestTypeId,
    getStatusId,
    REQUEST_STATUSES,
    requestsApi,
    SERVICE_TYPE_LABELS,
    STATUS_LABELS,
    usersApi,
    type Request,
    type UserInfo,
} from '@/lib/requests-api';

type PeriodKey = '1m' | '3m' | '6m' | '12m';
type SelectOption = { value: string; label: string };
type PieSlice = { label: string; value: number; color: string };
type SpecialistSummary = {
  id: number;
  name: string;
  total: number;
  active: number;
  done: number;
  revenue: number;
  avgHours: number;
};

const PERIOD_OPTIONS: SelectOption[] = [
  { value: '1m', label: 'Текущий месяц' },
  { value: '3m', label: '3 месяца' },
  { value: '6m', label: '6 месяцев' },
  { value: '12m', label: '1 год' },
];

const SORT_OPTIONS: SelectOption[] = [
  { value: 'revenue_desc', label: 'По выручке: убыв.' },
  { value: 'revenue_asc', label: 'По выручке: возр.' },
  { value: 'total_desc', label: 'По заявкам: убыв.' },
  { value: 'total_asc', label: 'По заявкам: возр.' },
  { value: 'avg_desc', label: 'По средн. времени: убыв.' },
  { value: 'avg_asc', label: 'По средн. времени: возр.' },
];

const STATUS_COLORS: Record<number, string> = {
  1: '#3B82F6',
  2: '#A855F7',
  3: '#F59E0B',
  4: '#06B6D4',
  5: '#10B981',
  6: '#6B7280',
  7: '#EF4444',
};

const SERVICE_COLORS: Record<number, string> = {
  1: '#16A34A',
  2: '#0EA5E9',
  3: '#A855F7',
  4: '#F59E0B',
  5: '#EF4444',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

function getDateStart(period: PeriodKey, now = new Date()): Date {
  const d = new Date(now);
  if (period === '1m') return new Date(d.getFullYear(), d.getMonth(), 1);
  if (period === '3m') return new Date(d.getFullYear(), d.getMonth() - 2, 1);
  if (period === '6m') return new Date(d.getFullYear(), d.getMonth() - 5, 1);
  return new Date(d.getFullYear(), d.getMonth() - 11, 1);
}

function getMonthsCount(period: PeriodKey): number {
  if (period === '1m') return 1;
  if (period === '3m') return 3;
  if (period === '6m') return 6;
  return 12;
}

function avgHours(requests: Request[]): number {
  let total = 0;
  let count = 0;
  for (const r of requests) {
    const s = getStatusId(r);
    if (s !== REQUEST_STATUSES.READY && s !== REQUEST_STATUSES.CLOSED) continue;
    const created = new Date(getCreatedAt(r)).getTime();
    const updated = new Date(r.updatedAt ?? r.updated_at ?? '').getTime();
    if (!Number.isFinite(created) || !Number.isFinite(updated) || updated <= created) continue;
    total += (updated - created) / 3_600_000;
    count += 1;
  }
  return count ? total / count : 0;
}

function Select({
  filterKey,
  openFilterKey,
  onOpenFilterKey,
  label,
  value,
  options,
  onChange,
  width = 210,
}: {
  filterKey: string;
  openFilterKey: string | null;
  onOpenFilterKey: (key: string | null) => void;
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (next: string) => void;
  width?: number;
}) {
  const anchorRef = useRef<View>(null);
  const [menuLayout, setMenuLayout] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const open = openFilterKey === filterKey;
  const current = options.find((o) => o.value === value) ?? options[0];

  useLayoutEffect(() => {
    if (!open) {
      setMenuLayout(null);
      return;
    }
    const id = requestAnimationFrame(() => {
      anchorRef.current?.measureInWindow((x, y, w, h) => {
        setMenuLayout({ x, y, w, h });
      });
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  return (
    <View style={[styles.selectWrap, { width }]}>
      <Text style={styles.selectLabel}>{label}</Text>
      <View ref={anchorRef} collapsable={false}>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => onOpenFilterKey(open ? null : filterKey)}
          activeOpacity={0.8}
        >
          <Text style={styles.selectText} numberOfLines={1}>
            {current?.label ?? 'Выберите'}
          </Text>
          <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#64748B" />
        </TouchableOpacity>
      </View>
      <Modal visible={open} transparent animationType="none" onRequestClose={() => onOpenFilterKey(null)}>
        <View style={styles.selectModalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => onOpenFilterKey(null)} />
          {menuLayout ? (
            <View
              style={[
                styles.selectDropdownModal,
                {
                  top: menuLayout.y + menuLayout.h + 4,
                  left: menuLayout.x,
                  width: Math.max(menuLayout.w, 200),
                },
              ]}
            >
              {options.map((option) => {
                const selected = option.value === value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.selectItem, selected && styles.selectItemActive]}
                    onPress={() => {
                      onChange(option.value);
                      onOpenFilterKey(null);
                    }}
                  >
                    <Text style={[styles.selectItemText, selected && styles.selectItemTextActive]}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const PERIOD_SEGMENTS: { key: PeriodKey; short: string }[] = [
  { key: '1m', short: '1М' },
  { key: '3m', short: '3М' },
  { key: '6m', short: '6М' },
  { key: '12m', short: '1Г' },
];

function trendDeltaPct(series: number[]): { pct: number; up: boolean } {
  if (series.length < 2) return { pct: 0, up: true };
  const mid = Math.max(1, Math.floor(series.length / 2));
  const a = series.slice(0, mid).reduce((s, v) => s + v, 0);
  const b = series.slice(mid).reduce((s, v) => s + v, 0);
  const denom = Math.max(a, 1);
  const raw = ((b - a) / denom) * 100;
  return { pct: Math.min(999, Math.abs(raw)), up: raw >= 0 };
}

function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  const w = 108;
  const h = 36;
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * (w - 4) + 2;
      const y = h - 3 - ((v - min) / range) * (h - 6);
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <Svg width={w} height={h}>
      <Polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

function KpiDashCard({
  icon,
  label,
  value,
  accent,
  sparkValues,
  delta,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  accent: string;
  sparkValues: number[];
  delta: { pct: number; up: boolean };
}) {
  return (
    <View style={styles.dashKpiCard}>
      <View style={styles.dashKpiTop}>
        <View style={[styles.dashKpiIcon, { backgroundColor: `${accent}18` }]}>
          <MaterialCommunityIcons name={icon} size={20} color={accent} />
        </View>
        <MaterialCommunityIcons name="open-in-new" size={16} color="#CBD5E1" />
      </View>
      <Text style={styles.dashKpiValue}>{value}</Text>
      <View style={styles.dashKpiRow}>
        <View style={styles.dashKpiDeltaRow}>
          <MaterialCommunityIcons name={delta.up ? 'trending-up' : 'trending-down'} size={16} color={delta.up ? '#059669' : '#EF4444'} />
          <Text style={[styles.dashKpiDelta, { color: delta.up ? '#059669' : '#EF4444' }]}>
            {delta.pct < 0.05 ? '—' : `${delta.up ? '↑' : '↓'} ${delta.pct.toFixed(1)}%`}
          </Text>
        </View>
        <MiniSparkline values={sparkValues.length ? sparkValues : [0, 0]} color={accent} />
      </View>
      <Text style={styles.dashKpiLabel}>{label}</Text>
    </View>
  );
}

function PeriodSegmentBar({ period, onPeriod }: { period: PeriodKey; onPeriod: (p: PeriodKey) => void }) {
  return (
    <View style={styles.segmentBar}>
      {PERIOD_SEGMENTS.map((seg) => {
        const active = seg.key === period;
        return (
          <TouchableOpacity
            key={seg.key}
            style={[styles.segmentPill, active && styles.segmentPillActive]}
            onPress={() => onPeriod(seg.key)}
            activeOpacity={0.85}
          >
            <Text style={[styles.segmentPillText, active && styles.segmentPillTextActive]}>{seg.short}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ActivityDonutPanel({
  period,
  onPeriod,
  data,
  total,
}: {
  period: PeriodKey;
  onPeriod: (p: PeriodKey) => void;
  data: PieSlice[];
  total: number;
}) {
  const vb = 196;
  const cx = vb / 2;
  const cy = vb / 2;
  const radius = 68;
  const stroke = 20;
  const innerR = radius - stroke / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;
  const visible = data.filter((d) => d.value > 0);
  return (
    <View style={styles.activityCard}>
      <View style={styles.activityHeader}>
        <Text style={styles.activityTitle}>Активность по статусам</Text>
        <PeriodSegmentBar period={period} onPeriod={onPeriod} />
      </View>
      {total === 0 ? (
        <Text style={styles.emptyText}>Нет данных</Text>
      ) : (
        <View style={styles.activityBody}>
          <View style={styles.donutLargeWrap}>
            <Svg width={vb} height={vb} viewBox={`0 0 ${vb} ${vb}`}>
              <Defs>
                <LinearGradient id="donutTrackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#E2E8F0" />
                  <Stop offset="100%" stopColor="#F1F5F9" />
                </LinearGradient>
              </Defs>
              <Circle cx={cx} cy={cy} r={radius} stroke="url(#donutTrackGrad)" strokeWidth={stroke} fill="none" />
              {visible.map((slice) => {
                const segment = (slice.value / total) * circumference;
                const offset = circumference - cumulative;
                cumulative += segment;
                return (
                  <Circle
                    key={slice.label}
                    cx={cx}
                    cy={cy}
                    r={radius}
                    stroke={slice.color}
                    strokeWidth={stroke}
                    fill="none"
                    strokeDasharray={`${segment} ${circumference - segment}`}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${cx} ${cy})`}
                  />
                );
              })}
              <Circle cx={cx} cy={cy} r={innerR} fill="#FFFFFF" stroke="#F1F5F9" strokeWidth={1} />
            </Svg>
            <View style={styles.donutLargeCenter}>
              <Text style={styles.donutLargeTotal}>{total}</Text>
              <Text style={styles.donutLargeSub}>Всего заявок</Text>
            </View>
          </View>
          <View style={styles.activityLegend}>
            {visible.map((slice) => (
              <View key={slice.label} style={styles.activityLegendRow}>
                <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                <Text style={styles.activityLegendLabel} numberOfLines={1}>
                  {slice.label}
                </Text>
                <Text style={styles.activityLegendVal}>{slice.value}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function GroupedBarBlock({
  labels,
  seriesA,
  seriesB,
}: {
  labels: string[];
  seriesA: number[];
  seriesB: number[];
}) {
  const w = 720;
  const h = 300;
  const pad = { l: 52, r: 20, t: 52, b: 48 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;
  const max = Math.max(1, ...seriesA, ...seriesB);
  const n = Math.max(labels.length, 1);
  const groupW = plotW / n;
  const barW = (groupW * 0.55) / 2;
  const gapX = groupW * 0.1;
  return (
    <View style={styles.barCard}>
      <View style={styles.barCardHeader}>
        <Text style={styles.barCardTitle}>Заявки по месяцам</Text>
        <View style={styles.barLegendRow}>
          <View style={styles.barLegendItem}>
            <View style={[styles.barLegendSwatch, { backgroundColor: '#1E40AF' }]} />
            <Text style={styles.barLegendText}>Создано</Text>
          </View>
          <View style={styles.barLegendItem}>
            <View style={[styles.barLegendSwatch, { backgroundColor: '#38BDF8' }]} />
            <Text style={styles.barLegendText}>Завершено</Text>
          </View>
        </View>
      </View>
      <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
        <Rect x={pad.l} y={pad.t} width={plotW} height={plotH} rx={12} fill="#F8FAFC" stroke="#E2E8F0" strokeWidth={1} />
        {labels.map((_, i) => {
          const x0 = pad.l + i * groupW + gapX / 2;
          const ha = (seriesA[i] ?? 0) / max;
          const hb = (seriesB[i] ?? 0) / max;
          const ya = pad.t + plotH - ha * plotH;
          const yb = pad.t + plotH - hb * plotH;
          return (
            <G key={`g-${i}`}>
              <Rect x={x0} y={ya} width={barW} height={pad.t + plotH - ya} rx={4} fill="rgba(30,64,175,0.88)" />
              <Rect x={x0 + barW + 5} y={yb} width={barW} height={pad.t + plotH - yb} rx={4} fill="rgba(56,189,248,0.9)" />
            </G>
          );
        })}
        {labels.map((lab, i) => {
          const cx = pad.l + i * groupW + groupW / 2;
          return (
            <SvgText key={`lx-${i}`} x={cx} y={h - 14} fill="#64748B" fontSize={11} textAnchor="middle">
              {lab}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

const PROGRESS_PALETTE = ['#059669', '#F59E0B', '#3B82F6', '#A855F7', '#EAB308'];

function SpecialistProgressBlock({ rows }: { rows: SpecialistSummary[] }) {
  const top = rows.slice(0, 5);
  const sum = Math.max(1, top.reduce((s, r) => s + r.total, 0));
  const allTotal = rows.reduce((s, r) => s + r.total, 0);
  const topSum = top.reduce((s, r) => s + r.total, 0);
  const topRevenue = top.reduce((s, r) => s + r.revenue, 0);
  const withWork = rows.filter((r) => r.total > 0).length;
  const shareAll = allTotal > 0 ? Math.round((topSum / allTotal) * 100) : 0;
  const restCount = Math.max(0, rows.length - 5);
  const restTotal = rows.slice(5).reduce((s, r) => s + r.total, 0);

  return (
    <View style={styles.progressCard}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressTitle}>Нагрузка по специалистам</Text>
        <Text style={styles.progressBadge}>Топ-5</Text>
      </View>
      {top.length === 0 ? (
        <Text style={styles.emptyText}>Нет данных</Text>
      ) : (
        <>
          <Text style={styles.progressLead}>
            Доля топ‑5 в заявках периода —{' '}
            <Text style={styles.progressLeadStrong}>{shareAll}%</Text>
            {allTotal > 0 ? ` · ${topSum} из ${allTotal} заявок` : ''}
          </Text>
          <View style={styles.progressStatRow}>
            <View style={styles.progressStatChip}>
              <MaterialCommunityIcons name="account-multiple-outline" size={16} color={Colors.light.link} />
              <Text style={styles.progressStatChipText}>
                С заявками: <Text style={styles.progressStatChipNum}>{withWork}</Text>
              </Text>
            </View>
            <View style={styles.progressStatChip}>
              <MaterialCommunityIcons name="cash-multiple" size={16} color={Colors.light.link} />
              <Text style={styles.progressStatChipText} numberOfLines={1}>
                Выручка топ‑5: <Text style={styles.progressStatChipNum}>{formatCurrency(topRevenue)}</Text>
              </Text>
            </View>
          </View>
          {top.map((row, idx) => {
            const pct = Math.round((row.total / sum) * 100);
            const color = PROGRESS_PALETTE[idx % PROGRESS_PALETTE.length];
            return (
              <View key={row.id} style={styles.progressRow}>
                <View style={styles.progressRowTop}>
                  <View style={styles.progressNameRow}>
                    <View style={[styles.progressRank, { borderColor: color }]}>
                      <Text style={[styles.progressRankText, { color }]}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.progressName} numberOfLines={1}>
                      {row.name || `Специалист #${row.id}`}
                    </Text>
                  </View>
                  <Text style={styles.progressMeta}>
                    {row.total} ({pct}%)
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
                </View>
                <View style={styles.progressRowFoot}>
                  <Text style={styles.progressRowFootText}>
                    активн. {row.active} · готово {row.done} · {formatCurrency(row.revenue)}
                  </Text>
                </View>
              </View>
            );
          })}
          {restCount > 0 && (
            <View style={styles.progressFooter}>
              <MaterialCommunityIcons name="dots-horizontal" size={18} color="#94A3B8" />
              <Text style={styles.progressFooterText}>
                Остальные {restCount}: всего {restTotal} заявок в периоде
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<Request[]>([]);
  const [specialists, setSpecialists] = useState<UserInfo[]>([]);
  const [period, setPeriod] = useState<PeriodKey>('1m');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('revenue_desc');
  const [exporting, setExporting] = useState(false);
  const [exportHint, setExportHint] = useState('');
  const [openFilterKey, setOpenFilterKey] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqData, specialistData] = await Promise.all([requestsApi.getRequests(), usersApi.getTechnicians()]);
      setRequests(reqData);
      setSpecialists(specialistData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadData();
    }, 3000);
    return () => clearInterval(intervalId);
  }, [loadData]);

  const periodStart = useMemo(() => getDateStart(period), [period]);
  const filtered = useMemo(() => {
    return requests.filter((item) => {
      const created = new Date(getCreatedAt(item)).getTime();
      if (!Number.isFinite(created) || created < periodStart.getTime()) return false;
      if (statusFilter !== 'all' && String(getStatusId(item)) !== statusFilter) return false;
      if (serviceFilter !== 'all' && String(getRequestTypeId(item)) !== serviceFilter) return false;
      return true;
    });
  }, [requests, periodStart, statusFilter, serviceFilter]);

  const kpi = useMemo(() => {
    const revenue = filtered.reduce((sum, r) => sum + getPrice(r), 0);
    const active = filtered.filter((r) => {
      const s = getStatusId(r);
      return s === REQUEST_STATUSES.NEW || s === REQUEST_STATUSES.IN_PROGRESS || s === REQUEST_STATUSES.WAITING || s === REQUEST_STATUSES.CHECKING;
    }).length;
    const closed = filtered.filter((r) => getStatusId(r) === REQUEST_STATUSES.CLOSED || getStatusId(r) === REQUEST_STATUSES.READY).length;
    const avg = avgHours(filtered);
    return { revenue, active, closed, avg };
  }, [filtered]);

  const statusData = useMemo<PieSlice[]>(() => {
    return Object.entries(STATUS_LABELS).map(([id, label]) => {
      const numeric = Number(id);
      return {
        label,
        value: filtered.filter((r) => getStatusId(r) === numeric).length,
        color: STATUS_COLORS[numeric] ?? '#94A3B8',
      };
    });
  }, [filtered]);

  const serviceData = useMemo<PieSlice[]>(() => {
    return Object.entries(SERVICE_TYPE_LABELS).map(([id, label]) => {
      const numeric = Number(id);
      return {
        label,
        value: filtered.filter((r) => getRequestTypeId(r) === numeric).length,
        color: SERVICE_COLORS[numeric] ?? '#64748B',
      };
    });
  }, [filtered]);

  const trend = useMemo(() => {
    const months = getMonthsCount(period);
    const labels: string[] = [];
    const requestValues: number[] = [];
    const revenueValues: number[] = [];
    const completedPerMonth: number[] = [];
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    for (let i = 0; i < months; i++) {
      const monthDate = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const month = monthDate.getMonth();
      const year = monthDate.getFullYear();
      const monthRequests = filtered.filter((r) => {
        const created = new Date(getCreatedAt(r));
        return created.getFullYear() === year && created.getMonth() === month;
      });
      const completed = filtered.filter((r) => {
        const s = getStatusId(r);
        if (s !== REQUEST_STATUSES.READY && s !== REQUEST_STATUSES.CLOSED) return false;
        const u = r.updatedAt ?? r.updated_at ?? '';
        if (!u) return false;
        const d = new Date(u);
        return d.getFullYear() === year && d.getMonth() === month;
      }).length;
      labels.push(monthDate.toLocaleDateString('ru-RU', { month: 'short' }));
      requestValues.push(monthRequests.length);
      revenueValues.push(monthRequests.reduce((sum, r) => sum + getPrice(r), 0));
      completedPerMonth.push(completed);
    }
    return { labels, requestValues, revenueValues, completedPerMonth, createdPerMonth: requestValues };
  }, [filtered, period]);

  const chartPayloadForPdf = useMemo<AnalyticsPdfChartPayload>(
    () => ({
      statusDonutSlices: statusData.filter((s) => s.value > 0),
      statusDonutTotal: filtered.length,
      serviceDonutSlices: serviceData.filter((s) => s.value > 0),
      serviceDonutTotal: filtered.length,
      monthLabels: trend.labels,
      createdPerMonth: trend.createdPerMonth,
      completedPerMonth: trend.completedPerMonth,
      requestTrend: trend.requestValues,
      revenueTrend: trend.revenueValues,
    }),
    [filtered.length, serviceData, statusData, trend.completedPerMonth, trend.createdPerMonth, trend.labels, trend.requestValues, trend.revenueValues]
  );

  const activeTrend = useMemo(
    () => trend.requestValues.map((c, i) => Math.max(0, c - (trend.completedPerMonth[i] ?? 0))),
    [trend.completedPerMonth, trend.requestValues]
  );

  const avgSpark = useMemo(
    () => trend.labels.map((_, i) => Math.max(0.05, (kpi.avg || 0) * (0.88 + 0.03 * i))),
    [kpi.avg, trend.labels]
  );

  const specialistSummary = useMemo<SpecialistSummary[]>(() => {
    const rows = specialists.map((specialist) => {
      const own = filtered.filter((r) => getEmployeeId(r) === specialist.id);
      const name = `${specialist.lastName} ${specialist.firstName}`.trim();
      const active = own.filter((r) => {
        const s = getStatusId(r);
        return s === REQUEST_STATUSES.NEW || s === REQUEST_STATUSES.WAITING || s === REQUEST_STATUSES.IN_PROGRESS || s === REQUEST_STATUSES.CHECKING;
      }).length;
      const done = own.filter((r) => getStatusId(r) === REQUEST_STATUSES.CLOSED || getStatusId(r) === REQUEST_STATUSES.READY).length;
      return {
        id: specialist.id,
        name,
        total: own.length,
        active,
        done,
        revenue: own.reduce((sum, r) => sum + getPrice(r), 0),
        avgHours: avgHours(own),
      };
    });

    const sorted = [...rows].sort((a, b) => {
      if (sortBy === 'revenue_desc') return b.revenue - a.revenue;
      if (sortBy === 'revenue_asc') return a.revenue - b.revenue;
      if (sortBy === 'total_desc') return b.total - a.total;
      if (sortBy === 'total_asc') return a.total - b.total;
      if (sortBy === 'avg_desc') return b.avgHours - a.avgHours;
      return a.avgHours - b.avgHours;
    });
    return sorted;
  }, [filtered, sortBy, specialists]);

  const statusOptions = useMemo<SelectOption[]>(() => {
    return [{ value: 'all', label: 'Все статусы' }, ...Object.entries(STATUS_LABELS).map(([id, label]) => ({ value: id, label }))];
  }, []);

  const serviceOptions = useMemo<SelectOption[]>(() => {
    return [{ value: 'all', label: 'Все услуги' }, ...Object.entries(SERVICE_TYPE_LABELS).map(([id, label]) => ({ value: id, label }))];
  }, []);

  const handleExportPdf = useCallback(async () => {
    setExporting(true);
    setExportHint('');
    try {
      const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? period;
      const statusFilterLabel = statusOptions.find((o) => o.value === statusFilter)?.label ?? 'Все';
      const serviceFilterLabel = serviceOptions.find((o) => o.value === serviceFilter)?.label ?? 'Все';
      const result = await buildAndSaveAnalyticsPdf(
        {
          periodLabel,
          statusFilterLabel,
          serviceFilterLabel,
          introLines: [
            'Сводка отражает динамику заявок, выручку и загрузку специалистов за выбранный период с учётом фильтров вверху страницы.',
            'Блок графиков повторяет визуальную аналитику из вкладки: доли по статусам и услугам, сравнение созданных и завершённых заявок по месяцам, а также тренд количества и выручки.',
            'Таблицы в конце PDF содержат те же числа, что и сводная таблица в интерфейсе — удобно для отчётности и согласований.',
          ],
          kpiRows: [
            ['Заявок', String(filtered.length)],
            ['Выручка', formatCurrency(kpi.revenue)],
            ['Активные заявки', String(kpi.active)],
            ['Выполнено / закрыто', String(kpi.closed)],
            ['Среднее время', kpi.avg ? `${kpi.avg.toFixed(1)} ч` : '—'],
          ],
          statusRows: statusData.filter((x) => x.value > 0).map((x) => [x.label, String(x.value)]),
          specialistRows: specialistSummary.map((row) => [
            row.name,
            String(row.total),
            String(row.active),
            String(row.done),
            formatCurrency(row.revenue),
            row.avgHours ? `${row.avgHours.toFixed(1)} ч` : '—',
          ]),
          chartPayload: chartPayloadForPdf,
        },
        `analytics-${period}-${new Date().toISOString().slice(0, 10)}.pdf`
      );
      if (result.ok) {
        setExportHint('PDF сформирован и скачан.');
      } else {
        setExportHint(result.error);
      }
    } catch {
      setExportHint('Не удалось сформировать PDF. Попробуйте еще раз.');
    } finally {
      setExporting(false);
    }
  }, [
    chartPayloadForPdf,
    filtered.length,
    kpi.active,
    kpi.avg,
    kpi.closed,
    kpi.revenue,
    period,
    serviceFilter,
    serviceOptions,
    specialistSummary,
    statusData,
    statusFilter,
    statusOptions,
  ]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.light.button} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      onScrollBeginDrag={() => setOpenFilterKey(null)}
    >
      <View style={styles.filterCard}>
        <View style={styles.filterToolbar}>
          <View style={styles.filterRow}>
            <Select
              filterKey="period"
              openFilterKey={openFilterKey}
              onOpenFilterKey={setOpenFilterKey}
              label="Период"
              value={period}
              options={PERIOD_OPTIONS}
              onChange={(v) => setPeriod(v as PeriodKey)}
              width={210}
            />
            <Select
              filterKey="status"
              openFilterKey={openFilterKey}
              onOpenFilterKey={setOpenFilterKey}
              label="Статус"
              value={statusFilter}
              options={statusOptions}
              onChange={setStatusFilter}
              width={220}
            />
            <Select
              filterKey="service"
              openFilterKey={openFilterKey}
              onOpenFilterKey={setOpenFilterKey}
              label="Тип услуги"
              value={serviceFilter}
              options={serviceOptions}
              onChange={setServiceFilter}
              width={220}
            />
            <Select
              filterKey="sort"
              openFilterKey={openFilterKey}
              onOpenFilterKey={setOpenFilterKey}
              label="Сортировка сводной"
              value={sortBy}
              options={SORT_OPTIONS}
              onChange={setSortBy}
              width={230}
            />
          </View>
          <View style={styles.exportInline}>
            <TouchableOpacity style={[styles.exportButton, exporting && styles.exportButtonDisabled]} onPress={handleExportPdf} disabled={exporting}>
              <MaterialCommunityIcons name="file-pdf-box" size={18} color="#FFFFFF" />
              <Text style={styles.exportButtonText}>{exporting ? 'Формирование...' : 'Экспорт в PDF'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        {exportHint ? <Text style={styles.exportHintBelow}>{exportHint}</Text> : null}
      </View>

      <View style={styles.dashboardTop}>
        <View style={styles.kpiColumn}>
          <View style={styles.kpiRowPair}>
            <KpiDashCard
              icon="clipboard-list-outline"
              label="Заявок за период"
              value={String(filtered.length)}
              accent="#3B82F6"
              sparkValues={trend.requestValues}
              delta={trendDeltaPct(trend.requestValues)}
            />
            <KpiDashCard
              icon="cash-multiple"
              label="Выручка"
              value={formatCurrency(kpi.revenue)}
              accent={Colors.light.button}
              sparkValues={trend.revenueValues}
              delta={trendDeltaPct(trend.revenueValues)}
            />
          </View>
          <View style={styles.kpiRowPair}>
            <KpiDashCard
              icon="progress-clock"
              label="Активные заявки"
              value={String(kpi.active)}
              accent="#F59E0B"
              sparkValues={activeTrend}
              delta={trendDeltaPct(activeTrend)}
            />
            <KpiDashCard
              icon="timer-outline"
              label="Среднее время"
              value={kpi.avg ? `${kpi.avg.toFixed(1)} ч` : '—'}
              accent="#8B5CF6"
              sparkValues={avgSpark}
              delta={trendDeltaPct(avgSpark)}
            />
          </View>
        </View>
        <View style={styles.activityColumn}>
          <ActivityDonutPanel
            period={period}
            onPeriod={setPeriod}
            data={statusData}
            total={filtered.length}
          />
        </View>
      </View>

      <View style={styles.servicesStripCard}>
        <Text style={styles.servicesStripTitle}>Услуги</Text>
        <View style={styles.servicesStripRow}>
          {serviceData.filter((s) => s.value > 0).length === 0 ? (
            <Text style={styles.servicesStripEmpty}>Нет данных по услугам за период</Text>
          ) : (
            serviceData
              .filter((s) => s.value > 0)
              .map((s) => (
                <View key={s.label} style={styles.serviceChip}>
                  <View style={[styles.serviceChipDot, { backgroundColor: s.color }]} />
                  <Text style={styles.serviceChipText} numberOfLines={1}>
                    {s.label} · {s.value}
                  </Text>
                </View>
              ))
          )}
        </View>
      </View>

      <View style={styles.dashboardBottom}>
        <View style={styles.dashboardBottomLeft}>
          <GroupedBarBlock
            labels={trend.labels}
            seriesA={trend.createdPerMonth}
            seriesB={trend.completedPerMonth}
          />
        </View>
        <View style={styles.dashboardBottomRight}>
          <SpecialistProgressBlock rows={specialistSummary} />
        </View>
      </View>

      <View style={styles.specTableSection}>
        <View style={styles.specTableTitleRow}>
          <MaterialCommunityIcons name="table-large" size={18} color={Colors.light.link} />
          <Text style={styles.specTableTitle}>Сводная таблица по специалистам</Text>
        </View>
        <View style={styles.usersTableCard}>
          <View style={styles.usersTableHeader}>
            <Text style={[styles.usersTh, { flex: 2 }]}>Специалист</Text>
            <Text style={[styles.usersTh, { flex: 0.72, textAlign: 'right' }]}>Всего</Text>
            <Text style={[styles.usersTh, { flex: 0.85, textAlign: 'right' }]}>Активные</Text>
            <Text style={[styles.usersTh, { flex: 0.85, textAlign: 'right' }]}>Выполнено</Text>
            <Text style={[styles.usersTh, { flex: 1.15, textAlign: 'right' }]}>Выручка</Text>
            <Text style={[styles.usersTh, { flex: 0.9, textAlign: 'right' }]}>Ср. время</Text>
          </View>
          <View style={styles.usersTableBody}>
            {specialistSummary.length === 0 ? (
              <View style={styles.usersEmptyRow}>
                <MaterialCommunityIcons name="account-search-outline" size={48} color="#D1D5DB" />
                <Text style={styles.usersEmptyTitle}>Нет данных по специалистам</Text>
                <Text style={styles.usersEmptyHint}>За выбранный период нет назначенных заявок</Text>
              </View>
            ) : (
              specialistSummary.map((row, index) => {
                const isEven = index % 2 === 0;
                return (
                  <View key={row.id} style={[styles.usersTableRow, isEven && styles.usersTableRowEven]}>
                    <View style={{ flex: 2 }}>
                      <Text style={styles.usersTd} numberOfLines={1}>
                        {row.name || `Специалист #${row.id}`}
                      </Text>
                      <Text style={styles.usersTdSub}>ID: {row.id}</Text>
                    </View>
                    <Text style={[styles.usersTd, { flex: 0.72, textAlign: 'right' }]}>{row.total}</Text>
                    <Text style={[styles.usersTd, { flex: 0.85, textAlign: 'right' }]}>{row.active}</Text>
                    <Text style={[styles.usersTd, { flex: 0.85, textAlign: 'right' }]}>{row.done}</Text>
                    <Text style={[styles.usersTd, { flex: 1.15, textAlign: 'right' }]}>{formatCurrency(row.revenue)}</Text>
                    <Text style={[styles.usersTdSmall, { flex: 0.9, textAlign: 'right' }]}>
                      {row.avgHours ? `${row.avgHours.toFixed(1)} ч` : '—'}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1},
  content: {
    paddingBottom: 32,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  filterCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 16,
    overflow: 'visible',
    ...Platform.select({
      web: { boxShadow: '0 4px 24px rgba(15,23,42,0.06)' },
      default: { elevation: 2 },
    }),
  },
  filterToolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: 12,
    overflow: 'visible',
    zIndex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    flex: 1,
    flexGrow: 1,
    minWidth: 200,
    overflow: 'visible',
    zIndex: 1,
  },
  exportInline: { flexShrink: 0, justifyContent: 'flex-end' },
  selectWrap: {
    position: 'relative',
    zIndex: 1,
    ...Platform.select({ web: { overflow: 'visible' as const } }),
  },
  selectLabel: { fontSize: 12, color: '#64748B', marginBottom: 6, fontWeight: '600' },
  selectButton: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  selectText: { flex: 1, color: '#0F172A', fontSize: 14 },
  selectModalRoot: { flex: 1 },
  selectDropdownModal: {
    position: 'absolute',
    maxHeight: 280,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    zIndex: 999999,
    ...Platform.select({
      web: { boxShadow: '0 16px 40px rgba(15,23,42,0.18)' },
      default: { elevation: 24 },
    }),
  },
  selectItem: { paddingVertical: 10, paddingHorizontal: 12 },
  selectItemActive: { backgroundColor: '#ECFDF5' },
  selectItemText: { fontSize: 14, color: '#334155' },
  selectItemTextActive: { color: '#047857', fontWeight: '700' },
  exportHintBelow: { marginTop: 10, color: '#64748B', fontSize: 13 },
  exportButton: {
    borderRadius: 10,
    backgroundColor: Colors.light.button,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  exportButtonDisabled: { opacity: 0.6 },
  exportButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  dashboardTop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 14,
    alignItems: 'stretch',
  },
  kpiColumn: { flex: 1, flexGrow: 2, flexBasis: 0, minWidth: 300, gap: 12 },
  kpiRowPair: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  activityColumn: {
    flexGrow: 0,
    flexShrink: 0,
    width: 800,
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  dashKpiCard: {
    flex: 1,
    minWidth: 148,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    padding: 16,
    gap: 10,
    ...Platform.select({
      web: { boxShadow: '0 2px 14px rgba(15,23,42,0.05)' },
      default: { elevation: 1 },
    }),
  },
  dashKpiTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dashKpiIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashKpiValue: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  dashKpiRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  dashKpiDeltaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dashKpiDelta: { fontSize: 12, fontWeight: '700' },
  dashKpiLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  activityCard: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    minHeight: 280,
    ...Platform.select({
      web: { boxShadow: '0 4px 24px rgba(15,23,42,0.07)' },
      default: { elevation: 2 },
    }),
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexWrap: 'wrap',
    gap: 10,
  },
  activityTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', flex: 1, minWidth: 140 },
  segmentBar: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 3, gap: 3 },
  segmentPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  segmentPillActive: { backgroundColor: '#FFFFFF', ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }, default: {} }) },
  segmentPillText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  segmentPillTextActive: { color: Colors.light.button },
  activityBody: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 12,
  },
  donutLargeWrap: { width: 196, height: 196, alignSelf: 'center', justifyContent: 'center', alignItems: 'center' },
  donutLargeCenter: { position: 'absolute', alignItems: 'center' },
  donutLargeTotal: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  donutLargeSub: { fontSize: 11, color: '#64748B', fontWeight: '500' },
  activityLegend: { width: '100%', gap: 8 },
  activityLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activityLegendLabel: { flex: 1, fontSize: 13, color: '#334155' },
  activityLegendVal: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  servicesStripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 14,
    ...Platform.select({
      web: { boxShadow: '0 2px 12px rgba(15,23,42,0.05)' },
      default: { elevation: 1 },
    }),
  },
  servicesStripTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 10 },
  servicesStripRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    maxWidth: '100%',
  },
  serviceChipDot: { width: 8, height: 8, borderRadius: 4 },
  serviceChipText: { fontSize: 12, color: '#475569', flexShrink: 1 },
  servicesStripEmpty: { fontSize: 13, color: '#94A3B8' },
  dashboardBottom: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 14 },
  dashboardBottomLeft: { flex: 1.85, flexBasis: 0, minWidth: 300 },
  dashboardBottomRight: { flex: 1, flexBasis: 0, minWidth: 260 },
  barCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 4px 20px rgba(15,23,42,0.06)' },
      default: { elevation: 2 },
    }),
  },
  barCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexWrap: 'wrap',
    gap: 8,
  },
  barCardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  barLegendRow: { flexDirection: 'row', gap: 14 },
  barLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barLegendSwatch: { width: 10, height: 10, borderRadius: 3 },
  barLegendText: { fontSize: 12, color: '#64748B' },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    minHeight: 345,
    ...Platform.select({
      web: { boxShadow: '0 4px 20px rgba(15,23,42,0.06)' },
      default: { elevation: 2 },
    }),
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  progressBadge: { fontSize: 12, fontWeight: '700', color: Colors.light.button },
  progressLead: { fontSize: 12, color: '#64748B', lineHeight: 18, marginBottom: 10 },
  progressLeadStrong: { fontWeight: '700', color: '#334155' },
  progressStatRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  progressStatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#EEF2F7',
    flexShrink: 1,
  },
  progressStatChipText: { fontSize: 12, color: '#475569', flexShrink: 1 },
  progressStatChipNum: { fontWeight: '700', color: '#0F172A' },
  progressRow: { marginBottom: 12 },
  progressRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  progressNameRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 8, minWidth: 0 },
  progressRank: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRankText: { fontSize: 12, fontWeight: '800' },
  progressName: { flex: 1, fontSize: 13, color: '#334155', fontWeight: '600', minWidth: 0 },
  progressMeta: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  progressRowFoot: { marginTop: 4 },
  progressRowFootText: { fontSize: 11, color: '#94A3B8' },
  progressFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  progressFooterText: { fontSize: 12, color: '#64748B', flex: 1 },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 999 },
  emptyText: { color: '#64748B', fontSize: 13, paddingHorizontal: 16, paddingBottom: 16 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  specTableSection: { marginBottom: 8, width: '100%', alignSelf: 'stretch' },
  specTableTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  specTableTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  /** Сводная таблица: те же стили, что таблица на вкладке «Пользователи» (`users.tsx`). */
  usersTableCard: {
    width: '100%',
    alignSelf: 'stretch',
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
  usersTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  usersTh: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.link,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  usersTableBody: {},
  usersTableRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
  },
  usersTableRowEven: { backgroundColor: '#FAFBFC' },
  usersTd: { fontSize: 13, color: Colors.light.text },
  usersTdSub: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  usersTdSmall: { fontSize: 12, color: Colors.light.link },
  usersEmptyRow: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  usersEmptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.light.text },
  usersEmptyHint: { fontSize: 13, color: Colors.light.link },
});