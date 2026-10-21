import { beforeEach, describe, expect, it, vi } from 'vitest'
import { preparationService } from '@/services/preparationService'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('@/services/supabase', () => ({ supabase: { rpc } }))

describe('preparation template seeding', () => {
  beforeEach(() => { rpc.mockReset(); rpc.mockResolvedValue({ data: null, error: null }) })

  it('sends the 45-item four-category template starting with 必帶', async () => {
    await preparationService.ensureDefaults('trip')
    expect(rpc).toHaveBeenCalledOnce()
    const [name, args] = rpc.mock.calls[0] as [string, { p_items: Array<{ category: string; title: string }> }]
    expect(name).toBe('tripbook_ensure_packing_template')
    expect(args.p_items).toHaveLength(45)
    expect(args.p_items[0].category).toBe('必帶')
    expect(args.p_items.some(item => item.category === '出發前')).toBe(false)
  })
})
