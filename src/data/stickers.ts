import type { IconName } from '../components/Icon';

/** The collectible stickers for the Sticker book (You tab). Found at random after cooking (10%). */
export const stickers: { id: string; name: string; icon: IconName; color: 'sunshine' | 'tomato' | 'leaf' | 'sky' | 'berry' | 'lilac' }[] = [
  { id: 'golden-pan', name: 'Golden Pan', icon: 'pot', color: 'sunshine' },
  { id: 'hot-stuff', name: 'Hot Stuff', icon: 'flameFill', color: 'tomato' },
  { id: 'green-thumb', name: 'Green Thumb', icon: 'fridge', color: 'leaf' },
  { id: 'cool-chef', name: 'Cool Chef', icon: 'snowflake', color: 'sky' },
  { id: 'sweetheart', name: 'Sweetheart', icon: 'heartFill', color: 'berry' },
  { id: 'night-owl', name: 'Night Owl', icon: 'moon', color: 'lilac' },
  { id: 'early-bird', name: 'Early Bird', icon: 'sun', color: 'sunshine' },
  { id: 'timer-pro', name: 'Timer Pro', icon: 'timer', color: 'tomato' },
  { id: 'bookworm', name: 'Bookworm', icon: 'book', color: 'leaf' },
  { id: 'shopper', name: 'Basket Boss', icon: 'cart', color: 'sky' },
  { id: 'trophy', name: 'Trophy Dish', icon: 'trophy', color: 'berry' },
  { id: 'crowned', name: 'Kitchen Royalty', icon: 'crown', color: 'lilac' },
];
