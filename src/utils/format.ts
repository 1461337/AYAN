export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

export const fmt = (n: number | null | undefined) => (n || 0).toLocaleString('zh-CN')

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}
