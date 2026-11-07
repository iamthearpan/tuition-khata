import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Custom icon set, drawn on a 24x24 grid with round caps/joins.
type Shape = { d: string } | { c: [number, number, number]; fill?: boolean } | { r: [number, number, number, number, number] };

const ICONS = {
  home: [{ d: 'M3.5 11.2 12 4l8.5 7.2' }, { d: 'M5.8 9.8v8.9a1.3 1.3 0 0 0 1.3 1.3H10v-5.2h4V20h2.9a1.3 1.3 0 0 0 1.3-1.3V9.8' }],
  students: [{ c: [9, 8.2, 3.3] }, { d: 'M3 20c0-3.4 2.7-5.6 6-5.6s6 2.2 6 5.6' }, { d: 'M15.6 5.1a3.2 3.2 0 0 1 0 6' }, { d: 'M18 14.7c1.8.6 3 2.4 3 5.3' }],
  batches: [{ d: 'M4 5.6A1.6 1.6 0 0 1 5.6 4H19v12.5H5.6A1.6 1.6 0 0 0 4 18.1V5.6Z' }, { d: 'M4 18.1A1.9 1.9 0 0 0 5.9 20H19v-3.5' }, { d: 'M8.5 8.5h6' }],
  settings: [{ d: 'M4 7h8.2M17.8 7H20' }, { c: [15, 7, 2.6] }, { d: 'M4 17h2.2M11.8 17H20' }, { c: [9, 17, 2.6] }],
  plus: [{ d: 'M12 5v14M5 12h14' }],
  back: [{ d: 'M14.5 5 7.5 12l7 7' }],
  chevron: [{ d: 'M9.5 5l7 7-7 7' }],
  check: [{ d: 'M5 12.6 9.8 17.4 19 7.6' }],
  search: [{ c: [11, 11, 6.5] }, { d: 'M20 20l-4.4-4.4' }],
  trash: [{ d: 'M4.5 7h15' }, { d: 'M9.5 7V5.2c0-.7.5-1.2 1.2-1.2h2.6c.7 0 1.2.5 1.2 1.2V7' }, { d: 'M6.8 7l.9 11.6c.1.8.7 1.4 1.5 1.4h5.6c.8 0 1.4-.6 1.5-1.4L17.2 7' }],
  edit: [{ d: 'M4 20h3.8L19.2 8.6a1.9 1.9 0 0 0 0-2.7l-1.1-1.1a1.9 1.9 0 0 0-2.7 0L4 16.2V20Z' }, { d: 'M13.6 6.6l3.8 3.8' }],
  phone: [{ d: 'M6.6 4h2.7l1.5 3.9-1.9 1.3a11.2 11.2 0 0 0 5.9 5.9l1.3-1.9 3.9 1.5v2.7a2.1 2.1 0 0 1-2.2 2.1A14.4 14.4 0 0 1 4.5 6.2 2.1 2.1 0 0 1 6.6 4Z' }],
  whatsapp: [{ d: 'M12 3.6a8.4 8.4 0 0 0-7.2 12.7L3.6 20.4l4.2-1.1A8.4 8.4 0 1 0 12 3.6Z' }, { d: 'M9.2 8.8c.2 2.7 2.4 4.9 5.1 5.2l.9-1.3-1.7-.9-.8.7a4.2 4.2 0 0 1-1.7-1.7l.7-.8-.8-1.7-1.7.5Z' }],
  sms: [{ d: 'M5.2 4.8h13.6a1.4 1.4 0 0 1 1.4 1.4v8.6a1.4 1.4 0 0 1-1.4 1.4h-7.1L7.4 19.6v-3.4H5.2a1.4 1.4 0 0 1-1.4-1.4V6.2a1.4 1.4 0 0 1 1.4-1.4Z' }, { d: 'M8 9.2h8M8 12h5' }],
  rupee: [{ d: 'M7 5h10M7 9h10' }, { d: 'M8 5c4.4 0 6 2 6 4s-1.9 4.1-6 4.1l7 6.4' }],
  calendar: [{ r: [4, 5.5, 16, 14.5, 3] }, { d: 'M4 10.2h16M8.5 3.6v3.6M15.5 3.6v3.6' }],
  clock: [{ c: [12, 12, 8.4] }, { d: 'M12 7.6V12l3 2' }],
  user: [{ c: [12, 8, 3.6] }, { d: 'M5 20c0-3.7 3.1-6.1 7-6.1s7 2.4 7 6.1' }],
  download: [{ d: 'M12 4v10.5M7.6 10.4 12 14.8l4.4-4.4' }, { d: 'M5 19.4h14' }],
  upload: [{ d: 'M12 14.8V4.3M7.6 8.7 12 4.3l4.4 4.4' }, { d: 'M5 19.4h14' }],
  cloud: [{ d: 'M7 18a4 4 0 0 1-.6-7.96A5.5 5.5 0 0 1 17.2 8.6 4.7 4.7 0 0 1 17.5 18H7Z' }, { d: 'M12 15.5v-5M9.9 12.4 12 10.3l2.1 2.1' }],
  shield: [{ d: 'M12 3.4 19.2 6v5.6c0 4.3-3 7.3-7.2 9-4.2-1.7-7.2-4.7-7.2-9V6L12 3.4Z' }, { d: 'M8.9 12l2.2 2.2L15.2 10' }],
  globe: [{ c: [12, 12, 8.4] }, { d: 'M3.6 12h16.8' }, { d: 'M12 3.6c2.5 2.4 3.7 5.2 3.7 8.4s-1.2 6-3.7 8.4c-2.5-2.4-3.7-5.2-3.7-8.4S9.5 6 12 3.6Z' }],
  info: [{ c: [12, 12, 8.4] }, { d: 'M12 11.2v5' }, { c: [12, 8, 0.6], fill: true }],
  chart: [{ d: 'M4 4v15.5a.5.5 0 0 0 .5.5H20' }, { d: 'M8 16v-4.5M12.2 16V8M16.4 16v-6.5' }],
  trend: [{ d: 'M4 16.5 9.2 11.3l3.6 3.6L20 7.6' }, { d: 'M15 7.5h5V12.5' }],
  wallet: [{ d: 'M4.5 7.2A2.2 2.2 0 0 1 6.7 5H18v3' }, { r: [4.5, 8, 15, 11.5, 2.5] }, { c: [16, 13.8, 1], fill: true }],
  tag: [{ d: 'M4 12.2V5.6A1.6 1.6 0 0 1 5.6 4h6.6l7.6 7.6a1.6 1.6 0 0 1 0 2.2l-6 6a1.6 1.6 0 0 1-2.2 0L4 12.2Z' }, { c: [8.4, 8.4, 1.2], fill: true }],
  sparkle: [{ d: 'M12 4l1.7 4.8L18.5 10.5l-4.8 1.7L12 17l-1.7-4.8L5.5 10.5l4.8-1.7L12 4Z' }],
} satisfies Record<string, Shape[]>;

export type IconName = keyof typeof ICONS;

export default function Icon({
  name, size = 24, color = '#0F1F1A', strokeWidth = 1.9,
}: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  const shapes: Shape[] = ICONS[name];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {shapes.map((s, i) => {
        if ('d' in s) {
          return <Path key={i} d={s.d} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />;
        }
        if ('c' in s) {
          return s.fill
            ? <Circle key={i} cx={s.c[0]} cy={s.c[1]} r={s.c[2]} fill={color} />
            : <Circle key={i} cx={s.c[0]} cy={s.c[1]} r={s.c[2]} stroke={color} strokeWidth={strokeWidth} />;
        }
        const [x, y, w, h, rx] = s.r;
        return <Rect key={i} x={x} y={y} width={w} height={h} rx={rx} stroke={color} strokeWidth={strokeWidth} />;
      })}
    </Svg>
  );
}
