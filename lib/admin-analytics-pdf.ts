import autoTable from 'jspdf-autotable';
// Package `main` points at the Node bundle (html2canvas AMD); use browser ESM for Expo web / SSR.
import { jsPDF } from 'jspdf/dist/jspdf.es.min.js';

import {
  registerCanvasFontFromTtfBase64,
  renderDonutChartPng,
  renderDualLinePng,
  renderGroupedBarsPng,
  type DonutSlice,
} from './admin-analytics-pdf-charts';

/** TTF: Noto Serif (антиква с кириллицией; Times New Roman в открытом доступе для fetch обычно недоступен). В PDF регистрируется как TimesNewRoman. */
const FONT_VFS_NAME = 'NotoSerif-Regular.ttf';
const FONT_FAMILY = 'TimesNewRoman';
const CANVAS_FONT = 'TimesNewRoman';

const FONT_SIZE_PT = 14;
const LINE_HEIGHT_MULT = 1.5;
const LINE_HEIGHT_PT = FONT_SIZE_PT * LINE_HEIGHT_MULT;
/** Поля абзаца (слева и справа от основного текста), см — как в типовых требованиях к оформлению. */
const PARAGRAPH_MARGIN_CM = 1.25;
const PT_PER_CM = 28.3464566929;
const PARAGRAPH_MARGIN_PT = PARAGRAPH_MARGIN_CM * PT_PER_CM;

let cyrillicFontBase64: string | null | undefined;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    const end = Math.min(i + chunk, bytes.length);
    let sub = '';
    for (let j = i; j < end; j++) {
      sub += String.fromCharCode(bytes[j]!);
    }
    binary += sub;
  }
  if (typeof btoa === 'undefined') {
    throw new Error('btoa недоступен: экспорт PDF поддерживается в браузере');
  }
  return btoa(binary);
}

async function loadCyrillicFontBase64(): Promise<string | null> {
  if (cyrillicFontBase64 !== undefined) return cyrillicFontBase64;
  const urls = [
    'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSerif/NotoSerif-Regular.ttf',
    'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSerif/NotoSerif-Regular.ttf',
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      if (buf.byteLength < 10_000) continue;
      cyrillicFontBase64 = arrayBufferToBase64(buf);
      return cyrillicFontBase64;
    } catch {
      continue;
    }
  }
  cyrillicFontBase64 = null;
  return null;
}

function registerFont(doc: jsPDF, base64: string): void {
  doc.addFileToVFS(FONT_VFS_NAME, base64);
  doc.addFont(FONT_VFS_NAME, FONT_FAMILY, 'normal', 'Identity-H');
}

const GREEN: [number, number, number] = [5, 148, 103];
const GREEN_LIGHT: [number, number, number] = [236, 253, 245];
const SLATE: [number, number, number] = [51, 65, 85];
const BORDER: [number, number, number] = [226, 232, 240];

export type AnalyticsPdfChartPayload = {
  statusDonutSlices: DonutSlice[];
  statusDonutTotal: number;
  serviceDonutSlices: DonutSlice[];
  serviceDonutTotal: number;
  monthLabels: string[];
  createdPerMonth: number[];
  completedPerMonth: number[];
  requestTrend: number[];
  revenueTrend: number[];
};

export type AnalyticsPdfInput = {
  periodLabel: string;
  statusFilterLabel: string;
  serviceFilterLabel: string;
  introLines: string[];
  kpiRows: [string, string][];
  statusRows: [string, string][];
  specialistRows: (string | number)[][];
  chartPayload: AnalyticsPdfChartPayload;
};

function lastAutoY(doc: jsPDF, fallback: number): number {
  return (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? fallback;
}

export async function buildAndSaveAnalyticsPdf(
  data: AnalyticsPdfInput,
  fileSlug: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const base64 = await loadCyrillicFontBase64();
  if (!base64) {
    return { ok: false, error: 'Не удалось загрузить шрифт для кириллицы. Проверьте сеть и повторите.' };
  }

  if (typeof document !== 'undefined') {
    await registerCanvasFontFromTtfBase64(base64, CANVAS_FONT);
  }

  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  registerFont(doc, base64);
  doc.setFont(FONT_FAMILY, 'normal');

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 40;
  const innerX = marginX + PARAGRAPH_MARGIN_PT;
  const innerRight = marginX + PARAGRAPH_MARGIN_PT;
  const innerW = pageW - innerX - innerRight;

  const ensureY = (y: number, need: number): number => {
    if (y + need > pageH - 40) {
      doc.addPage();
      return 52;
    }
    return y;
  };

  const drawSectionTitle = (title: string, y: number): number => {
    let yy = ensureY(y, LINE_HEIGHT_PT + 18);
    doc.setFont(FONT_FAMILY, 'normal');
    doc.setFontSize(FONT_SIZE_PT);
    doc.setTextColor(...GREEN);
    doc.text(title, innerX, yy);
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(1);
    doc.line(innerX, yy + 4, innerX + 96, yy + 4);
    doc.setTextColor(...SLATE);
    return yy + LINE_HEIGHT_PT + 8;
  };

  const addWrapped = (text: string, y: number): number => {
    doc.setFont(FONT_FAMILY, 'normal');
    doc.setFontSize(FONT_SIZE_PT);
    const lines = doc.splitTextToSize(text, innerW);
    let yy = y;
    for (const line of lines) {
      yy = ensureY(yy, LINE_HEIGHT_PT);
      doc.text(line, innerX, yy);
      yy += LINE_HEIGHT_PT;
    }
    return yy + 6;
  };

  const addChartImage = (dataUrl: string | null, y: number, imgW: number, imgH: number): number => {
    if (!dataUrl) return y;
    let yy = ensureY(y, imgH + 12);
    doc.addImage(dataUrl, 'PNG', innerX, yy, imgW, imgH);
    return yy + imgH + Math.round(LINE_HEIGHT_PT);
  };

  // Шапка
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pageW, 92, 'F');
  doc.setFont(FONT_FAMILY, 'normal');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(FONT_SIZE_PT + 6);
  doc.text('SORAFIX', innerX, 42);
  doc.setFontSize(FONT_SIZE_PT);
  doc.setTextColor(230, 250, 240);
  doc.text('Аналитика сервисных заявок', innerX, 62);
  doc.text(`Период: ${data.periodLabel}`, innerX, 80);

  doc.setTextColor(...SLATE);
  let y = 108;
  y = addWrapped(`Сформировано: ${new Date().toLocaleString('ru-RU')}`, y);
  y = addWrapped(`Фильтры: статус — ${data.statusFilterLabel}; услуга — ${data.serviceFilterLabel}.`, y);

  y = drawSectionTitle('О чём этот отчёт', y);
  for (const paragraph of data.introLines) {
    y = addWrapped(paragraph, y);
  }

  y = drawSectionTitle('Сводные показатели', y);

  const tableCellPad = {
    top: Math.max(4, Math.round((LINE_HEIGHT_PT - FONT_SIZE_PT) / 2) + 2),
    bottom: Math.max(4, Math.round((LINE_HEIGHT_PT - FONT_SIZE_PT) / 2) + 2),
    left: 5,
    right: 5,
  };
  const tableCommon = {
    styles: {
      font: FONT_FAMILY,
      fontStyle: 'normal' as const,
      fontSize: FONT_SIZE_PT,
      textColor: SLATE,
      cellPadding: tableCellPad,
      lineColor: BORDER,
      lineWidth: 0.3,
    },
    headStyles: {
      font: FONT_FAMILY,
      fontStyle: 'normal' as const,
      fillColor: GREEN,
      textColor: [255, 255, 255] as [number, number, number],
      halign: 'left' as const,
      fontSize: FONT_SIZE_PT,
      cellPadding: tableCellPad,
    },
    alternateRowStyles: { fillColor: GREEN_LIGHT },
    margin: { left: innerX, right: innerRight },
  };

  autoTable(doc, {
    ...tableCommon,
    startY: y,
    head: [['Показатель', 'Значение']],
    body: data.kpiRows,
    columnStyles: { 0: { cellWidth: 220 } },
  });
  y = lastAutoY(doc, y + 120) + 20;

  const cp = data.chartPayload;
  const ff = CANVAS_FONT;
  const imgW = innerW;
  const donutH = (imgW * 200) / 520;
  const barH = (imgW * 200) / 520;
  const lineH = (imgW * 180) / 520;

  if (typeof document !== 'undefined') {
    y = drawSectionTitle('Графики', y);

    const statusPng = renderDonutChartPng(cp.statusDonutSlices, cp.statusDonutTotal, 260, ff);
    y = addWrapped('Круговая диаграмма показывает долю заявок в каждом статусе в выбранном периоде.', y);
    y = addChartImage(statusPng, y, imgW, donutH);

    const servicePng = renderDonutChartPng(cp.serviceDonutSlices, cp.serviceDonutTotal, 260, ff);
    y = addWrapped('Распределение по типам услуг помогает понять, какие направления нагружены сильнее всего.', y);
    y = addChartImage(servicePng, y, imgW, donutH);

    const barsPng = renderGroupedBarsPng(
      cp.monthLabels,
      cp.createdPerMonth,
      cp.completedPerMonth,
      'Создано за месяц',
      'Завершено за месяц',
      520,
      200,
      ff
    );
    y = addWrapped('Столбчатая диаграмма: сравнение объёма созданных и завершённых заявок по месяцам.', y);
    y = addChartImage(barsPng, y, imgW, barH);

    const trendPng = renderDualLinePng(
      cp.monthLabels,
      cp.requestTrend,
      cp.revenueTrend.map((v) => v / Math.max(1, ...cp.revenueTrend, 1) * Math.max(1, ...cp.requestTrend, 1)),
      '#059669',
      '#0EA5E9',
      'Динамика: заявки (зелёный) и выручка в относительных единицах (синий)',
      520,
      180,
      ff
    );
    y = addWrapped(
      'Линейный график: зелёная линия — число заявок по месяцам; синяя — выручка. Для каждой серии используется свой масштаб по вертикали, чтобы оба тренда были читаемы на одном рисунке.',
      y
    );
    y = addChartImage(trendPng, y, imgW, lineH);
  } else {
    y = addWrapped('Графики в PDF доступны при экспорте из браузера.', y);
  }

  y = ensureY(y, 80);
  y = drawSectionTitle('Таблицы', y);

  autoTable(doc, {
    ...tableCommon,
    startY: y,
    head: [['Статус', 'Количество']],
    body: data.statusRows,
    columnStyles: { 0: { cellWidth: 260 }, 1: { halign: 'right' as const } },
  });
  y = lastAutoY(doc, y + 80) + 18;

  y = ensureY(y, 120);
  autoTable(doc, {
    ...tableCommon,
    startY: y,
    head: [['Специалист', 'Всего', 'Активные', 'Выполнено', 'Выручка', 'Ср. время']],
    body: data.specialistRows,
    columnStyles: {
      0: { cellWidth: 150 },
      1: { halign: 'center' as const, cellWidth: 48 },
      2: { halign: 'center' as const, cellWidth: 52 },
      3: { halign: 'center' as const, cellWidth: 58 },
      4: { cellWidth: 92 },
      5: { cellWidth: 62 },
    },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont(FONT_FAMILY, 'normal');
    doc.setFontSize(FONT_SIZE_PT);
    doc.setTextColor(148, 163, 184);
    doc.text(`SORAFIX · стр. ${i} из ${pageCount}`, pageW / 2, pageH - 22, { align: 'center' });
  }

  doc.save(fileSlug);
  return { ok: true };
}
