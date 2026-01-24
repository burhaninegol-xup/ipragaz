import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * PriceResolverService Test Suite
 *
 * Fiyat oncelik kurallarini test eder:
 * 1. Aktif Teklif -> "Size Ozel"
 * 2. Perakende Fiyat -> "Perakende"
 */

describe('PriceResolverService', () => {
  let mockOffersService
  let PriceResolverService

  beforeEach(() => {
    vi.clearAllMocks()

    // OffersService mock
    mockOffersService = {
      getAcceptedOfferForBranch: vi.fn()
    }

    // Global'e ata
    global.OffersService = mockOffersService

    // PriceResolverService'i tanimla
    PriceResolverService = {
      PRICE_TYPES: {
        OFFER: { type: 'offer', label: 'Size Ozel', cssClass: 'size-ozel' },
        RETAIL: { type: 'retail', label: 'Perakende', cssClass: 'perakende' }
      },

      async resolvePrice(productId, customerId, branchId, dealerId, basePrice) {
        try {
          // 1. Aktif teklif kontrolu
          if (customerId && branchId && dealerId) {
            var offerPrice = await this._getOfferPrice(productId, customerId, branchId, dealerId)
            if (offerPrice !== null) {
              return {
                price: offerPrice,
                priceType: this.PRICE_TYPES.OFFER.type,
                label: this.PRICE_TYPES.OFFER.label,
                cssClass: this.PRICE_TYPES.OFFER.cssClass
              }
            }
          }

          // 2. Perakende fiyat
          return {
            price: basePrice || 0,
            priceType: this.PRICE_TYPES.RETAIL.type,
            label: this.PRICE_TYPES.RETAIL.label,
            cssClass: this.PRICE_TYPES.RETAIL.cssClass
          }
        } catch (error) {
          return {
            price: basePrice || 0,
            priceType: this.PRICE_TYPES.RETAIL.type,
            label: this.PRICE_TYPES.RETAIL.label,
            cssClass: this.PRICE_TYPES.RETAIL.cssClass
          }
        }
      },

      async resolvePricesForProducts(products, customerId, branchId, dealerId) {
        var result = {}
        var offerPrices = {}

        try {
          if (customerId && branchId && dealerId) {
            offerPrices = await this._getOfferPricesForBranch(customerId, branchId, dealerId)
          }

          var self = this
          products.forEach(function(product) {
            var productId = product.id
            var basePrice = product.base_price || 0

            if (offerPrices[productId] !== undefined) {
              result[productId] = {
                price: offerPrices[productId],
                priceType: self.PRICE_TYPES.OFFER.type,
                label: self.PRICE_TYPES.OFFER.label,
                cssClass: self.PRICE_TYPES.OFFER.cssClass
              }
              return
            }

            result[productId] = {
              price: basePrice,
              priceType: self.PRICE_TYPES.RETAIL.type,
              label: self.PRICE_TYPES.RETAIL.label,
              cssClass: self.PRICE_TYPES.RETAIL.cssClass
            }
          })

          return result
        } catch (error) {
          var self = this
          products.forEach(function(product) {
            result[product.id] = {
              price: product.base_price || 0,
              priceType: self.PRICE_TYPES.RETAIL.type,
              label: self.PRICE_TYPES.RETAIL.label,
              cssClass: self.PRICE_TYPES.RETAIL.cssClass
            }
          })
          return result
        }
      },

      async _getOfferPrice(productId, customerId, branchId, dealerId) {
        var result = await OffersService.getAcceptedOfferForBranch(dealerId, customerId, branchId)
        if (result.error || !result.data) return null

        var offer = result.data
        var offerDetails = offer.offer_details || []

        for (var i = 0; i < offerDetails.length; i++) {
          var detail = offerDetails[i]
          if (detail.product && detail.product.id === productId) {
            return detail.unit_price
          }
        }
        return null
      },

      async _getOfferPricesForBranch(customerId, branchId, dealerId) {
        var prices = {}
        var result = await OffersService.getAcceptedOfferForBranch(dealerId, customerId, branchId)
        if (result.error || !result.data) return prices

        var offerDetails = result.data.offer_details || []
        offerDetails.forEach(function(detail) {
          if (detail.product && detail.product.id) {
            prices[detail.product.id] = detail.unit_price
          }
        })
        return prices
      }
    }
  })

  describe('resolvePrice', () => {
    it('aktif teklif varsa "Size Ozel" fiyat donmeli', async () => {
      // Mock: Aktif teklif var
      mockOffersService.getAcceptedOfferForBranch.mockResolvedValue({
        data: {
          id: 'offer-1',
          offer_details: [
            { product: { id: 'product-1' }, unit_price: 150.00 }
          ]
        },
        error: null
      })

      const result = await PriceResolverService.resolvePrice(
        'product-1',
        'customer-1',
        'branch-1',
        'dealer-1',
        200.00
      )

      expect(result.price).toBe(150.00)
      expect(result.priceType).toBe('offer')
      expect(result.label).toBe('Size Ozel')
      expect(result.cssClass).toBe('size-ozel')
    })

    it('teklif yoksa "Perakende" fiyat donmeli', async () => {
      // Mock: Teklif yok
      mockOffersService.getAcceptedOfferForBranch.mockResolvedValue({
        data: null,
        error: null
      })

      const result = await PriceResolverService.resolvePrice(
        'product-1',
        'customer-1',
        'branch-1',
        'dealer-1',
        200.00
      )

      expect(result.price).toBe(200.00)
      expect(result.priceType).toBe('retail')
      expect(result.label).toBe('Perakende')
      expect(result.cssClass).toBe('perakende')
    })

    it('hata durumunda perakende fiyat donmeli', async () => {
      // Mock: Hata
      mockOffersService.getAcceptedOfferForBranch.mockRejectedValue(new Error('Network error'))

      const result = await PriceResolverService.resolvePrice(
        'product-1',
        'customer-1',
        'branch-1',
        'dealer-1',
        200.00
      )

      expect(result.price).toBe(200.00)
      expect(result.priceType).toBe('retail')
    })

    it('customerId yoksa teklif kontrolu yapilmamali', async () => {
      const result = await PriceResolverService.resolvePrice(
        'product-1',
        null, // customerId yok
        null,
        'dealer-1',
        200.00
      )

      expect(mockOffersService.getAcceptedOfferForBranch).not.toHaveBeenCalled()
      expect(result.price).toBe(200.00)
      expect(result.priceType).toBe('retail')
    })
  })

  describe('resolvePricesForProducts', () => {
    it('birden fazla urun icin farkli fiyat tipleri donmeli', async () => {
      const products = [
        { id: 'product-1', base_price: 200.00 },
        { id: 'product-2', base_price: 250.00 },
        { id: 'product-3', base_price: 300.00 }
      ]

      // Mock: Teklif - product-1 icin fiyat var
      mockOffersService.getAcceptedOfferForBranch.mockResolvedValue({
        data: {
          offer_details: [
            { product: { id: 'product-1' }, unit_price: 150.00 }
          ]
        },
        error: null
      })

      const result = await PriceResolverService.resolvePricesForProducts(
        products,
        'customer-1',
        'branch-1',
        'dealer-1'
      )

      // product-1: Teklif fiyati
      expect(result['product-1'].price).toBe(150.00)
      expect(result['product-1'].priceType).toBe('offer')

      // product-2: Perakende fiyat
      expect(result['product-2'].price).toBe(250.00)
      expect(result['product-2'].priceType).toBe('retail')

      // product-3: Perakende fiyat
      expect(result['product-3'].price).toBe(300.00)
      expect(result['product-3'].priceType).toBe('retail')
    })

    it('tum urunler icin teklif fiyati varsa hepsi "Size Ozel" olmali', async () => {
      const products = [
        { id: 'product-1', base_price: 200.00 },
        { id: 'product-2', base_price: 250.00 }
      ]

      mockOffersService.getAcceptedOfferForBranch.mockResolvedValue({
        data: {
          offer_details: [
            { product: { id: 'product-1' }, unit_price: 150.00 },
            { product: { id: 'product-2' }, unit_price: 200.00 }
          ]
        },
        error: null
      })

      const result = await PriceResolverService.resolvePricesForProducts(
        products,
        'customer-1',
        'branch-1',
        'dealer-1'
      )

      expect(result['product-1'].priceType).toBe('offer')
      expect(result['product-2'].priceType).toBe('offer')
    })

    it('hata durumunda tum urunler perakende fiyat olmali', async () => {
      const products = [
        { id: 'product-1', base_price: 200.00 },
        { id: 'product-2', base_price: 250.00 }
      ]

      mockOffersService.getAcceptedOfferForBranch.mockRejectedValue(new Error('Error'))

      const result = await PriceResolverService.resolvePricesForProducts(
        products,
        'customer-1',
        'branch-1',
        'dealer-1'
      )

      expect(result['product-1'].price).toBe(200.00)
      expect(result['product-1'].priceType).toBe('retail')
      expect(result['product-2'].price).toBe(250.00)
      expect(result['product-2'].priceType).toBe('retail')
    })
  })

  describe('Fiyat Oncelik Sirasi', () => {
    it('teklif fiyati perakendeden once gelmeli', async () => {
      // Ayni urun icin teklif fiyati var
      mockOffersService.getAcceptedOfferForBranch.mockResolvedValue({
        data: {
          offer_details: [
            { product: { id: 'product-1' }, unit_price: 100.00 } // Teklif: 100 TL
          ]
        },
        error: null
      })

      const result = await PriceResolverService.resolvePrice(
        'product-1',
        'customer-1',
        'branch-1',
        'dealer-1',
        200.00 // Perakende: 200 TL
      )

      // Teklif fiyati (100 TL) secilmeli
      expect(result.price).toBe(100.00)
      expect(result.priceType).toBe('offer')
    })
  })
})
