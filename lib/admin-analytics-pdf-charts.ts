/** Рендер графиков в PNG (data URL) для вставки в PDF. Только браузер (Canvas). */

export type DonutSlice = { label: string; value: number; color: string };

export async function registerCanvasFontFromTtfBase64(base64: string, familyName: string): Promise<boolean> {
  if (typeof document === 'undefined' || typeof FontFace === 'undefined') return false;
  try {
    const face = new FontFace(familyName, `url(data:font/ttf;base64,${base64})`);
    await face.load();
    document.fonts.add(face);
    await document.fonts.ready;
    return true;
  } catch {
    return false;
  }
}

function getCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  return { canvas, ctx };
}

export function renderDonutChartPng(
  slices: DonutSlice[],
  total: number,
  size = 220,
  fontFamily = 'sans-serif'
): string | null {
  const pack = getCanvas(size, size);
  if (!pack) return null;
  const { canvas, ctx } = pack;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size * 0.38;
  const rInner = size * 0.24;
  ctx.clearRect(0, 0, size, size);
  if (total <= 0) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = `14px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.fillText('Нет данных', cx, cy);
    return canvas.toDataURL('image/png');
  }
  let angle = -Math.PI / 2;
  for (const s of slices) {
    if (s.value <= 0) continue;
    const span = (s.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter, angle, angle + span);
    ctx.arc(cx, cy, rInner, angle + span, angle, true);
    ctx.closePath();
    ctx.fillStyle = s.color;
    ctx.fill();
    angle += span;
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(cx, cy, rInner - 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0F172A';
  ctx.font = `bold ${Math.round(size * 0.12)}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(total), cx, cy - 6);
  ctx.fillStyle = '#64748B';
  ctx.font = `${Math.round(size * 0.055)}px ${fontFamily}`;
  ctx.fillText('заявок', cx, cy + 12);
  return canvas.toDataURL('image/png');
}

export function renderGroupedBarsPng(
  labels: string[],
  seriesA: number[],
  seriesB: number[],
  legendA: string,
  legendB: string,
  w = 520,
  h = 200,
  fontFamily = 'sans-serif'
): string | null {
  const pack = getCanvas(w, h);
  if (!pack) return null;
  const { canvas, ctx } = pack;
  const pad = { l: 44, r: 16, t: 36, b: 36 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;
  const max = Math.max(1, ...seriesA, ...seriesB);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#0F172A';
  ctx.font = `bold 13px ${fontFamily}`;
  ctx.textAlign = 'left';
  ctx.fillText('Активность по месяцам', 16, 22);
  ctx.fillStyle = '#1E40AF';
  ctx.fillRect(16, 26, 10, 10);
  ctx.fillStyle = '#64748B';
  ctx.font = `11px ${fontFamily}`;
  ctx.fillText(legendA, 30, 35);
  ctx.fillStyle = '#38BDF8';
  ctx.fillRect(140, 26, 10, 10);
  ctx.fillStyle = '#64748B';
  ctx.fillText(legendB, 154, 35);

  const n = Math.max(labels.length, 1);
  const groupW = plotW / n;
  const barW = (groupW * 0.62) / 2;
  const gap = groupW * 0.12;
  for (let i = 0; i < n; i++) {
    const x0 = pad.l + i * groupW + gap / 2;
    const ha = (seriesA[i] ?? 0) / max;
    const hb = (seriesB[i] ?? 0) / max;
    const ya = pad.t + plotH - ha * plotH;
    const yb = pad.t + plotH - hb * plotH;
    ctx.fillStyle = 'rgba(30,64,175,0.85)';
    ctx.fillRect(x0, ya, barW, pad.t + plotH - ya);
    ctx.fillStyle = 'rgba(56,189,248,0.85)';
    ctx.fillRect(x0 + barW + 4, yb, barW, pad.t + plotH - yb);
    ctx.fillStyle = '#64748B';
    ctx.font = `10px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.fillText(labels[i] ?? '', x0 + barW + 2, h - 14);
  }
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t + plotH);
  ctx.lineTo(pad.l + plotW, pad.t + plotH);
  ctx.stroke();
  return canvas.toDataURL('image/png');
}

export function renderDualLinePng(
  labels: string[],
  lineA: number[],
  lineB: number[],
  colorA: string,
  colorB: string,
  title: string,
  w = 520,
  h = 180,
  fontFamily = 'sans-serif'
): string | null {
  const pack = getCanvas(w, h);
  if (!pack) return null;
  const { canvas, ctx } = pack;
  const pad = { l: 12, r: 12, t: 32, b: 28 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;
  const maxA = Math.max(1, ...lineA);
  const maxB = Math.max(1, ...lineB);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#0F172A';
  ctx.font = `bold 13px ${fontFamily}`;
  ctx.fillText(title, 12, 20);
  const n = Math.max(labels.length, 1);
  const pts = (arr: number[], max: number) =>
    arr.map((v, i) => {
      const x = pad.l + (i / Math.max(n - 1, 1)) * plotW;
      const y = pad.t + plotH - (v / max) * plotH;
      return { x, y };
    });
  const pa = pts(lineA, maxA);
  const pb = pts(lineB, maxB);
  ctx.strokeStyle = '#E2E8F0';
  for (let g = 0; g <= 4; g++) {
    const y = pad.t + (plotH / 4) * g;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + plotW, y);
    ctx.stroke();
  }
  const drawLine = (points: { x: number; y: number }[], color: string) => {
    if (points.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  };
  drawLine(pa, colorA);
  drawLine(pb, colorB);
  ctx.fillStyle = '#64748B';
  ctx.font = `9px ${fontFamily}`;
  ctx.textAlign = 'center';
  labels.forEach((lab, i) => {
    const x = pad.l + (i / Math.max(n - 1, 1)) * plotW;
    ctx.fillText(lab, x, h - 10);
  });
  return canvas.toDataURL('image/png');
}

export function renderSparklinePng(values: number[], w = 120, h = 40, color = '#059669'): string | null {
  const pack = getCanvas(w, h);
  if (!pack) return null;
  const { canvas, ctx } = pack;
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const range = max - min || 1;
  ctx.clearRect(0, 0, w, h);
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = (i / Math.max(values.length - 1, 1)) * (w - 4) + 2;
    const y = h - 4 - ((v - min) / range) * (h - 8);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  return canvas.toDataURL('image/png');
}
