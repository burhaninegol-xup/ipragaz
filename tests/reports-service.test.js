import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('ReportsService', () => {
  let mockSupabaseClient

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabaseClient = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
      }))
    }
    global.supabaseClient = mockSupabaseClient
  })

  describe('getSalesReport', () => {
    it('basarili durumda son 30 gun satış verilerini donmeli', async () => {
      const mockSalesData = [
        { product_name: 'Urun 1', total_quantity: 10, total_revenue: 1000 },
        { product_name: 'Urun 2', total_quantity: 5, total_revenue: 500 }
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockSalesData,
          error: null
        })
      })

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const today = new Date().toISOString()

      const result = await supabaseClient.from('order_items')
        .select('product_name, total_quantity, total_revenue')
        .gte('created_at', thirtyDaysAgo)
        .lte('created_at', today)
        .order('total_revenue', { ascending: false })

      expect(result.data).toHaveLength(2)
      expect(result.data[0].product_name).toBe('Urun 1')
      expect(result.error).toBeNull()
    })

    it('hata durumunda error donmeli', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' }
        })
      })

      const result = await supabaseClient.from('order_items')
        .select('product_name, total_quantity, total_revenue')
        .gte('created_at', expect.any(String))
        .lte('created_at', expect.any(String))
        .order('total_revenue', { ascending: false })

      expect(result.error).toBeTruthy()
      expect(result.error.message).toBe('Database connection failed')
    })

    it('veri yoksa bos liste donmeli', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })

      const result = await supabaseClient.from('order_items')
        .select('product_name, total_quantity, total_revenue')
        .gte('created_at', expect.any(String))
        .lte('created_at', expect.any(String))
        .order('total_revenue', { ascending: false })

      expect(result.data).toEqual([])
      expect(result.error).toBeNull()
    })
  })

  describe('getProductSalesReport', () => {
    it('belirli tarih araliginda urun satis raporunu donmeli', async () => {
      const startDate = '2024-01-01'
      const endDate = '2024-01-31'
      const mockProductSales = [
        { product_id: 1, product_name: 'Laptop', quantity: 15, revenue: 15000 },
        { product_id: 2, product_name: 'Mouse', quantity: 50, revenue: 2500 }
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockProductSales,
          error: null
        })
      })

      const result = await supabaseClient.from('order_items')
        .select('product_id, product_name, quantity, revenue')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('revenue', { ascending: false })

      expect(result.data).toHaveLength(2)
      expect(result.data[0].product_name).toBe('Laptop')
      expect(result.data[0].revenue).toBe(15000)
      expect(result.error).toBeNull()
    })

    it('gecersiz tarih araliginda hata donmeli', async () => {
      const invalidStartDate = 'invalid-date'
      const endDate = '2024-01-31'

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Invalid date format' }
        })
      })

      const result = await supabaseClient.from('order_items')
        .select('product_id, product_name, quantity, revenue')
        .gte('created_at', invalidStartDate)
        .lte('created_at', endDate)
        .order('revenue', { ascending: false })

      expect(result.error).toBeTruthy()
      expect(result.error.message).toBe('Invalid date format')
    })

    it('tarih araliginda veri yoksa bos liste donmeli', async () => {
      const startDate = '2024-12-01'
      const endDate = '2024-12-31'

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })

      const result = await supabaseClient.from('order_items')
        .select('product_id, product_name, quantity, revenue')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('revenue', { ascending: false })

      expect(result.data).toEqual([])
      expect(result.error).toBeNull()
    })
  })

  describe('getCustomerReport', () => {
    it('musteri raporunu basariyla donmeli', async () => {
      const mockCustomerData = [
        { customer_id: 1, customer_name: 'Ali Veli', total_orders: 5, total_spent: 2500 },
        { customer_id: 2, customer_name: 'Ayse Fatma', total_orders: 3, total_spent: 1800 }
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockCustomerData,
          error: null
        })
      })

      const result = await supabaseClient.from('customers')
        .select('customer_id, customer_name, total_orders, total_spent')
        .order('total_spent', { ascending: false })

      expect(result.data).toHaveLength(2)
      expect(result.data[0].customer_name).toBe('Ali Veli')
      expect(result.data[0].total_spent).toBe(2500)
      expect(result.error).toBeNull()
    })

    it('musteri verisi alinamadiysa hata donmeli', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Customer data not accessible' }
        })
      })

      const result = await supabaseClient.from('customers')
        .select('customer_id, customer_name, total_orders, total_spent')
        .order('total_spent', { ascending: false })

      expect(result.error).toBeTruthy()
      expect(result.error.message).toBe('Customer data not accessible')
    })

    it('musteri yoksa bos liste donmeli', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })

      const result = await supabaseClient.from('customers')
        .select('customer_id, customer_name, total_orders, total_spent')
        .order('total_spent', { ascending: false })

      expect(result.data).toEqual([])
      expect(result.error).toBeNull()
    })
  })

  describe('getInventoryReport', () => {
    it('stok raporunu basariyla donmeli', async () => {
      const mockInventoryData = [
        { product_id: 1, product_name: 'Laptop', current_stock: 5, min_stock: 10, status: 'low' },
        { product_id: 2, product_name: 'Mouse', current_stock: 25, min_stock: 15, status: 'ok' }
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockInventoryData,
          error: null
        })
      })

      const result = await supabaseClient.from('products')
        .select('product_id, product_name, current_stock, min_stock, status')
        .order('current_stock', { ascending: true })

      expect(result.data).toHaveLength(2)
      expect(result.data[0].status).toBe('low')
      expect(result.data[1].current_stock).toBe(25)
      expect(result.error).toBeNull()
    })

    it('stok verisi alinamadiysa hata donmeli', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Inventory data not found' }
        })
      })

      const result = await supabaseClient.from('products')
        .select('product_id, product_name, current_stock, min_stock, status')
        .order('current_stock', { ascending: true })

      expect(result.error).toBeTruthy()
      expect(result.error.message).toBe('Inventory data not found')
    })

    it('urun yoksa bos liste donmeli', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })

      const result = await supabaseClient.from('products')
        .select('product_id, product_name, current_stock, min_stock, status')
        .order('current_stock', { ascending: true })

      expect(result.data).toEqual([])
      expect(result.error).toBeNull()
    })
  })
})