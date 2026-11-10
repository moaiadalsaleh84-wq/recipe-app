
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import { SymbolView, type SFSymbol } from 'expo-symbols';

/**
 * Every icon in the app, as an SF Symbol (iOS) and a Material Symbol (Android and web).
 * Add new icons here so both platforms stay in sync.
 */
const icons = {
  back: { ios: 'chevron.left', md: 'arrow_back_ios_new' },
  chevronRight: { ios: 'chevron.right', md: 'chevron_right' },
  heart: { ios: 'heart', md: 'favorite' },
  heartFill: { ios: 'heart.fill', md: 'favorite' },
  clock: { ios: 'clock', md: 'schedule' },
  flame: { ios: 'flame', md: 'local_fire_department' },
  people: { ios: 'person.2', md: 'group' },
  chart: { ios: 'chart.bar', md: 'signal_cellular_alt' },
  plus: { ios: 'plus', md: 'add' },
  minus: { ios: 'minus', md: 'remove' },
  check: { ios: 'checkmark', md: 'check' },
  close: { ios: 'xmark', md: 'close' },
  closeCircle: { ios: 'xmark.circle.fill', md: 'cancel' },
  search: { ios: 'magnifyingglass', md: 'search' },
  trash: { ios: 'trash', md: 'delete' },
  cart: { ios: 'cart', md: 'shopping_cart' },
  cartAdd: { ios: 'cart.badge.plus', md: 'add_shopping_cart' },
  calendar: { ios: 'calendar', md: 'calendar_month' },
  fork: { ios: 'fork.knife', md: 'restaurant' },
  book: { ios: 'book', md: 'menu_book' },
  checkCircle: { ios: 'checkmark.circle.fill', md: 'check_circle' },
  info: { ios: 'info.circle.fill', md: 'info' },
  warning: { ios: 'exclamationmark.circle.fill', md: 'error' },
  undo: { ios: 'arrow.uturn.backward', md: 'undo' },
  sparkles: { ios: 'sparkles', md: 'auto_awesome' },
  paw: { ios: 'pawprint.fill', md: 'pets' },
  bookmark: { ios: 'bookmark', md: 'bookmark_add' },
  bookmarkFill: { ios: 'bookmark.fill', md: 'bookmark' },
  share: { ios: 'square.and.arrow.up', md: 'share' },
  edit: { ios: 'pencil', md: 'edit' },
  timer: { ios: 'timer', md: 'timer' },
  play: { ios: 'play.fill', md: 'play_arrow' },
  pause: { ios: 'pause.fill', md: 'pause' },
  restart: { ios: 'arrow.counterclockwise', md: 'restart_alt' },
  camera: { ios: 'camera', md: 'photo_camera' },
  link: { ios: 'link', md: 'link' },
  notes: { ios: 'note.text', md: 'notes' },
  dumbbell: { ios: 'dumbbell', md: 'fitness_center' },
  shuffle: { ios: 'shuffle', md: 'shuffle' },
  arrowRight: { ios: 'arrow.right', md: 'arrow_forward' },
  chat: { ios: 'bubble.left', md: 'chat_bubble' },
  pot: { ios: 'frying.pan', md: 'skillet' },
  lock: { ios: 'lock.fill', md: 'lock' },
  crown: { ios: 'crown.fill', md: 'workspace_premium' },
} as const satisfies Record<string, { ios: SFSymbol; md: string }>;

export type IconName = keyof typeof icons;

type Props = {
  name: IconName;
  size?: number;
  color: ColorValue;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  style?: StyleProp<ViewStyle>;
};

export function Icon({ name, size = 20, color, weight = 'medium', style }: Props) {
  const i = icons[name];
  return (
    <SymbolView
      // Material names are typed narrowly by expo-symbols; ours are verified against its symbol list.
      name={{ ios: i.ios, android: i.md as never, web: i.md as never }}
      size={size}
      tintColor={color}
      weight={weight}
      style={style}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
