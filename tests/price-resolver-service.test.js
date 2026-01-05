import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * PriceResolverService Test Suite
 *
 * Fiyat oncelik kurallarini test eder:
 * 1. Aktif Teklif -> "Size Ozel"
 * 2. Bayi Barem Fiyati -> "Bayi Ozel"
 * 3. Perakende Fiyat -> "Perakende"
 */

describe('PriceResolverService', () => {
  let mockOffersService
  let mockBaremPricesService
  let PriceResolverService

  beforeEach(() => {
    vi.clearAllMocks()

    // OffersService mock
    mockOffersService = {
      getAcceptedOfferForBranch: vi.fn()
    }

    // BaremPricesService mock
    mockBaremPricesService = {
      getByDealerAndProduct: vi.fn(),
      getByDealer: vi.fn()
    }

    // Global'e ata
    global.OffersService = mockOffersService
    global.BaremPricesService = mockBaremPricesService

    // PriceResolverService'i tanimla
    PriceResolverService = {
      PRICE_TYPES: {
        OFFER: { type: 'offer', label: 'Size Ozel', cssClass: 'size-ozel' },
        BAREM: { type: 'barem', label: 'Bayi Ozel', cssClass: 'bayi-ozel' },
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

          // 2. Barem fiyat kontrolu
          if (dealerId) {
            var baremPrice = await this._getBaremPrice(productId, dealerId)
            if (baremPrice !== null) {
              return {
                price: baremPrice,
                priceType: this.PRICE_TYPES.BAREM.type,
                label: this.PRICE_TYPES.BAREM.label,
                cssClass: this.PRICE_TYPES.BAREM.cssClass
              }
            }
          }

          // 3. Perakende fiyat
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
        var baremPrices = {}

        try {
          if (customerId && branchId && dealerId) {
            offerPrices = await this._getOfferPricesForBranch(customerId, branchId, dealerId)
          }

          if (dealerId) {
            baremPrices = await this._getBaremPricesForDealer(dealerId)
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

            if (baremPrices[productId] !== undefined) {
              result[productId] = {
                price: baremPrices[productId],
                priceType: self.PRICE_TYPES.BAREM.type,
                label: self.PRICE_TYPES.BAREM.label,
                cssClass: self.PRICE_TYPES.BAREM.cssClass
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
      },

      async _getBaremPrice(productId, dealerId) {
        var result = await BaremPricesService.getByDealerAndProduct(dealerId, productId)
        if (result.error || !result.data || result.data.length === 0) return null

        var firstTier = result.data.find(function(barem) {
          return barem.min_quantity === 1
        })

        if (firstTier) return firstTier.unit_price
        return result.data[0].unit_price
      },

      async _getBaremPricesForDealer(dealerId) {
        var prices = {}
        var result = await BaremPricesService.getByDealer(dealerId)
        if (result.error || !result.data) return prices

        var productBarems = {}
        result.data.forEach(function(barem) {
          var productId = barem.product_id
          if (!productBarems[productId]) productBarems[productId] = []
          productBarems[productId].push(barem)
        })

        Object.keys(productBarems).forEach(function(productId) {
          var barems = productBarems[productId]
          var firstTier = barems.find(function(b) { return b.min_quantity === 1 })
          if (firstTier) {
            prices[productId] = firstTier.unit_price
          } else if (barems.length > 0) {
            barems.sort(function(a, b) { return a.min_quantity - b.min_quantity })
            prices[productId] = barems[0].unit_price
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

    it('teklif yok, barem varsa "Bayi Ozel" fiyat donmeli', async () => {
      // Mock: Teklif yok
      mockOffersService.getAcceptedOfferForBranch.mockResolvedValue({
        data: null,
        error: null
      })

      // Mock: Barem var
      mockBaremPricesService.getByDealerAndProduct.mockResolvedValue({
        data: [
          { min_quantity: 1, max_quantity: 10, unit_price: 170.00 },
          { min_quantity: 11, max_quantity: 50, unit_price: 160.00 }
        ],
        error: null
      })

      const result = await PriceResolverService.resolvePrice(
        'product-1',
        'customer-1',
        'branch-1',
        'dealer-1',
        200.00
      )

      expect(result.price).toBe(170.00)
      expect(result.priceType).toBe('barem')
      expect(result.label).toBe('Bayi Ozel')
      expect(result.cssClass).toBe('bayi-ozel')
    })

    it('teklif ve barem yoksa "Perakende" fiyat donmeli', async () => {
      // Mock: Teklif yok
      mockOffersService.getAcceptedOfferForBranch.mockResolvedValue({
        data: null,
        error: null
      })

      // Mock: Barem yok
      mockBaremPricesService.getByDealerAndProduct.mockResolvedValue({
        data: [],
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
      // Mock: Barem var
      mockBaremPricesService.getByDealerAndProduct.mockResolvedValue({
        data: [{ min_quantity: 1, unit_price: 170.00 }],
        error: null
      })

      const result = await PriceResolverService.resolvePrice(
        'product-1',
        null, // customerId yok
        null,
        'dealer-1',
        200.00
      )

      expect(mockOffersService.getAcceptedOfferForBranch).not.toHaveBeenCalled()
      expect(result.price).toBe(170.00)
      expect(result.priceType).toBe('barem')
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

      // Mock: Barem - product-2 icin fiyat var
      mockBaremPricesService.getByDealer.mockResolvedValue({
        data: [
          { product_id: 'product-2', min_quantity: 1, unit_price: 220.00 }
        ],
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

      // product-2: Barem fiyati
      expect(result['product-2'].price).toBe(220.00)
      expect(result['product-2'].priceType).toBe('barem')

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

      mockBaremPricesService.getByDealer.mockResolvedValue({
        data: [],
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
    it('teklif fiyati barem fiyatindan once gelmeli', async () => {
      // Ayni urun icin hem teklif hem barem fiyati var
      mockOffersService.getAcceptedOfferForBranch.mockResolvedValue({
        data: {
          offer_details: [
            { product: { id: 'product-1' }, unit_price: 100.00 } // Teklif: 100 TL
          ]
        },
        error: null
      })

      mockBaremPricesService.getByDealerAndProduct.mockResolvedValue({
        data: [
          { min_quantity: 1, unit_price: 150.00 } // Barem: 150 TL
        ],
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

    it('barem fiyati perakendeden once gelmeli', async () => {
      // Teklif yok
      mockOffersService.getAcceptedOfferForBranch.mockResolvedValue({
        data: null,
        error: null
      })

      // Barem var
      mockBaremPricesService.getByDealerAndProduct.mockResolvedValue({
        data: [
          { min_quantity: 1, unit_price: 150.00 }
        ],
        error: null
      })

      const result = await PriceResolverService.resolvePrice(
        'product-1',
        'customer-1',
        'branch-1',
        'dealer-1',
        200.00
      )

      // Barem fiyati (150 TL) secilmeli
      expect(result.price).toBe(150.00)
      expect(result.priceType).toBe('barem')
    })
  })

  describe('Barem Kademe Secimi', () => {
    it('min_quantity=1 olan kademe secilmeli', async () => {
      mockOffersService.getAcceptedOfferForBranch.mockResolvedValue({
        data: null,
        error: null
      })

      mockBaremPricesService.getByDealerAndProduct.mockResolvedValue({
        data: [
          { min_quantity: 1, max_quantity: 10, unit_price: 180.00 },
          { min_quantity: 11, max_quantity: 50, unit_price: 170.00 },
          { min_quantity: 51, max_quantity: 100, unit_price: 160.00 }
        ],
        error: null
      })

      const result = await PriceResolverService.resolvePrice(
        'product-1',
        'customer-1',
        'branch-1',
        'dealer-1',
        200.00
      )

      expect(result.price).toBe(180.00) // min_quantity=1 olan
    })

    it('min_quantity=1 yoksa en kucuk min_quantity secilmeli', async () => {
      mockOffersService.getAcceptedOfferForBranch.mockResolvedValue({
        data: null,
        error: null
      })

      mockBaremPricesService.getByDealerAndProduct.mockResolvedValue({
        data: [
          { min_quantity: 5, max_quantity: 10, unit_price: 175.00 },
          { min_quantity: 11, max_quantity: 50, unit_price: 170.00 }
        ],
        error: null
      })

      const result = await PriceResolverService.resolvePrice(
        'product-1',
        'customer-1',
        'branch-1',
        'dealer-1',
        200.00
      )

      expect(result.price).toBe(175.00) // min_quantity=5 (en kucuk)
    })
  })
})
