import { Pet, PetStatus } from './petApi';

const SPECIES = ['Dog', 'Cat', 'Rabbit'] as const;

/**
 * Unique ids per test: the backend is shared with the whole internet, so fixed ids
 * (e.g. 1, 2, 3) are the #1 source of "works on my machine" failures.
 */
export function uniqueId(): number {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

export function buildPatient(overrides: Partial<Pet> = {}): Pet {
  const species = SPECIES[Math.floor(Math.random() * SPECIES.length)];
  return {
    id: uniqueId(),
    name: `QA-${species}-${Math.random().toString(36).slice(2, 7)}`,
    category: { id: 1, name: species },
    photoUrls: [],
    tags: [{ id: 1, name: 'vetclinic-demo' }],
    status: 'available' as PetStatus,
    ...overrides,
  };
}
