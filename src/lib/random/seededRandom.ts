export interface SeededRandom {
  readonly seed: string;
  next: () => number;
  integer: (min: number, max: number) => number;
  pick: <T>(items: readonly T[]) => T;
  shuffle: <T>(items: readonly T[]) => T[];
}

export function createSeededRandom(seed: string | number): SeededRandom {
  const seedText = String(seed);
  let state = hashSeed(seedText);

  const next = () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };

  const integer = (min: number, max: number) => {
    if (!Number.isInteger(min) || !Number.isInteger(max)) {
      throw new Error("Seeded integer bounds must be whole numbers.");
    }

    if (max < min) {
      throw new Error("Seeded integer max must be greater than or equal to min.");
    }

    return Math.floor(next() * (max - min + 1)) + min;
  };

  const pick = <T>(items: readonly T[]) => {
    if (items.length === 0) {
      throw new Error("Cannot pick from an empty list.");
    }

    return items[integer(0, items.length - 1)];
  };

  const shuffle = <T>(items: readonly T[]) => {
    const shuffled = [...items];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = integer(0, index);
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }

    return shuffled;
  };

  return {
    seed: seedText,
    next,
    integer,
    pick,
    shuffle
  };
}

function hashSeed(seed: string): number {
  let hash = 2_166_136_261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
}
