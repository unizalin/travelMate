import { beforeEach, describe, expect, it, vi } from 'vitest'

const { generateContent } = vi.hoisted(() => ({
  generateContent: vi.fn(),
}))

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: { generateContent },
  })),
}))

const candidate = {
  id: 'candidate-1',
  trip_id: 'trip-1',
  name: 'Blue Lagoon',
  location: 'Grindavík',
  latitude: 63.88,
  longitude: -22.45,
  description: 'Geothermal spa',
  created_by: 'user-1',
  creator_name: 'Planner',
  status: 'pending' as const,
  google_maps_url: null,
  added_to_day: null,
  added_at: null,
  created_at: '2026-10-13T00:00:00.000Z',
  like_count: 12,
}

describe('aiSchedulingService', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-gemini-key')
    generateContent.mockReset()
  })

  it('keeps the existing missing-key error at module startup', async () => {
    vi.unstubAllEnvs()
    vi.resetModules()

    await expect(import('@/services/aiSchedulingService')).rejects.toThrow('Missing VITE_GEMINI_API_KEY')
  })

  it('uses the current SDK models API and parses fenced schedule JSON', async () => {
    generateContent.mockResolvedValue({
      text: '```json\n{"suggestions":[{"candidateId":"candidate-1","dayNumber":2,"startTime":"09:00","reasoning":"靠近藍湖"}]}\n```',
    })
    const { aiSchedulingService } = await import('@/services/aiSchedulingService')

    await expect(
      aiSchedulingService.getSmartSchedule([candidate], {
        destination: 'Iceland',
        startDate: '2026-10-30',
        endDate: '2026-11-07',
        totalDays: 9,
      }),
    ).resolves.toEqual([
      { candidateId: 'candidate-1', dayNumber: 2, startTime: '09:00', reasoning: '靠近藍湖' },
    ])

    expect(generateContent).toHaveBeenCalledWith({
      model: 'gemini-2.0-flash',
      contents: expect.stringContaining('Blue Lagoon'),
    })
  })

  it('uses the same SDK shape for smart blocks and keeps its empty fallback', async () => {
    generateContent.mockResolvedValue({ text: '模型回覆沒有 JSON' })
    const { aiSchedulingService } = await import('@/services/aiSchedulingService')

    await expect(
      aiSchedulingService.getSmartBlocks([{ id: 'item-1', name: '早餐', start_time: '08:00' }], {
        destination: 'Iceland',
      }),
    ).resolves.toEqual([])

    expect(generateContent).toHaveBeenCalledWith({
      model: 'gemini-2.0-flash',
      contents: expect.stringContaining('早餐'),
    })
  })
})
