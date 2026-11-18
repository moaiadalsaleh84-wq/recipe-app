import type { ComponentType } from 'react';
import { Clove } from './Clove';
import { Crumb } from './Crumb';
import type { CharProps } from './kit';
import { Pop } from './Pop';

export type Concept = {
  id: string;
  letter: string;
  name: string;
  species: string;
  personality: string;
  signature: string;
  Art: ComponentType<CharProps>;
};

/**
 * Round 2 of the mascot concepts, for the dev-only preview at /dev-mascots. Nothing in the app uses
 * these yet. Built like Duo and Waterllama's characters: one bold shape, no outlines, big eyes.
 */
export const CONCEPTS: Concept[] = [
  {
    id: 'pop',
    letter: 'D',
    name: 'Pop',
    species: 'Popcorn kernel',
    personality:
      'Bursting with energy and a little impatient. Pop gets excited fast, celebrates loudly and literally pops with joy when a meal comes together. Sweet, buttery and easily startled by hot pans. The app is called Pantry Pop, so Pop is the app.',
    signature: 'Still wears its golden kernel shell like an apron, and little puffs pop off its head when it gets excited.',
    Art: Pop,
  },
  {
    id: 'crumb',
    letter: 'E',
    name: 'Crumb',
    species: 'Cat loaf',
    personality:
      'A cosy, unbothered cat who sits like a loaf of bread and is warm like one. Crumb loves slow Sunday cooking, naps near the oven and judges your knife skills a little, but kindly. Keeps the "a cat helps you cook" idea.',
    signature: 'Shaped like a loaf of bread. The tabby stripes are the baker\'s score marks on the crust.',
    Art: Crumb,
  },
  {
    id: 'clove',
    letter: 'F',
    name: 'Clove',
    species: 'Garlic bulb',
    personality:
      'Garlic goes in almost everything, and so does Clove: the loyal friend who\'s always in your pantry. Cheerful, a bit dramatic, firmly believes every recipe needs "one more clove", and wears the app\'s aubergine colour.',
    signature: 'A green sprout on top that curls up when Clove is happy and droops when Clove is sad.',
    Art: Clove,
  },
];
