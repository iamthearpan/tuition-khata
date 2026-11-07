import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme';
import { compactAmount } from '../currency';

export interface BarDatum { label: string; value: number; ghost?: number; highlight?: boolean }

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * p;
}


/** Monotone cubic curve through points: smooth, and never overshoots below/above the data. */
function smoothPath(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  if (n === 0) return '';
  if (n === 1) return `M${pts[0].x} ${pts[0].y}`;
  const dx: number[] = [], m: number[] = [], t: number[] = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) { dx.push(pts[i + 1].x - pts[i].x); m.push((pts[i + 1].y - pts[i].y) / (dx[i] || 1)); }
  t[0] = m[0]; t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], h = a * a + b * b;
    if (h > 9) { const k = 3 / Math.sqrt(h); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const c = dx[i] / 3;
    d += ` C${(pts[i].x + c).toFixed(1)} ${(pts[i].y + t[i] * c).toFixed(1)} ${(pts[i + 1].x - c).toFixed(1)} ${(pts[i + 1].y - t[i + 1] * c).toFixed(1)} ${pts[i + 1].x.toFixed(1)} ${pts[i + 1].y.toFixed(1)}`;
  }
  return d;
}

/** Vertical bars (solid = value, pale = ghost target) with grid, optional average line, tap to select. */
export function BarChart({
  data, currency, height = 190, average, selected, onSelect,
}: {
  data: BarDatum[]; currency: string; height?: number; average?: number;
  selected?: number | null; onSelect?: (i: number) => void;
}) {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const left = 40, right = 6, top = 10, bottom = 24;
  const max = niceMax(Math.max(...data.map(d => Math.max(d.value, d.ghost ?? 0)), average ?? 0));
  const ch = height - top - bottom;
  const cw = Math.max(0, w - left - right);
  const slot = data.length ? cw / data.length : 0;
  const bw = Math.max(4, Math.min(26, slot * 0.58));
  const longest = Math.max(1, ...data.map(d => d.label.length));
  const step = Math.max(1, Math.ceil((longest * 6.4 + 6) / Math.max(1, slot)));
  const showLabel = (i: number) => (data.length - 1 - i) % step === 0;
  const y = (v: number) => top + ch - (v / max) * ch;
  const ticks = [0, 0.5, 1].map(f => f * max);
  return (
    <View onLayout={onLayout} style={{ height }}>
      {w > 0 && (
        <Svg width={w} height={height}>
          {ticks.map((t, i) => (
            <React.Fragment key={i}>
              <Line x1={left} x2={w - right} y1={y(t)} y2={y(t)} stroke={colors.border} strokeWidth={1} strokeDasharray={i === 0 ? undefined : '3,4'} />
              <SvgText x={left - 6} y={y(t) + 3.5} fontSize={10} fill={colors.muted} textAnchor="end">{compactAmount(t, currency)}</SvgText>
            </React.Fragment>
          ))}
          {data.map((d, i) => {
            const x = left + slot * i + (slot - bw) / 2;
            const sel = selected === i;
            const dim = selected != null && !sel;
            return (
              <React.Fragment key={i}>
                {d.ghost ? <Rect x={x} y={y(d.ghost)} width={bw} height={Math.max(0, top + ch - y(d.ghost))} rx={bw / 2} fill={colors.primaryLight} /> : null}
                {d.value > 0 ? (
                  <Rect x={x} y={y(d.value)} width={bw} height={Math.max(bw / 2, top + ch - y(d.value))} rx={bw / 2}
                    fill={d.highlight ? colors.accent : colors.primary} opacity={dim ? 0.35 : 1} />
                ) : null}
                {d.label && showLabel(i) ? <SvgText x={x + bw / 2} y={height - 7} fontSize={10} fill={sel ? colors.primary : colors.muted} fontWeight={sel ? '700' : '400'} textAnchor="middle">{d.label}</SvgText> : null}
              </React.Fragment>
            );
          })}
          {average && average > 0 ? (
            <Line x1={left} x2={w - right} y1={y(average)} y2={y(average)} stroke={colors.danger} strokeWidth={1.4} strokeDasharray="5,4" />
          ) : null}
        </Svg>
      )}
      {w > 0 && onSelect ? (
        <View style={{ position: 'absolute', left, top: 0, width: cw, height, flexDirection: 'row' }}>
          {data.map((_, i) => (
            <Pressable key={i} style={{ flex: 1 }} onPress={() => onSelect(i)} accessibilityRole="button" accessibilityLabel={data[i].label} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Smooth-ish line with dots for a percentage series (0..max). */
export function LineChart({
  values, labels, height = 150, color = colors.primary, suffix = '%', selected, onSelect,
}: {
  values: number[]; labels: string[]; height?: number; color?: string; suffix?: string;
  selected?: number | null; onSelect?: (i: number) => void;
}) {
  const [w, setW] = useState(0);
  const left = 44, right = 14, top = 10, bottom = 24;
  const max = Math.max(100, niceMax(Math.max(...values, 0)));
  const ch = height - top - bottom;
  const cw = Math.max(0, w - left - right);
  const n = values.length;
  const x = (i: number) => left + 10 + (n <= 1 ? (cw - 20) / 2 : ((cw - 20) * i) / (n - 1));
  const y = (v: number) => top + ch - (Math.min(v, max) / max) * ch;
  const longest = Math.max(1, ...labels.map(l => l.length));
  const step = Math.max(1, Math.ceil((longest * 6.4 + 6) / Math.max(1, n <= 1 ? cw : (cw - 20) / (n - 1))));
  const path = smoothPath(values.map((v, i) => ({ x: x(i), y: y(v) })));
  const area = n > 1 ? `${path} L${x(n - 1).toFixed(1)} ${top + ch} L${x(0).toFixed(1)} ${top + ch} Z` : '';
  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ height }}>
      {w > 0 && (
        <Svg width={w} height={height}>
          {[0, 0.5, 1].map((f, i) => (
            <React.Fragment key={i}>
              <Line x1={left} x2={w - right} y1={y(f * max)} y2={y(f * max)} stroke={colors.border} strokeWidth={1} strokeDasharray={i === 0 ? undefined : '3,4'} />
              <SvgText x={left - 6} y={y(f * max) + 3.5} fontSize={10} fill={colors.muted} textAnchor="end">{`${Math.round(f * max)}${suffix}`}</SvgText>
            </React.Fragment>
          ))}
          <Defs>
            <LinearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.28} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {area ? <Path d={area} fill="url(#lg)" /> : null}
          <Path d={path} stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {selected != null && values[selected] != null ? (
            <>
              <Circle cx={x(selected)} cy={y(values[selected])} r={10} fill={color} opacity={0.15} />
              <Circle cx={x(selected)} cy={y(values[selected])} r={5} fill="#fff" stroke={color} strokeWidth={3} />
            </>
          ) : null}
          {labels.map((l, i) => (l && (n - 1 - i) % step === 0 ? <SvgText key={i} x={x(i)} y={height - 7} fontSize={10} fill={colors.muted} textAnchor="middle">{l}</SvgText> : null))}
        </Svg>
      )}
      {w > 0 && onSelect ? (
        <View style={{ position: 'absolute', left: left - 8, top: 0, width: cw + 16, height, flexDirection: 'row' }}>
          {values.map((_, i) => <Pressable key={i} style={{ flex: 1 }} onPress={() => onSelect(i)} />)}
        </View>
      ) : null}
    </View>
  );
}

/** Horizontal bar row: label, value text and a proportional fill. */
export function HBar({ label, valueText, ratio, color = colors.primary, sub }: {
  label: string; valueText: string; ratio: number; color?: string; sub?: string;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
        <Text style={{ flex: 1, color: colors.text, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{label}</Text>
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14 }}>{valueText}</Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.bg, overflow: 'hidden' }}>
        <View style={{ width: `${Math.max(0, Math.min(1, ratio)) * 100}%`, height: 8, borderRadius: 4, backgroundColor: color }} />
      </View>
      {sub ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>{sub}</Text> : null}
    </View>
  );
}

/** One stacked horizontal bar split into coloured segments. */
export function StackBar({ parts }: { parts: { value: number; color: string }[] }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  return (
    <View style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', backgroundColor: colors.bg }}>
      {total > 0 ? parts.filter(p => p.value > 0).map((p, i) => <View key={i} style={{ flex: p.value / total, backgroundColor: p.color }} />) : null}
    </View>
  );
}
