let source: () => number = Math.random

export function setRandomSource(fn: () => number) {
  source = fn
}

export function resetRandomSource() {
  source = Math.random
}

export function random() {
  return source()
}

export const rnd = (a: number, b: number) => Math.floor(random() * (b - a + 1)) + a

export const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(random() * arr.length)]

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(0, i)
    const t = a[i]
    a[i] = a[j]
    a[j] = t
  }
  return a
}

export function chance(p: number) {
  return random() < p
}
