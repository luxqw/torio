import { describe, it, expect } from 'vitest'
import IPSet from './index.js'

describe('IPSet', () => {
  it('contains() returns false for an empty set', () => {
    const s = new IPSet()
    expect(s.contains('8.8.8.8')).toBe(false)
  })

  it('contains() matches a single IP added as string', () => {
    const s = new IPSet()
    s.add('8.8.8.8')
    expect(s.contains('8.8.8.8')).toBe(true)
  })

  it('contains() does not match a different IP', () => {
    const s = new IPSet()
    s.add('8.8.8.8')
    expect(s.contains('1.1.1.1')).toBe(false)
  })

  it('add() accepts a {start, end} range object', () => {
    const s = new IPSet()
    s.add({ start: '10.0.0.0', end: '10.0.0.255' })
    expect(s.contains('10.0.0.5')).toBe(true)
    expect(s.contains('10.0.1.0')).toBe(false)
  })

  it('add() accepts CIDR notation', () => {
    const s = new IPSet()
    s.add('192.168.0.0/24')
    expect(s.contains('192.168.0.1')).toBe(true)
    expect(s.contains('192.168.0.255')).toBe(true)
    expect(s.contains('192.168.1.1')).toBe(false)
  })

  it('constructor preloads from a blocklist of ranges', () => {
    const linksys = { start: '10.0.1.0', end: '10.0.1.255' }
    const localhost = { start: '127.0.0.0', end: '127.255.255.255' }
    const s = new IPSet([linksys, localhost])
    expect(s.contains('10.0.1.0')).toBe(true)
    expect(s.contains('10.0.1.255')).toBe(true)
    expect(s.contains('10.0.2.0')).toBe(false)
    expect(s.contains('127.0.0.1')).toBe(true)
    expect(s.contains('127.255.255.255')).toBe(true)
  })

  it('add() throws on invalid range (negative start)', () => {
    const s = new IPSet()
    expect(() => s.add(-1, 100)).toThrow()
  })

  it('add() throws on invalid range (end beyond max)', () => {
    const s = new IPSet()
    expect(() => s.add('255.255.255.255', '256.0.0.0')).toThrow()
  })

  it('add() throws when end < start', () => {
    const s = new IPSet()
    expect(() => s.add('10.0.0.10', '10.0.0.1')).toThrow()
  })

  it('contains() with overlapping ranges works correctly', () => {
    const s = new IPSet()
    s.add('10.0.0.0', '10.0.0.20')
    s.add('10.0.0.10', '10.0.0.30')
    expect(s.contains('10.0.0.0')).toBe(true)
    expect(s.contains('10.0.0.15')).toBe(true)
    expect(s.contains('10.0.0.30')).toBe(true)
    expect(s.contains('10.0.0.31')).toBe(false)
  })
})
