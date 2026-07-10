declare class IPSet {
  constructor(blocklist?: Array<{ start: string | number; end: string | number }>)
  add(start: string | number | { start: string | number; end: string | number }, end?: string | number): void
  contains(addr: string | number): boolean
}
export = IPSet
