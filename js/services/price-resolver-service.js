/**
 * Price Resolver Service
 * Fiyat oncelik kurallarini uygular
 *
 * Oncelik sirasi:
 * 1. Aktif Teklif (accepted) -> "Size Ozel"
 * 2. Sehir Bazli Perakende Fiyat (retail_prices_by_city) -> "Perakende"
 * 3. Base Price (products.base_price) -> "Perakende"
 */

const PriceResolverService = {
    // Fiyat tipleri ve etiketleri
    PRICE_TYPES: {
        OFFER: { type: 'offer', label: 'Size Ozel', cssClass: 'size-ozel' },
        RETAIL: { type: 'retail', label: 'Perakende', cssClass: 'perakende' }
    },

    /**
     * Tek bir urun icin fiyat cozumle
     * @param {string} productId - Urun ID
     * @param {string} customerId - Musteri ID
     * @param {string} branchId - Sube ID
     * @param {string} dealerId - Bayi ID
     * @param {number} basePrice - Urunun perakende fiyati
     * @returns {Promise<{price: number, priceType: string, label: string, cssClass: string}>}
     */
    async resolvePrice(productId, customerId, branchId, dealerId, basePrice) {
        try {
            // 1. Aktif teklif kontrolu (musteri bazli - branchId artik gerekli degil)
            if (customerId && dealerId) {
                var offerPrice = await this._getOfferPrice(productId, customerId, branchId, dealerId);
                if (offerPrice !== null) {
                    return {
                        price: offerPrice,
                        priceType: this.PRICE_TYPES.OFFER.type,
                        label: this.PRICE_TYPES.OFFER.label,
                        cssClass: this.PRICE_TYPES.OFFER.cssClass
                    };
                }
            }

            // 2. Perakende fiyat (fallback)
            return {
                price: basePrice || 0,
                priceType: this.PRICE_TYPES.RETAIL.type,
                label: this.PRICE_TYPES.RETAIL.label,
                cssClass: this.PRICE_TYPES.RETAIL.cssClass
            };
        } catch (error) {
            console.error('PriceResolverService.resolvePrice error:', error);
            // Hata durumunda perakende fiyat dondur
            return {
                price: basePrice || 0,
                priceType: this.PRICE_TYPES.RETAIL.type,
                label: this.PRICE_TYPES.RETAIL.label,
                cssClass: this.PRICE_TYPES.RETAIL.cssClass
            };
        }
    },

    /**
     * Birden fazla urun icin toplu fiyat cozumle
     * @param {Array} products - Urun listesi [{id, base_price}]
     * @param {string} customerId - Musteri ID
     * @param {string} branchId - Sube ID
     * @param {string} dealerId - Bayi ID
     * @param {string} cityId - Sehir ID (opsiyonel, sehir bazli perakende fiyat icin)
     * @returns {Promise<Object>} - {productId: {price, priceType, label, cssClass, isInOffer, offerPrice, retailPrice}}
     */
    async resolvePricesForProducts(products, customerId, branchId, dealerId, cityId) {
        var result = {};
        var offerPrices = {};
        var cityPrices = {};

        try {
            // 1. Aktif teklif fiyatlarini al (tek sorguda) - musteri bazli
            if (customerId && dealerId) {
                offerPrices = await this._getOfferPricesForCustomer(customerId, dealerId);
            }

            // 2. Sehir bazli perakende fiyatlarini al
            if (cityId) {
                cityPrices = await this._getRetailPricesByCity(cityId);
            }

            // 3. Her urun icin oncelik sirasina gore fiyat belirle
            var self = this;
            products.forEach(function(product) {
                var productId = product.id;
                var basePrice = product.base_price || 0;

                // Perakende fiyati belirle (sehir bazli veya base price)
                var retailPrice = cityPrices[productId] !== undefined ? cityPrices[productId] : basePrice;

                // Urun teklifte mi?
                var isInOffer = offerPrices[productId] !== undefined;
                var offerPrice = isInOffer ? offerPrices[productId] : null;

                // Oncelik 1: Teklif fiyati (eger teklifte ise)
                if (isInOffer) {
                    result[productId] = {
                        price: offerPrice,
                        priceType: self.PRICE_TYPES.OFFER.type,
                        label: self.PRICE_TYPES.OFFER.label,
                        cssClass: self.PRICE_TYPES.OFFER.cssClass,
                        isInOffer: true,
                        offerPrice: offerPrice,
                        retailPrice: retailPrice
                    };
                    return;
                }

                // Oncelik 2: Sehir bazli perakende fiyat veya base price
                result[productId] = {
                    price: retailPrice,
                    priceType: self.PRICE_TYPES.RETAIL.type,
                    label: self.PRICE_TYPES.RETAIL.label,
                    cssClass: self.PRICE_TYPES.RETAIL.cssClass,
                    isInOffer: false,
                    offerPrice: null,
                    retailPrice: retailPrice
                };
            });

            return result;
        } catch (error) {
            console.error('PriceResolverService.resolvePricesForProducts error:', error);

            // Hata durumunda tum urunler icin perakende fiyat
            var self = this;
            products.forEach(function(product) {
                var basePrice = product.base_price || 0;
                result[product.id] = {
                    price: basePrice,
                    priceType: self.PRICE_TYPES.RETAIL.type,
                    label: self.PRICE_TYPES.RETAIL.label,
                    cssClass: self.PRICE_TYPES.RETAIL.cssClass,
                    isInOffer: false,
                    offerPrice: null,
                    retailPrice: basePrice
                };
            });
            return result;
        }
    },

    /**
     * Sehir bazli perakende fiyatlarini al
     * @private
     */
    async _getRetailPricesByCity(cityId) {
        var prices = {};
        if (!cityId) return prices;

        try {
            const { data, error } = await RetailPricesByCityService.getByCityId(cityId);
            if (error || !data) return prices;

            data.forEach(function(item) {
                if (item.product_id && item.retail_price) {
                    prices[item.product_id] = item.retail_price;
                }
            });

            return prices;
        } catch (error) {
            console.error('_getRetailPricesByCity error:', error);
            return prices;
        }
    },

    /**
     * Tekliften urun fiyatini al (musteri bazli)
     * @private
     */
    async _getOfferPrice(productId, customerId, branchId, dealerId) {
        try {
            // Musteri bazli teklif sistemi - getAcceptedOffer kullan
            var result = await OffersService.getAcceptedOffer(dealerId, customerId);

            if (result.error || !result.data) {
                return null;
            }

            var offer = result.data;
            var offerDetails = offer.offer_details || [];

            for (var i = 0; i < offerDetails.length; i++) {
                var detail = offerDetails[i];
                if (detail.product && detail.product.id === productId) {
                    return detail.unit_price;
                }
            }

            return null;
        } catch (error) {
            console.error('_getOfferPrice error:', error);
            return null;
        }
    },

    /**
     * Musteri icin tum teklif fiyatlarini al (toplu) - musteri bazli
     * @private
     */
    async _getOfferPricesForCustomer(customerId, dealerId) {
        var prices = {};

        try {
            // Musteri bazli teklif sistemi - getAcceptedOffer kullan
            var result = await OffersService.getAcceptedOffer(dealerId, customerId);

            if (result.error || !result.data) {
                return prices;
            }

            var offer = result.data;
            var offerDetails = offer.offer_details || [];

            offerDetails.forEach(function(detail) {
                if (detail.product && detail.product.id) {
                    prices[detail.product.id] = detail.unit_price;
                }
            });

            return prices;
        } catch (error) {
            console.error('_getOfferPricesForCustomer error:', error);
            return prices;
        }
    },

    /**
     * Fiyat etiketi HTML'i olustur
     * @param {string} priceType - Fiyat tipi (offer, retail)
     * @param {string} label - Etiket metni
     * @param {string} cssClass - CSS sinifi
     * @returns {string} HTML string
     */
    createPriceLabel(priceType, label, cssClass) {
        return '<span class="price-label ' + cssClass + '">' + label + '</span>';
    },

    /**
     * Fiyati formatla
     * @param {number} price - Fiyat
     * @returns {string} Formatli fiyat
     */
    formatPrice(price) {
        if (price === null || price === undefined) {
            return '0,00 TL';
        }
        return price.toLocaleString('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + ' TL';
    }
};

// Global erisim
window.PriceResolverService = PriceResolverService;
