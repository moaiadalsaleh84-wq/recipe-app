/**
 * Every ingredient gets the right picture, and things that are different never share one.
 * Run: node --test scripts/foodKind.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { foodKind } from '../src/lib/foodKind.ts';

test('known ingredients get their own picture', () => {
  const expect: Record<string, string> = {
    'Red peppers': 'pepper', 'Cherry tomatoes': 'tomato', Tomatoes: 'tomato', Passata: 'passata', 'Garlic cloves': 'garlic', Garlic: 'garlic',
    Onion: 'onion', Onions: 'onion', 'Red onion': 'onion', Potatoes: 'potato', Carrots: 'carrot', 'Peas & carrots': 'peas', 'Frozen peas': 'peas',
    'Chestnut mushrooms': 'mushroom', Lemon: 'lemon', Apples: 'apple', Strawberries: 'strawberry', Raspberries: 'raspberry', Basil: 'herb',
    'Red cabbage': 'cabbage', Eggs: 'egg', Milk: 'milk', 'Double cream': 'cream', 'Greek yogurt': 'yogurt', Yogurt: 'yogurt', Butter: 'butter',
    Feta: 'cheese', Mozzarella: 'cheese', Parmesan: 'cheese', 'Cheddar slices': 'cheese', Cheese: 'cheese', 'Chicken thighs': 'chicken',
    'Chicken breast': 'chicken', Chicken: 'chicken', 'Chicken mince': 'mince', Penne: 'penne', Pasta: 'penne', Spaghetti: 'spaghetti',
    'Basmati rice': 'rice', 'Cooked rice': 'rice', Rice: 'rice', 'Plain flour': 'flour', Flour: 'flour', 'Pizza dough balls': 'dough',
    'Dosa batter': 'batter', 'Brown sugar': 'sugar', 'Caster sugar': 'sugar', 'Icing sugar': 'sugar', Sugar: 'sugar', 'Cocoa powder': 'cocoa',
    'Olive oil': 'oil', 'Vegetable oil': 'oil', 'Soy sauce': 'soy', 'Vanilla extract': 'vanilla', Cinnamon: 'cinnamon', 'Garam masala': 'spice',
    'Biryani masala': 'spice', Turmeric: 'spice', Saffron: 'spice', 'Cumin seeds': 'spice', 'Mustard seeds': 'spice', 'Brioche buns': 'bun',
    'Puff pastry': 'pastry', 'Sponge cake': 'cake', Bread: 'bread', 'Coffee beans': 'coffee', Mayonnaise: 'mayo',
  };
  const wrong = Object.entries(expect).filter(([n, k]) => foodKind(n) !== k).map(([n, k]) => `${n}: ${foodKind(n)}, expected ${k}`);
  assert.deepEqual(wrong, []);
});

test('every built-in ingredient is recognized (no neutral fallbacks needed)', () => {
  const src = readFileSync(new URL('../src/data/mock.ts', import.meta.url), 'utf8');
  const names = [...new Set([...src.matchAll(/name: '((?:[^'\\]|\\.)*)', quantity/g)].map((m) => m[1]))];
  assert.ok(names.length > 40);
  const unknown = names.filter((n) => ['produce', 'dairy', 'meat', 'bakery', 'pantry', 'basket'].includes(foodKind(n)));
  assert.deepEqual(unknown, []);
});

test('an unknown ingredient gets its aisle, never a wrong food', () => {
  assert.equal(foodKind('Kohlrabi', 'Produce'), 'produce');
  assert.equal(foodKind('Quark', 'Dairy & Eggs'), 'dairy');
  assert.equal(foodKind('Something new'), 'basket');
});
