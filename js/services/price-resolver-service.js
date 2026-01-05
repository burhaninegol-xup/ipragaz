/**
 * Price Resolver Service
 * Fiyat oncelik kurallarini uygular
 *
 * Oncelik sirasi:
 * 1. Aktif Teklif (accepted) -> "Size Ozel"
 * 2. Bayi Barem Fiyati (ilk kademe) -> "Bayi Ozel"
 * 3. Perakende Fiyat (base_price) -> "Perakende"
 */

const PriceResolverService = {
    // Fiyat tipleri ve etiketleri
    PRICE_TYPES: {
        OFFER: { type: 'offer', label: 'Size Ozel', cssClass: 'size-ozel' },
        BAREM: { type: 'barem', label: 'Bayi Ozel', cssClass: 'bayi-ozel' },
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
            // 1. Aktif teklif kontrolu
            if (customerId && branchId && dealerId) {
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

            // 2. Barem fiyat kontrolu
            if (dealerId) {
                var baremPrice = await this._getBaremPrice(productId, dealerId);
                if (baremPrice !== null) {
                    return {
                        price: baremPrice,
                        priceType: this.PRICE_TYPES.BAREM.type,
                        label: this.PRICE_TYPES.BAREM.label,
                        cssClass: this.PRICE_TYPES.BAREM.cssClass
                    };
                }
            }

            // 3. Perakende fiyat (fallback)
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
     * @returns {Promise<Object>} - {productId: {price, priceType, label, cssClass}}
     */
    async resolvePricesForProducts(products, customerId, branchId, dealerId) {
        var result = {};
        var offerPrices = {};
        var baremPrices = {};

        try {
            // 1. Aktif teklif fiyatlarini al (tek sorguda)
            if (customerId && branchId && dealerId) {
                offerPrices = await this._getOfferPricesForBranch(customerId, branchId, dealerId);
            }

            // 2. Barem fiyatlarini al (tek sorguda)
            if (dealerId) {
                baremPrices = await this._getBaremPricesForDealer(dealerId);
            }

            // 3. Her urun icin oncelik sirasina gore fiyat belirle
            var self = this;
            products.forEach(function(product) {
                var productId = product.id;
                var basePrice = product.base_price || 0;

                // Oncelik 1: Teklif fiyati
                if (offerPrices[productId] !== undefined) {
                    result[productId] = {
                        price: offerPrices[productId],
                        priceType: self.PRICE_TYPES.OFFER.type,
                        label: self.PRICE_TYPES.OFFER.label,
                        cssClass: self.PRICE_TYPES.OFFER.cssClass
                    };
                    return;
                }

                // Oncelik 2: Barem fiyati
                if (baremPrices[productId] !== undefined) {
                    result[productId] = {
                        price: baremPrices[productId],
                        priceType: self.PRICE_TYPES.BAREM.type,
                        label: self.PRICE_TYPES.BAREM.label,
                        cssClass: self.PRICE_TYPES.BAREM.cssClass
                    };
                    return;
                }

                // Oncelik 3: Perakende fiyat
                result[productId] = {
                    price: basePrice,
                    priceType: self.PRICE_TYPES.RETAIL.type,
                    label: self.PRICE_TYPES.RETAIL.label,
                    cssClass: self.PRICE_TYPES.RETAIL.cssClass
                };
            });

            return result;
        } catch (error) {
            console.error('PriceResolverService.resolvePricesForProducts error:', error);

            // Hata durumunda tum urunler icin perakende fiyat
            var self = this;
            products.forEach(function(product) {
                result[product.id] = {
                    price: product.base_price || 0,
                    priceType: self.PRICE_TYPES.RETAIL.type,
                    label: self.PRICE_TYPES.RETAIL.label,
                    cssClass: self.PRICE_TYPES.RETAIL.cssClass
                };
            });
            return result;
        }
    },

    /**
     * Tekliften urun fiyatini al
     * @private
     */
    async _getOfferPrice(productId, customerId, branchId, dealerId) {
        try {
            var result = await OffersService.getAcceptedOfferForBranch(dealerId, customerId, branchId);

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
     * Sube icin tum teklif fiyatlarini al (toplu)
     * @private
     */
    async _getOfferPricesForBranch(customerId, branchId, dealerId) {
        var prices = {};

        try {
            var result = await OffersService.getAcceptedOfferForBranch(dealerId, customerId, branchId);

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
            console.error('_getOfferPricesForBranch error:', error);
            return prices;
        }
    },

    /**
     * Baremden urun fiyatini al (ilk kademe - min_quantity=1)
     * @private
     */
    async _getBaremPrice(productId, dealerId) {
        try {
            var result = await BaremPricesService.getByDealerAndProduct(dealerId, productId);

            if (result.error || !result.data || result.data.length === 0) {
                return null;
            }

            // Barem'ler min_quantity'ye gore sirali geliyor
            // Ilk kademe = min_quantity=1 olan
            var firstTier = result.data.find(function(barem) {
                return barem.min_quantity === 1;
            });

            if (firstTier) {
                return firstTier.unit_price;
            }

            // min_quantity=1 yoksa ilk kademeyi al
            return result.data[0].unit_price;
        } catch (error) {
            console.error('_getBaremPrice error:', error);
            return null;
        }
    },

    /**
     * Bayi icin tum barem fiyatlarini al (toplu - ilk kademeler)
     * @private
     */
    async _getBaremPricesForDealer(dealerId) {
        var prices = {};

        try {
            var result = await BaremPricesService.getByDealer(dealerId);

            if (result.error || !result.data) {
                return prices;
            }

            // Her urun icin ilk kademe fiyatini al
            var productBarems = {};

            result.data.forEach(function(barem) {
                var productId = barem.product_id;

                if (!productBarems[productId]) {
                    productBarems[productId] = [];
                }
                productBarems[productId].push(barem);
            });

            // Her urun icin min_quantity=1 olan veya en dusuk min_quantity olan fiyati al
            Object.keys(productBarems).forEach(function(productId) {
                var barems = productBarems[productId];

                // min_quantity=1 olan ara
                var firstTier = barems.find(function(b) {
                    return b.min_quantity === 1;
                });

                if (firstTier) {
                    prices[productId] = firstTier.unit_price;
                } else if (barems.length > 0) {
                    // min_quantity'ye gore en kucuk olani al
                    barems.sort(function(a, b) {
                        return a.min_quantity - b.min_quantity;
                    });
                    prices[productId] = barems[0].unit_price;
                }
            });

            return prices;
        } catch (error) {
            console.error('_getBaremPricesForDealer error:', error);
            return prices;
        }
    },

    /**
     * Fiyat etiketi HTML'i olustur
     * @param {string} priceType - Fiyat tipi (offer, barem, retail)
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
