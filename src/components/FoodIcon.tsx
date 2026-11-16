/**
 * Small, flat food pictures for ingredient lists, the pantry and the grocery aisles.
 * Drawn here (not system icons), so they look the same on every phone and in both themes.
 *
 *   <FoodIcon name="Chicken thighs" aisle="Meat & Fish" />
 */
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { useTheme } from '../theme';

type Kind = 'leaf' | 'tomato' | 'carrot' | 'onion' | 'berry' | 'apple' | 'egg' | 'milk' | 'cheese' | 'butter' | 'meat' | 'bread' | 'grain' | 'pasta' | 'jar' | 'spice' | 'oil' | 'sweet' | 'basket';

/** First match wins; the aisle decides when no word matches. */
const words: [RegExp, Kind][] = [
  [/tomato|passata|pepper/i, 'tomato'],
  [/carrot|potato/i, 'carrot'],
  [/onion|garlic|mushroom/i, 'onion'],
  [/berr|raspberr/i, 'berry'],
  [/apple|lemon|lime|orange/i, 'apple'],
  [/egg/i, 'egg'],
  [/cheese|feta|mozzarella|parmesan|cheddar/i, 'cheese'],
  [/butter/i, 'butter'],
  [/milk|cream|yogurt|mayo/i, 'milk'],
  [/chicken|beef|pork|lamb|mince|fish|salmon|meat/i, 'meat'],
  [/spaghetti|penne|pasta|noodle/i, 'pasta'],
  [/rice|flour|batter|dough|oat/i, 'grain'],
  [/bread|bun|pastry|cake|sponge/i, 'bread'],
  [/oil|sauce|vinegar|extract/i, 'oil'],
  [/sugar|cocoa|chocolate|honey|coffee/i, 'sweet'],
  [/masala|cumin|mustard|saffron|turmeric|cinnamon|salt|spice|seed/i, 'spice'],
  [/basil|cabbage|peas|spinach|lettuce|herb|coriander|parsley/i, 'leaf'],
];
const byAisle: Record<string, Kind> = { Produce: 'leaf', Bakery: 'bread', 'Meat & Fish': 'meat', 'Dairy & Eggs': 'milk', Pantry: 'jar', Other: 'basket' };

export function foodKind(name: string, aisle?: string): Kind {
  for (const [re, kind] of words) if (re.test(name)) return kind;
  return (aisle && byAisle[aisle]) || 'basket';
}

const green = '#3FA65A';
const red = '#F2431F';
const yellow = '#FFC933';
const tan = '#E3A566';
const brown = '#9A6238';
const cream = '#FFF6E8';

/** Each picture fits a 24 × 24 box. */
const art: Record<Kind, ReactNode> = {
  leaf: (
    <>
      <Path d="M5 19 C 4 9 10 4 20 4 C 20 14 15 20 5 19 Z" fill={green} />
      <Path d="M6 18 L 15 9" stroke="#2B7F42" strokeWidth={1.8} strokeLinecap="round" />
    </>
  ),
  tomato: (
    <>
      <Circle cx={12} cy={13.5} r={8} fill={red} />
      <Path d="M12 7.5 L 8.5 5.5 L 10.5 8.5 L 7.5 9.5 L 12 9.5 L 16.5 9.5 L 13.5 8.5 L 15.5 5.5 Z" fill={green} />
    </>
  ),
  carrot: (
    <>
      <Path d="M8 9 C 12 7 17 11 15 15 L 6 21 C 4 22 3 20 4 19 Z" fill="#FF9838" transform="rotate(-8 12 12)" />
      <Path d="M14 9 C 13 5 16 3 18 4 C 20 3 22 6 20 8 C 21 10 18 12 16 10 Z" fill={green} />
    </>
  ),
  onion: (
    <>
      <Path d="M12 5 C 19 8 20 14 17 18 C 14 21 10 21 7 18 C 4 14 5 8 12 5 Z" fill="#C9A0D0" />
      <Path d="M12 5 C 11 3 12 2 13 2" stroke={green} strokeWidth={2} strokeLinecap="round" fill="none" />
      <Path d="M12 8 C 10 12 10 15 12 19" stroke="#A97BB3" strokeWidth={1.6} strokeLinecap="round" fill="none" />
    </>
  ),
  berry: (
    <>
      <Path d="M12 21 C 5 17 4 12 6 9 C 8 7 16 7 18 9 C 20 12 19 17 12 21 Z" fill="#E8344E" />
      <Path d="M7.5 8 C 9 5 15 5 16.5 8 C 14 9.5 10 9.5 7.5 8 Z" fill={green} />
      <Circle cx={10} cy={13} r={0.9} fill={cream} />
      <Circle cx={14} cy={13} r={0.9} fill={cream} />
      <Circle cx={12} cy={16.5} r={0.9} fill={cream} />
    </>
  ),
  apple: (
    <>
      <Path d="M12 8 C 7 5 3 9 4 14 C 5 19 9 22 12 20 C 15 22 19 19 20 14 C 21 9 17 5 12 8 Z" fill={red} />
      <Path d="M12 8 C 12 5 13 4 15 3" stroke={brown} strokeWidth={1.8} strokeLinecap="round" fill="none" />
      <Ellipse cx={16.5} cy={5} rx={2.6} ry={1.4} fill={green} transform="rotate(-25 16.5 5)" />
    </>
  ),
  egg: (
    <>
      <Path d="M12 3 C 16 3 19.5 10 19.5 14.5 C 19.5 18.5 16 21.5 12 21.5 C 8 21.5 4.5 18.5 4.5 14.5 C 4.5 10 8 3 12 3 Z" fill={cream} />
      <Circle cx={12} cy={14.5} r={4} fill={yellow} />
    </>
  ),
  milk: (
    <>
      <Path d="M7 9 L 9.5 4 L 14.5 4 L 17 9 L 17 20 C 17 21 16 21.5 15 21.5 L 9 21.5 C 8 21.5 7 21 7 20 Z" fill={cream} />
      <Rect x={9.5} y={2.5} width={5} height={3} rx={1} fill={red} />
      <Rect x={7} y={12} width={10} height={5} fill="#BFE3F7" />
    </>
  ),
  cheese: (
    <>
      <Path d="M3 17 L 20 7 C 21 6.5 22 7 22 8 L 22 18 C 22 19 21 19.5 20 19.5 L 4 19.5 C 3 19.5 2.5 18 3 17 Z" fill={yellow} />
      <Circle cx={15} cy={14} r={1.8} fill="#E8A800" />
      <Circle cx={9.5} cy={16.5} r={1.3} fill="#E8A800" />
      <Circle cx={18.5} cy={10.5} r={1.1} fill="#E8A800" />
    </>
  ),
  butter: (
    <>
      <Rect x={3} y={9} width={18} height={10} rx={2.5} fill={yellow} />
      <Rect x={3} y={9} width={7} height={10} rx={2.5} fill={cream} />
      <Rect x={2} y={18} width={20} height={2.5} rx={1.25} fill={tan} />
    </>
  ),
  meat: (
    <>
      <Path d="M15 3.5 C 20 4 22 9 19 13 C 17 16 13 17 10.5 15 C 8 13 8 8 11 5.5 C 12 4.5 13.5 3.5 15 3.5 Z" fill="#C97B4A" />
      <Path d="M10.5 14.5 L 6 19" stroke={cream} strokeWidth={3} strokeLinecap="round" />
      <Circle cx={4.6} cy={18} r={1.9} fill={cream} />
      <Circle cx={6.6} cy={20.2} r={1.9} fill={cream} />
    </>
  ),
  bread: (
    <>
      <Path d="M4 11 C 2 7 6 4.5 12 4.5 C 18 4.5 22 7 20 11 L 20 18.5 C 20 19.5 19 20 18 20 L 6 20 C 5 20 4 19.5 4 18.5 Z" fill={tan} />
      <Path d="M8 9 L 9.5 12 M12 8.5 L 13.5 11.5 M16 9 L 17.5 12" stroke="#C4834A" strokeWidth={1.6} strokeLinecap="round" />
    </>
  ),
  grain: (
    <>
      <Path d="M5 12 C 5 17 8 20.5 12 20.5 C 16 20.5 19 17 19 12 Z" fill={red} />
      <Path d="M5.5 12 C 6.5 7 9 5.5 12 5.5 C 15 5.5 17.5 7 18.5 12 Z" fill={cream} />
      <Rect x={4} y={11} width={16} height={2.4} rx={1.2} fill="#C9330F" />
    </>
  ),
  pasta: (
    <>
      <Rect x={3} y={9.5} width={18} height={6} rx={3} fill={yellow} transform="rotate(-28 12 12)" />
      <Path d="M7 13.5 L 15.5 9" stroke="#E8A800" strokeWidth={1.4} strokeLinecap="round" transform="translate(0 0.4)" />
      <Path d="M9 16.5 L 17.5 12" stroke="#E8A800" strokeWidth={1.4} strokeLinecap="round" transform="translate(-1 -1.2)" />
    </>
  ),
  jar: (
    <>
      <Rect x={6} y={8} width={12} height={13.5} rx={3} fill={tan} />
      <Rect x={5.5} y={3.5} width={13} height={5} rx={1.8} fill={red} />
      <Rect x={8.5} y={11.5} width={7} height={5.5} rx={1.2} fill={cream} />
    </>
  ),
  spice: (
    <>
      <Rect x={7} y={9} width={10} height={12.5} rx={2.5} fill={brown} />
      <Path d="M7 9 C 7 5 9 3 12 3 C 15 3 17 5 17 9 Z" fill={cream} />
      <Circle cx={10} cy={6.3} r={0.8} fill={brown} />
      <Circle cx={12} cy={5.2} r={0.8} fill={brown} />
      <Circle cx={14} cy={6.3} r={0.8} fill={brown} />
    </>
  ),
  oil: (
    <>
      <Path d="M10 3 L 14 3 L 14 8 C 17 9.5 17.5 11 17.5 13 L 17.5 19.5 C 17.5 20.5 16.5 21.5 15.5 21.5 L 8.5 21.5 C 7.5 21.5 6.5 20.5 6.5 19.5 L 6.5 13 C 6.5 11 7 9.5 10 8 Z" fill="#B8C94A" />
      <Rect x={9.5} y={2} width={5} height={3} rx={1} fill={brown} />
      <Rect x={8.5} y={13} width={7} height={5} rx={1} fill={cream} />
    </>
  ),
  sweet: (
    <>
      <Circle cx={12} cy={12} r={8.5} fill={tan} />
      <Circle cx={9} cy={9.5} r={1.5} fill={brown} />
      <Circle cx={14.5} cy={10} r={1.3} fill={brown} />
      <Circle cx={10.5} cy={14.5} r={1.3} fill={brown} />
      <Circle cx={15} cy={15} r={1.5} fill={brown} />
    </>
  ),
  basket: (
    <>
      <Path d="M4 10 L 20 10 L 18.5 19.5 C 18.3 20.5 17.5 21 16.5 21 L 7.5 21 C 6.5 21 5.7 20.5 5.5 19.5 Z" fill={tan} />
      <Path d="M8 10 C 8 6 10 4 12 4 C 14 4 16 6 16 10" stroke={brown} strokeWidth={2} fill="none" strokeLinecap="round" />
      <Rect x={3} y={9} width={18} height={3} rx={1.5} fill={brown} />
    </>
  ),
};

/** The picture on a soft round background. `size` is the whole circle. */
export function FoodIcon({ name, aisle, size = 32, bare = false }: { name: string; aisle?: string; size?: number; /** No background circle (inside chips). */ bare?: boolean }) {
  const t = useTheme();
  const glyph = bare ? size : Math.round(size * 0.62);
  const svg = (
    <Svg width={glyph} height={glyph} viewBox="0 0 24 24">
      {art[foodKind(name, aisle)]}
    </Svg>
  );
  if (bare) return svg;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.colors.fill, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no">
      {svg}
    </View>
  );
}
