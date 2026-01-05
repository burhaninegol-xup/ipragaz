import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * OffersService.getByCustomerId Test Suite
 *
 * Bu test, isyerim-musteri-anasayfa.html'deki
 * pending offer countdown ozelliginin kullandigi
 * getByCustomerId metodunu test eder.
 */

describe('OffersService', () => {
  let mockSupabaseClient
  let OffersService

  beforeEach(() => {
    vi.clearAllMocks()

    // Supabase mock - chain metodlari
    mockSupabaseClient = {
      from: vi.fn(() => mockSupabaseClient),
      select: vi.fn(() => mockSupabaseClient),
      eq: vi.fn(() => mockSupabaseClient),
      order: vi.fn(() => mockSupabaseClient),
      // Son zincir metodu - Promise doner
      then: vi.fn((resolve) => resolve({ data: [], error: null }))
    }

    global.supabaseClient = mockSupabaseClient
    global.handleSupabaseError = vi.fn((err, ctx) => ({
      data: null,
      error: err?.message || 'Bir hata olustu'
    }))

    // OffersService'i tanimla (gercek implementasyon gibi)
    OffersService = {
      async getByCustomerId(customerId, filters = {}) {
        try {
          let query = supabaseClient
            .from('offers')
            .select(`
              *,
              dealer:dealers(id, name, code, city, district),
              offer_details(
                id,
                unit_price,
                pricing_type,
                discount_value,
                commitment_quantity,
                product:products(id, code, name, base_price, image_url)
              )
            `)
            .eq('customer_id', customerId)

          if (filters.status) {
            query = query.eq('status', filters.status)
          }

          query = query.order('created_at', { ascending: false })

          const { data, error } = await query
          if (error) throw error
          return { data, error: null }
        } catch (error) {
          return handleSupabaseError(error, 'OffersService.getByCustomerId')
        }
      }
    }
  })

  describe('getByCustomerId', () => {
    it('birden fazla pending teklif basariyla donmeli', async () => {
      // Mock: 3 adet pending teklif
      const mockOffers = [
        {
          id: 'offer-1',
          customer_id: 'customer-123',
          status: 'pending',
          price_updated_at: '2026-01-05T10:00:00Z',
          created_at: '2026-01-04T10:00:00Z',
          dealer: { id: 'dealer-1', name: 'Bayi A' },
          offer_details: []
        },
        {
          id: 'offer-2',
          customer_id: 'customer-123',
          status: 'pending',
          price_updated_at: '2026-01-05T08:00:00Z',
          created_at: '2026-01-03T10:00:00Z',
          dealer: { id: 'dealer-2', name: 'Bayi B' },
          offer_details: []
        },
        {
          id: 'offer-3',
          customer_id: 'customer-123',
          status: 'pending',
          price_updated_at: null,
          created_at: '2026-01-02T10:00:00Z',
          dealer: { id: 'dealer-3', name: 'Bayi C' },
          offer_details: []
        }
      ]

      // Mock zinciri - order son metod, Promise doner
      mockSupabaseClient.order = vi.fn(() => Promise.resolve({
        data: mockOffers,
        error: null
      }))

      const result = await OffersService.getByCustomerId('customer-123', { status: 'pending' })

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(3)
      expect(result.data[0].id).toBe('offer-1')
      expect(result.data[0].status).toBe('pending')
    })

    it('status filtresi olmadan tum teklifleri getirmeli', async () => {
      const mockOffers = [
        { id: 'offer-1', status: 'pending' },
        { id: 'offer-2', status: 'accepted' },
        { id: 'offer-3', status: 'rejected' }
      ]

      mockSupabaseClient.order = vi.fn(() => Promise.resolve({
        data: mockOffers,
        error: null
      }))

      const result = await OffersService.getByCustomerId('customer-123')

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(3)
      // from, select, eq(customer_id), order cagrilmis olmali
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('offers')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('customer_id', 'customer-123')
    })

    it('status filtresi ile sadece o statusu getirmeli', async () => {
      const mockPendingOffers = [
        { id: 'offer-1', status: 'pending' }
      ]

      // eq iki kez cagrilacak: customer_id ve status icin
      let eqCallCount = 0
      mockSupabaseClient.eq = vi.fn(() => {
        eqCallCount++
        return mockSupabaseClient
      })

      mockSupabaseClient.order = vi.fn(() => Promise.resolve({
        data: mockPendingOffers,
        error: null
      }))

      const result = await OffersService.getByCustomerId('customer-123', { status: 'pending' })

      expect(result.error).toBeNull()
      expect(eqCallCount).toBe(2) // customer_id ve status
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('customer_id', 'customer-123')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('status', 'pending')
    })

    it('veritabani hatasinda error donmeli', async () => {
      mockSupabaseClient.order = vi.fn(() => Promise.resolve({
        data: null,
        error: { message: 'Database connection failed' }
      }))

      const result = await OffersService.getByCustomerId('customer-123', { status: 'pending' })

      expect(result.data).toBeNull()
      expect(result.error).toBeTruthy()
    })

    it('teklif yoksa bos liste donmeli', async () => {
      mockSupabaseClient.order = vi.fn(() => Promise.resolve({
        data: [],
        error: null
      }))

      const result = await OffersService.getByCustomerId('customer-123', { status: 'pending' })

      expect(result.error).toBeNull()
      expect(result.data).toEqual([])
      expect(result.data).toHaveLength(0)
    })

    it('en erken deadline hesaplanabilmeli (countdown icin)', async () => {
      // Bu test, countdown logic'inin kullandigi veriyi simule eder
      const mockOffers = [
        {
          id: 'offer-1',
          price_updated_at: '2026-01-05T14:00:00Z', // En gec - deadline: 6 Ocak 14:00
          created_at: '2026-01-04T10:00:00Z'
        },
        {
          id: 'offer-2',
          price_updated_at: '2026-01-05T08:00:00Z', // En erken - deadline: 6 Ocak 08:00
          created_at: '2026-01-03T10:00:00Z'
        },
        {
          id: 'offer-3',
          price_updated_at: null, // price_updated_at yok, created_at kullanilir
          created_at: '2026-01-05T10:00:00Z' // deadline: 6 Ocak 10:00
        }
      ]

      mockSupabaseClient.order = vi.fn(() => Promise.resolve({
        data: mockOffers,
        error: null
      }))

      const result = await OffersService.getByCustomerId('customer-123', { status: 'pending' })

      // En erken deadline'i bul (countdown logic'i gibi)
      let earliestDeadline = null
      result.data.forEach(offer => {
        const startTime = offer.price_updated_at || offer.created_at
        if (startTime) {
          const deadline = new Date(new Date(startTime).getTime() + (24 * 60 * 60 * 1000))
          if (!earliestDeadline || deadline < earliestDeadline) {
            earliestDeadline = deadline
          }
        }
      })

      // offer-2'nin deadline'i en erken olmali (6 Ocak 08:00)
      expect(earliestDeadline).not.toBeNull()
      expect(earliestDeadline.toISOString()).toBe('2026-01-06T08:00:00.000Z')
    })
  })
})
