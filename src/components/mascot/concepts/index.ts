import type { ComponentType } from 'react';
import type { CharProps } from './kit';
import { Nutmeg } from './Nutmeg';
import { Pip } from './Pip';
import { Saffy } from './Saffy';

export type Concept = {
  id: string;
  letter: string;
  name: string;
  species: string;
  personality: string;
  signature: string;
  Art: ComponentType<CharProps>;
};

/** The mascot concepts, for the dev-only preview at /dev-mascots. Nothing in the app uses these yet. */
export const CONCEPTS: Concept[] = [
  {
    id: 'saffy',
    letter: 'A',
    name: 'Saffy',
    species: 'Cat',
    personality:
      'A sunny, unhurried home cook who thinks every meal deserves a little sit-down. Saffy hums while chopping, tastes with a tiny spoon, never rushes you and cheers small wins like big ones. A bit vain about the hat.',
    signature: 'A slouchy soufflé hat that leans to one side and tips further the happier Saffy gets.',
    Art: Saffy,
  },
  {
    id: 'pip',
    letter: 'B',
    name: 'Pip',
    species: 'Otter',
    personality:
      'Playful, curious and always fiddling with something. Pip treats the kitchen like a playground: sniffs every new ingredient, drums on pots, invents "secret" spice mixes and floats belly-up to relax while things simmer. Big-hearted, easily delighted, a little chaotic.',
    signature: 'A long wooden spoon Pip never puts down. It points, stirs, conducts, and goes up like a torch when something goes right.',
    Art: Pip,
  },
  {
    id: 'nutmeg',
    letter: 'C',
    name: 'Nutmeg',
    species: 'Hedgehog',
    personality:
      'Small, careful and quietly brave. Nutmeg reads the whole recipe first, keeps everyone safe around hot pans and curls up a little when nervous. Gentle, dry humour, and the proudest tiny chef in the world when a dish turns out right.',
    signature: 'A puffy berry-red oven mitt on one paw, plus soft rounded quills that make an instantly readable crown.',
    Art: Nutmeg,
  },
];
