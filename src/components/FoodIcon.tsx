/**
 * Small food pictures for ingredient lists, the pantry and the grocery list. Every ingredient gets
 * its own correct picture; one that isn't recognized gets a plain picture of its category (a
 * produce bag, a dairy carton…), never a wrong food.
 *
 *   <FoodIcon name="Red peppers" aisle="Produce" />
 *
 * Drawn here (not system icons), so they look the same on every phone and in both themes.
 */
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { useTheme } from '../theme';

import { foodKind, type FoodKind } from '../lib/foodKind';

export { foodKind };

// Palette for the pictures. They sit on a soft cream circle in both themes.
const O = '#6B3A26'; // outline
const sw = 1.4;
const ol = { stroke: O, strokeWidth: sw, strokeLinejoin: 'round', strokeLinecap: 'round' } as const;
const red = '#EF4B32';
const green = '#3FA65A';
const darkGreen = '#2B7F42';
const yellow = '#FFC933';
const orange = '#FF8A2A';
const tan = '#E3A566';
const brown = '#9A6238';
const cream = '#FFF6E8';
const white = '#FFFFFF';

/** Each picture fits a 24 × 24 box. */
const art: Record<FoodKind, ReactNode> = {
  tomato: (
    <>
      <Circle cx={12} cy={13.5} r={7.5} fill={red} {...ol} />
      <Path d="M12 6.5 L 9 5 L 10.5 7.8 L 7.6 8.8 L 12 8.8 L 16.4 8.8 L 13.5 7.8 L 15 5 Z" fill={green} {...ol} strokeWidth={1} />
      <Ellipse cx={9.3} cy={11.5} rx={1.6} ry={1} fill={white} opacity={0.6} />
    </>
  ),
  pepper: (
    <>
      <Path d="M7 9 C 4 11 5 19 9 20 C 10.5 20.5 11.5 19.5 12 19 C 12.5 19.5 13.5 20.5 15 20 C 19 19 20 11 17 9 C 15 8 13 9 12 9.5 C 11 9 9 8 7 9 Z" fill={red} {...ol} />
      <Path d="M12 9.5 C 12 7 13 5 15 4" stroke={darkGreen} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <Path d="M12 11 L 12 18" stroke="#C43420" strokeWidth={1} strokeLinecap="round" />
    </>
  ),
  carrot: (
    <>
      <Path d="M16 8 C 13 6 6 13 4.5 19.5 C 11 18 18 11 16 8 Z" fill={orange} {...ol} />
      <Path d="M8 14.5 l 1.8 1 M10.5 11.5 l 1.8 1" stroke="#D96A12" strokeWidth={1} strokeLinecap="round" />
      <Path d="M16 8 C 15 5 17 3 19 4 C 20 2 22.5 4 21 6 C 22.5 8 20 10 17.5 9 Z" fill={green} {...ol} />
    </>
  ),
  onion: (
    <>
      <Path d="M12 5 C 19 8 20 14 17 18 C 14.5 21 9.5 21 7 18 C 4 14 5 8 12 5 Z" fill="#C79BD0" {...ol} />
      <Path d="M12 8 C 10 12 10 15 12 19 M12 8 C 14 12 14 15 12 19" stroke="#9F72A8" strokeWidth={1} fill="none" />
      <Path d="M12 5 C 11.5 3.5 12 2.5 13 2" stroke={darkGreen} strokeWidth={1.6} strokeLinecap="round" fill="none" />
    </>
  ),
  garlic: (
    <>
      <Path d="M12 6 C 18 8 19.5 13 18 16.5 C 16.5 20 7.5 20 6 16.5 C 4.5 13 6 8 12 6 Z" fill={white} {...ol} />
      <Path d="M12 8 C 10 11 10 15 11 19 M12 8 C 14 11 14 15 13 19 M9 10 C 7.5 13 8 16 8.5 18.5 M15 10 C 16.5 13 16 16 15.5 18.5" stroke="#D9CFC3" strokeWidth={0.9} fill="none" />
      <Path d="M12 6 L 12 3.5" stroke={O} strokeWidth={1.4} strokeLinecap="round" />
    </>
  ),
  potato: (
    <>
      <Path d="M5 12 C 5 7 10 5 14 6 C 19 7 20 11 19 14 C 18 18 13 20 9 19 C 6 18 5 15 5 12 Z" fill="#D9A766" {...ol} />
      <Circle cx={10} cy={10} r={0.9} fill={brown} />
      <Circle cx={15} cy={12} r={0.9} fill={brown} />
      <Circle cx={11} cy={15.5} r={0.9} fill={brown} />
    </>
  ),
  mushroom: (
    <>
      <Path d="M4 12 C 4 6 20 6 20 12 Z" fill="#B97A4B" {...ol} />
      <Path d="M9.5 12 L 9 18.5 C 9 20 15 20 15 18.5 L 14.5 12 Z" fill={cream} {...ol} />
      <Circle cx={9} cy={9.5} r={1} fill={cream} />
      <Circle cx={14.5} cy={9} r={0.9} fill={cream} />
    </>
  ),
  lemon: (
    <>
      <Path d="M4 12 C 4 8 8 5.5 12 5.5 C 16 5.5 20 8 20 12 C 20 16 16 18.5 12 18.5 C 8 18.5 4 16 4 12 Z" fill="#FFD84A" {...ol} />
      <Path d="M3 12 L 4.5 12 M19.5 12 L 21 12" stroke={O} strokeWidth={1.4} strokeLinecap="round" />
      <Ellipse cx={9} cy={10} rx={2} ry={1} fill={white} opacity={0.6} />
    </>
  ),
  apple: (
    <>
      <Path d="M12 8 C 7 5 3 9 4 14 C 5 19 9 22 12 20 C 15 22 19 19 20 14 C 21 9 17 5 12 8 Z" fill={red} {...ol} />
      <Path d="M12 8 C 12 5.5 13 4 14.5 3.5" stroke={brown} strokeWidth={1.6} strokeLinecap="round" fill="none" />
      <Ellipse cx={16.2} cy={5.2} rx={2.4} ry={1.2} fill={green} {...ol} strokeWidth={1} transform="rotate(-25 16.2 5.2)" />
    </>
  ),
  strawberry: (
    <>
      <Path d="M12 21 C 5 17 4 12 6 9 C 8 7 16 7 18 9 C 20 12 19 17 12 21 Z" fill="#E8344E" {...ol} />
      <Path d="M7.5 8.5 C 9 5.5 15 5.5 16.5 8.5 C 14 10 10 10 7.5 8.5 Z" fill={green} {...ol} strokeWidth={1} />
      {[[10, 13], [14, 13], [12, 16.5], [9.5, 16], [14.5, 16]].map(([x, y]) => (
        <Circle key={`${x}-${y}`} cx={x} cy={y} r={0.7} fill={yellow} />
      ))}
    </>
  ),
  raspberry: (
    <>
      {[[9, 10], [12, 9], [15, 10], [8.5, 13.5], [12, 13], [15.5, 13.5], [10, 16.5], [14, 16.5], [12, 19]].map(([x, y]) => (
        <Circle key={`${x}-${y}`} cx={x} cy={y} r={2.4} fill="#D9325C" {...ol} strokeWidth={0.9} />
      ))}
      <Path d="M9 7 C 10 5 14 5 15 7" stroke={green} strokeWidth={1.8} fill="none" strokeLinecap="round" />
    </>
  ),
  herb: (
    <>
      <Path d="M12 21 L 12 9" stroke={darkGreen} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M12 13 C 6 13 4 9 5 6 C 9 6 12 8 12 13 Z" fill={green} {...ol} />
      <Path d="M12 11 C 18 11 20 7 19 4 C 15 4 12 6 12 11 Z" fill={green} {...ol} />
      <Path d="M12 17 C 17 17 19 14 18.5 12 C 15 12 12.5 13.5 12 17 Z" fill={green} {...ol} />
    </>
  ),
  cabbage: (
    <>
      <Circle cx={12} cy={12.5} r={8} fill="#8E5BB5" {...ol} />
      <Path d="M12 5 C 9 9 9 16 12 20.5 M7 8 C 9 12 9 16 8 19 M17 8 C 15 12 15 16 16 19" stroke="#C9A6E0" strokeWidth={1.1} fill="none" />
    </>
  ),
  peas: (
    <>
      <Path d="M3 13 C 6 7 18 7 21 11 C 18 17 6 18 3 13 Z" fill={green} {...ol} />
      <Circle cx={8} cy={12.3} r={2} fill="#9BD86E" {...ol} strokeWidth={0.9} />
      <Circle cx={12.2} cy={11.6} r={2} fill="#9BD86E" {...ol} strokeWidth={0.9} />
      <Circle cx={16.4} cy={11.4} r={2} fill="#9BD86E" {...ol} strokeWidth={0.9} />
    </>
  ),
  egg: (
    <>
      <Path d="M12 3.5 C 16 3.5 19 10 19 14.5 C 19 18.5 16 21 12 21 C 8 21 5 18.5 5 14.5 C 5 10 8 3.5 12 3.5 Z" fill={cream} {...ol} />
      <Ellipse cx={9.5} cy={10} rx={1.3} ry={2.2} fill={white} />
    </>
  ),
  milk: (
    <>
      <Path d="M7 9 L 9 4.5 L 15 4.5 L 17 9 L 17 20 C 17 21 16 21.5 15 21.5 L 9 21.5 C 8 21.5 7 21 7 20 Z" fill={white} {...ol} />
      <Rect x={9} y={2.5} width={6} height={2.5} rx={0.8} fill="#3D8BD9" {...ol} strokeWidth={1} />
      <Rect x={7} y={12} width={10} height={5} fill="#BFE3F7" />
      <Path d="M7 9 L 17 9" stroke={O} strokeWidth={1} />
    </>
  ),
  cream: (
    <>
      <Path d="M7 8 L 17 8 L 16 20 C 16 21 15 21.5 14 21.5 L 10 21.5 C 9 21.5 8 21 8 20 Z" fill={white} {...ol} />
      <Path d="M7 8 C 7 5 10 4.5 12 6 C 14 4.5 17 5 17 8 Z" fill="#FFF3D6" {...ol} />
      <Rect x={8.5} y={12} width={7} height={4} rx={1} fill="#F7D57A" />
    </>
  ),
  yogurt: (
    <>
      <Path d="M5 9 L 19 9 L 17 20 C 17 21 16 21.5 15 21.5 L 9 21.5 C 8 21.5 7 21 7 20 Z" fill={white} {...ol} />
      <Rect x={4} y={6.5} width={16} height={3} rx={1.2} fill="#7CC3E8" {...ol} />
      <Path d="M8 14 C 10 15 14 15 16 14" stroke="#7CC3E8" strokeWidth={1.4} fill="none" strokeLinecap="round" />
    </>
  ),
  butter: (
    <>
      <Path d="M3 14 L 7 9 L 21 9 L 21 15 L 17 19 L 3 19 Z" fill="#FFE07A" {...ol} />
      <Path d="M3 14 L 17 14 L 21 9 M17 14 L 17 19" stroke={O} strokeWidth={1.1} fill="none" strokeLinejoin="round" />
    </>
  ),
  cheese: (
    <>
      <Path d="M3 17 L 19 7.5 C 20 7 21 7.5 21 8.5 L 21 18 C 21 19 20 19.5 19 19.5 L 4 19.5 C 3 19.5 2.5 18 3 17 Z" fill={yellow} {...ol} />
      <Circle cx={14.5} cy={14} r={1.8} fill="#E8A800" />
      <Circle cx={9} cy={16.5} r={1.2} fill="#E8A800" />
      <Circle cx={18} cy={11} r={1.1} fill="#E8A800" />
    </>
  ),
  chicken: (
    <>
      <Path d="M15 3.5 C 20 4 22 9 19 13 C 17 16 13 17 10.5 15 C 8 13 8 8 11 5.5 C 12 4.5 13.5 3.5 15 3.5 Z" fill="#D58B54" {...ol} />
      <Path d="M10.5 14.5 L 6 19" stroke={O} strokeWidth={4.4} strokeLinecap="round" />
      <Path d="M10.5 14.5 L 6 19" stroke={cream} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={4.6} cy={18} r={2} fill={cream} {...ol} strokeWidth={1} />
      <Circle cx={6.6} cy={20.2} r={2} fill={cream} {...ol} strokeWidth={1} />
    </>
  ),
  mince: (
    <>
      <Rect x={3} y={8} width={18} height={11} rx={2.5} fill={white} {...ol} />
      <Path d="M5 13 C 6 10 9 9.5 12 10 C 15 9.5 18 10 19 13 C 18 16.5 6 16.5 5 13 Z" fill="#D9705A" {...ol} strokeWidth={1} />
      <Path d="M8 12.5 q1 -1 2 0 M12 13.5 q1 -1 2 0 M14.5 11.5 q1 -1 2 0" stroke="#A84836" strokeWidth={0.9} fill="none" strokeLinecap="round" />
    </>
  ),
  fish: (
    <>
      <Path d="M3 12 C 7 6 15 6 18 12 C 15 18 7 18 3 12 Z" fill="#F29A7A" {...ol} />
      <Path d="M18 12 L 22 8 L 22 16 Z" fill="#F29A7A" {...ol} />
      <Circle cx={7} cy={11} r={1} fill={O} />
    </>
  ),
  penne: (
    <>
      <G transform="rotate(-30 12 12)">
        <Path d="M5 9 L 17 9 L 19 15 L 7 15 Z" fill={yellow} {...ol} />
        <Path d="M9 9 L 11 15 M13 9 L 15 15" stroke="#E8A800" strokeWidth={1} />
        <Ellipse cx={18} cy={12} rx={1.2} ry={3} fill="#E8A800" {...ol} strokeWidth={1} />
      </G>
    </>
  ),
  spaghetti: (
    <>
      <Ellipse cx={12} cy={15} rx={9} ry={5.5} fill={white} {...ol} />
      <Path d="M5 14 C 8 10 11 18 14 13 C 16 10 18 14 19 13 M6 16 C 9 13 12 19 15 15 C 17 13 18 16 19 15.5" stroke="#E8A800" strokeWidth={1.5} fill="none" strokeLinecap="round" />
      <Path d="M15 12 L 20 3" stroke={O} strokeWidth={1.4} strokeLinecap="round" />
    </>
  ),
  rice: (
    <>
      <Path d="M3.5 12 C 4 19 20 19 20.5 12 Z" fill="#E8F1F7" {...ol} />
      <Path d="M5 12 C 6 7 18 7 19 12 Z" fill={white} {...ol} />
      {[[9, 9.5], [12, 8.5], [15, 9.5], [10.5, 11], [13.5, 11]].map(([x, y]) => (
        <Ellipse key={`${x}-${y}`} cx={x} cy={y} rx={1.1} ry={0.6} fill="#D9D2C6" />
      ))}
      <Path d="M4 14.5 L 20 14.5" stroke="#3D8BD9" strokeWidth={1.4} />
    </>
  ),
  flour: (
    <>
      <Path d="M6 7 C 5 12 5 17 6 21 L 18 21 C 19 17 19 12 18 7 Z" fill={cream} {...ol} />
      <Path d="M6 7 L 8 4 L 10 6 L 12 3.5 L 14 6 L 16 4 L 18 7 Z" fill={cream} {...ol} />
      <Path d="M9 13 C 10 11 14 11 15 13 M12 11.5 L 12 17" stroke={tan} strokeWidth={1.3} fill="none" strokeLinecap="round" />
      <Path d="M10 16 l 2 -1.5 l 2 1.5" stroke={tan} strokeWidth={1.2} fill="none" strokeLinecap="round" />
    </>
  ),
  sugar: (
    <>
      <Path d="M5 10 L 11 8 L 11 14 L 5 16 Z" fill={white} {...ol} />
      <Path d="M11 8 L 16 10 L 16 16 L 11 14 Z" fill="#EDE6DC" {...ol} />
      <Path d="M5 10 L 10 12 L 16 10" fill="none" stroke={O} strokeWidth={1} />
      <Path d="M12 15 L 18 13 L 18 19 L 12 21 Z" fill={white} {...ol} />
      <Path d="M18 13 L 21 14.5 L 21 20.5 L 18 19 Z" fill="#EDE6DC" {...ol} />
    </>
  ),
  cocoa: (
    <>
      <Rect x={6} y={6} width={12} height={15} rx={2} fill="#7A4A2A" {...ol} />
      <Rect x={5.5} y={4} width={13} height={3.5} rx={1.2} fill="#B97A4B" {...ol} />
      <Rect x={8.5} y={11} width={7} height={5.5} rx={1} fill={cream} />
      <Circle cx={12} cy={13.7} r={1.5} fill="#7A4A2A" />
    </>
  ),
  oil: (
    <>
      <Path d="M10 3 L 14 3 L 14 8 C 17 9.5 17.5 11 17.5 13 L 17.5 19.5 C 17.5 20.5 16.5 21.5 15.5 21.5 L 8.5 21.5 C 7.5 21.5 6.5 20.5 6.5 19.5 L 6.5 13 C 6.5 11 7 9.5 10 8 Z" fill="#C6D24A" {...ol} />
      <Rect x={9.5} y={1.8} width={5} height={2.6} rx={0.8} fill={brown} {...ol} strokeWidth={1} />
      <Rect x={8.5} y={13} width={7} height={5} rx={1} fill={cream} />
    </>
  ),
  soy: (
    <>
      <Path d="M10 3 L 14 3 L 14 7 C 17 8.5 17.5 10 17.5 12 L 17.5 19.5 C 17.5 20.5 16.5 21.5 15.5 21.5 L 8.5 21.5 C 7.5 21.5 6.5 20.5 6.5 19.5 L 6.5 12 C 6.5 10 7 8.5 10 7 Z" fill="#3B2418" {...ol} />
      <Rect x={9.5} y={1.8} width={5} height={2.6} rx={0.8} fill={red} {...ol} strokeWidth={1} />
      <Rect x={8.5} y={12} width={7} height={5} rx={1} fill={red} />
    </>
  ),
  passata: (
    <>
      <Path d="M8 6 L 16 6 L 16 8 C 18 9 18.5 10 18.5 12 L 18.5 20 C 18.5 21 17.5 21.5 16.5 21.5 L 7.5 21.5 C 6.5 21.5 5.5 21 5.5 20 L 5.5 12 C 5.5 10 6 9 8 8 Z" fill="#D9322A" {...ol} />
      <Rect x={7.5} y={3} width={9} height={3.5} rx={1} fill={yellow} {...ol} strokeWidth={1} />
      <Circle cx={12} cy={14.5} r={3} fill={red} stroke={white} strokeWidth={1} />
    </>
  ),
  spice: (
    <>
      <Rect x={7} y={9} width={10} height={12.5} rx={2.5} fill="#E4A33A" {...ol} />
      <Path d="M7 9 C 7 5.5 9 3.5 12 3.5 C 15 3.5 17 5.5 17 9 Z" fill={cream} {...ol} />
      <Circle cx={10} cy={6.5} r={0.7} fill={brown} />
      <Circle cx={12} cy={5.4} r={0.7} fill={brown} />
      <Circle cx={14} cy={6.5} r={0.7} fill={brown} />
      <Rect x={9} y={13} width={6} height={4.5} rx={1} fill={cream} />
    </>
  ),
  cinnamon: (
    <>
      <Rect x={5} y={6} width={5} height={14} rx={2.4} fill="#B5652E" {...ol} transform="rotate(-20 7.5 13)" />
      <Rect x={13} y={5} width={5} height={14} rx={2.4} fill="#B5652E" {...ol} transform="rotate(15 15.5 12)" />
    </>
  ),
  vanilla: (
    <>
      <Path d="M5 20 C 8 15 14 8 19 4" stroke={O} strokeWidth={4} fill="none" strokeLinecap="round" />
      <Path d="M5 20 C 8 15 14 8 19 4" stroke="#4A2C1C" strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <Path d="M12 10 C 15 9 18 11 19 14 C 16 15 13 13 12 10 Z" fill={cream} {...ol} />
    </>
  ),
  bread: (
    <>
      <Path d="M4 11 C 2 7 6 4.5 12 4.5 C 18 4.5 22 7 20 11 L 20 18.5 C 20 19.5 19 20 18 20 L 6 20 C 5 20 4 19.5 4 18.5 Z" fill={tan} {...ol} />
      <Path d="M8 9 L 9.5 12 M12 8.5 L 13.5 11.5 M16 9 L 17.5 12" stroke="#B9763C" strokeWidth={1.4} strokeLinecap="round" />
    </>
  ),
  bun: (
    <>
      <Path d="M4 13 C 4 7 20 7 20 13 Z" fill={tan} {...ol} />
      <Rect x={4} y={14} width={16} height={5} rx={2} fill={tan} {...ol} />
      {[[9, 10], [12, 9], [15, 10]].map(([x, y]) => (
        <Ellipse key={x} cx={x} cy={y} rx={0.8} ry={0.4} fill={cream} />
      ))}
      <Path d="M3.5 13.5 L 20.5 13.5" stroke={green} strokeWidth={1.4} strokeLinecap="round" />
    </>
  ),
  pastry: (
    <>
      <Path d="M3 14 C 4 9 8 7 12 7 C 16 7 20 9 21 14 C 18 13 16 15 12 15 C 8 15 6 13 3 14 Z" fill="#F0B562" {...ol} />
      <Path d="M8 8.5 C 9 11 9 13 8.5 14.5 M12 7 L 12 15 M16 8.5 C 15 11 15 13 15.5 14.5" stroke="#C88433" strokeWidth={1.1} fill="none" />
    </>
  ),
  cake: (
    <>
      <Path d="M4 11 L 20 8 L 20 18 L 4 18 Z" fill="#FFE2B8" {...ol} />
      <Path d="M4 11 L 20 8 L 20 11.5 L 4 14 Z" fill="#F7A6B8" {...ol} strokeWidth={1} />
      <Circle cx={15} cy={6.5} r={2} fill={red} {...ol} strokeWidth={1} />
    </>
  ),
  dough: (
    <>
      <Ellipse cx={12} cy={14} rx={8} ry={6} fill="#F6E1BE" {...ol} />
      <Path d="M8 12 C 9 11 10 11 11 12" stroke="#D9B98A" strokeWidth={1.1} fill="none" strokeLinecap="round" />
      <Path d="M3 20.5 L 21 20.5" stroke={O} strokeWidth={1.4} strokeLinecap="round" />
    </>
  ),
  batter: (
    <>
      <Path d="M3.5 11 C 4 19 20 19 20.5 11 Z" fill="#9CC3E0" {...ol} />
      <Path d="M5 11 C 7 9 17 9 19 11 C 17 12.5 7 12.5 5 11 Z" fill="#F6E1BE" {...ol} strokeWidth={1} />
      <Path d="M14 11 L 19 3" stroke={O} strokeWidth={1.4} strokeLinecap="round" />
    </>
  ),
  coffee: (
    <>
      <Ellipse cx={9} cy={12} rx={4.5} ry={6} fill="#6B3A1F" {...ol} transform="rotate(-20 9 12)" />
      <Path d="M8 7 C 10 10 8 14 10 17" stroke="#3B1F10" strokeWidth={1.1} fill="none" transform="rotate(-20 9 12)" />
      <Ellipse cx={16} cy={13} rx={4} ry={5.5} fill="#7A4627" {...ol} transform="rotate(20 16 13)" />
      <Path d="M15 8.5 C 17 11 15 15 17 17.5" stroke="#3B1F10" strokeWidth={1.1} fill="none" transform="rotate(20 16 13)" />
    </>
  ),
  mayo: (
    <>
      <Rect x={6} y={8} width={12} height={13.5} rx={3} fill={white} {...ol} />
      <Rect x={5.5} y={4.5} width={13} height={4} rx={1.4} fill="#3D8BD9" {...ol} strokeWidth={1} />
      <Rect x={8.5} y={12} width={7} height={5} rx={1} fill="#FFE59A" />
    </>
  ),
  honey: (
    <>
      <Rect x={6} y={8} width={12} height={13.5} rx={3} fill="#F4B23A" {...ol} />
      <Rect x={5.5} y={4.5} width={13} height={4} rx={1.4} fill={cream} {...ol} strokeWidth={1} />
      <Path d="M8.5 12 L 15.5 12" stroke="#D98D12" strokeWidth={1.4} strokeLinecap="round" />
    </>
  ),
  // Neutral pictures for an aisle
  produce: (
    <>
      <Path d="M5 9 L 19 9 L 17.5 20 C 17.3 21 16.5 21.5 15.5 21.5 L 8.5 21.5 C 7.5 21.5 6.7 21 6.5 20 Z" fill="#DCC5A1" {...ol} />
      <Path d="M9 9 C 8 5 11 3 12 3 C 13 3 16 5 15 9" fill={green} {...ol} />
    </>
  ),
  dairy: (
    <>
      <Path d="M7 9 L 9 4.5 L 15 4.5 L 17 9 L 17 20 C 17 21 16 21.5 15 21.5 L 9 21.5 C 8 21.5 7 21 7 20 Z" fill={white} {...ol} />
      <Path d="M7 9 L 17 9" stroke={O} strokeWidth={1} />
      <Rect x={9} y={12} width={6} height={5} rx={1} fill="#E9DFD2" />
    </>
  ),
  meat: (
    <>
      <Path d="M4 12 C 4 7 11 5 16 6 C 21 7 21 13 18 16 C 15 19 7 19 5 16 C 4.5 15 4 13.5 4 12 Z" fill="#D9705A" {...ol} />
      <Path d="M8 11 C 10 9 14 9 16 11" stroke={cream} strokeWidth={1.4} fill="none" strokeLinecap="round" />
    </>
  ),
  bakery: (
    <>
      <Path d="M12 21 L 12 6" stroke={brown} strokeWidth={1.4} strokeLinecap="round" />
      {[8, 11, 14].map((y) => (
        <G key={y}>
          <Ellipse cx={10} cy={y} rx={2} ry={1.2} fill={tan} {...ol} strokeWidth={0.9} transform={`rotate(-35 10 ${y})`} />
          <Ellipse cx={14} cy={y} rx={2} ry={1.2} fill={tan} {...ol} strokeWidth={0.9} transform={`rotate(35 14 ${y})`} />
        </G>
      ))}
    </>
  ),
  pantry: (
    <>
      <Rect x={6} y={8} width={12} height={13.5} rx={3} fill="#E8D3B4" {...ol} />
      <Rect x={5.5} y={4.5} width={13} height={4} rx={1.4} fill={brown} {...ol} strokeWidth={1} />
      <Rect x={8.5} y={12} width={7} height={5} rx={1} fill={cream} />
    </>
  ),
  basket: (
    <>
      <Path d="M4 10 L 20 10 L 18.5 19.5 C 18.3 20.5 17.5 21 16.5 21 L 7.5 21 C 6.5 21 5.7 20.5 5.5 19.5 Z" fill={tan} {...ol} />
      <Path d="M8 10 C 8 6 10 4 12 4 C 14 4 16 6 16 10" stroke={O} strokeWidth={1.6} fill="none" strokeLinecap="round" />
    </>
  ),
};

/** The picture on a soft round background. `size` is the whole circle. */
export function FoodIcon({ name, aisle, size = 32, bare = false }: { name: string; aisle?: string; size?: number; /** No background circle (inside chips). */ bare?: boolean }) {
  const t = useTheme();
  const glyph = bare ? size : Math.round(size * 0.7);
  const svg = (
    <Svg width={glyph} height={glyph} viewBox="0 0 24 24">
      {art[foodKind(name, aisle)]}
    </Svg>
  );
  if (bare) return svg;
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.isDark ? '#F8ECDB' : t.colors.fill, alignItems: 'center', justifyContent: 'center' }}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {svg}
    </View>
  );
}
