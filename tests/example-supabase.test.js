import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Supabase Mock Test', () => {
  let mockSupabaseClient

  beforeEach(() => {
    vi.clearAllMocks()

    // Her test icin yeni mock
    mockSupabaseClient = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
      }))
    }
    global.supabaseClient = mockSupabaseClient
  })

  describe('SELECT islemleri', () => {
    it('basarili durumda veri listesi donmeli', async () => {
      // Arrange
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, name: 'Urun 1', is_active: true },
            { id: 2, name: 'Urun 2', is_active: true }
          ],
          error: null
        })
      })

      // Act
      const result = await supabaseClient.from('products')
        .select('*')
        .eq('is_active', true)
        .order('name')

      // Assert
      expect(result.data).toHaveLength(2)
      expect(result.data[0].name).toBe('Urun 1')
      expect(result.error).toBeNull()
    })

    it('hata durumunda error donmeli', async () => {
      // Arrange
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection error' }
        })
      })

      // Act
      const result = await supabaseClient.from('products')
        .select('*')
        .eq('is_active', true)
        .order('name')

      // Assert
      expect(result.data).toBeNull()
      expect(result.error).toBeTruthy()
      expect(result.error.message).toBe('Database connection error')
    })

    it('bos liste donebilmeli', async () => {
      // Arrange
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null })
      })

      // Act
      const result = await supabaseClient.from('products')
        .select('*')
        .eq('is_active', true)
        .order('name')

      // Assert
      expect(result.data).toEqual([])
      expect(result.error).toBeNull()
    })
  })

  describe('INSERT islemleri', () => {
    it('basarili kayit eklemeli', async () => {
      // Arrange
      const newProduct = { name: 'Yeni Urun', price: 100 }
      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, ...newProduct },
          error: null
        })
      })

      // Act
      const result = await supabaseClient.from('products')
        .insert(newProduct)
        .select()
        .single()

      // Assert
      expect(result.data).toBeDefined()
      expect(result.data.id).toBe(1)
      expect(result.data.name).toBe('Yeni Urun')
      expect(result.error).toBeNull()
    })

    it('duplicate key hatasi vermeli', async () => {
      // Arrange
      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'duplicate key value violates unique constraint' }
        })
      })

      // Act
      const result = await supabaseClient.from('products')
        .insert({ name: 'Existing Product' })
        .select()
        .single()

      // Assert
      expect(result.data).toBeNull()
      expect(result.error).toBeTruthy()
    })
  })

  describe('UPDATE islemleri', () => {
    it('kaydi guncellemeli', async () => {
      // Arrange
      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, name: 'Guncellenmis Urun', price: 150 },
          error: null
        })
      })

      // Act
      const result = await supabaseClient.from('products')
        .update({ price: 150 })
        .eq('id', 1)
        .select()
        .single()

      // Assert
      expect(result.data.price).toBe(150)
      expect(result.error).toBeNull()
    })
  })

  describe('DELETE islemleri', () => {
    it('kaydi silmeli', async () => {
      // Arrange
      mockSupabaseClient.from.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null })
      })

      // Act
      const result = await supabaseClient.from('products')
        .delete()
        .eq('id', 1)

      // Assert
      expect(result.error).toBeNull()
    })
  })
})
