// Global değişkenler
var currentProduct = null;
var allProducts = [];
var resolvedPrices = {}; // PriceResolverService'den gelen fiyatlar
var currentQuantity = 1;
var currentCustomerId = null;
var currentBranchId = null;
var currentDealerId = null;
var isProductFavorite = false; // Favori durumu

// Teklif durumu değişkenleri
var branchOfferStatus = null; // 'accepted', 'in_process', null
var hasDealerInDistrict = true; // İlçede bayi var mı?
var currentBranchInfo = null; // Seçili şube bilgisi
var currentOfferDealer = null; // Aktif teklifin bayi bilgisi

// URL'den product ID al
function getProductIdFromUrl() {
	var params = new URLSearchParams(window.location.search);
	return params.get('id');
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', async function() {
	var productId = getProductIdFromUrl();

	if (!productId) {
		showError('Ürün bulunamadı');
		return;
	}

	// Müşteri ID'sini al
	var customerId = sessionStorage.getItem('isyerim_customer_id');

	// Veritabanından sepeti yükle (login olmuşsa)
	if (customerId) {
		await CartService.loadFromDatabase(customerId);
	}

	// Sepet badge'ini güncelle
	updateCartBadge();

	// Ürün verilerini yükle
	await loadProductData(productId);
});

// Ürün verilerini yükle
async function loadProductData(productId) {
	try {
		// Ürünü getir
		var result = await ProductsService.getById(productId);
		if (result.error || !result.data) {
			showError('Ürün bulunamadı');
			return;
		}

		currentProduct = result.data;

		// Session'dan müşteri bilgilerini al
		currentCustomerId = sessionStorage.getItem('isyerim_customer_id');
		currentBranchId = sessionStorage.getItem('selected_address_id');
		currentDealerId = sessionStorage.getItem('isyerim_dealer_id');

		// Teklif durumu ve bayi kontrolu
		branchOfferStatus = null;
		hasDealerInDistrict = true;
		currentBranchInfo = null;

		if (currentBranchId && currentCustomerId) {
			// 1. Şube detayını al
			try {
				const { data: branch } = await BranchesService.getById(currentBranchId);
				currentBranchInfo = branch;

				// 2. Müşteri için teklif durumunu kontrol et (musteri bazli teklif sistemi)
				const { data: offers } = await OffersService.getByCustomerId(
					currentCustomerId,
					{} // tüm durumlar
				);

				if (offers && offers.length > 0) {
					// En son teklifi al
					var latestOffer = offers[0];
					if (latestOffer.status === 'accepted') {
						branchOfferStatus = 'accepted';
						currentOfferDealer = latestOffer.dealer; // Bayi bilgisini kaydet
					} else if (latestOffer.status === 'pending' || latestOffer.status === 'requested') {
						branchOfferStatus = 'in_process';
						currentOfferDealer = latestOffer.dealer; // Bayi bilgisini kaydet
					} else {
						branchOfferStatus = null;
						currentOfferDealer = null;
					}
				} else {
					branchOfferStatus = null;
					currentOfferDealer = null;
				}

				// 3. Teklif yoksa ilçede bayi var mı kontrol et
				if (!branchOfferStatus || branchOfferStatus !== 'accepted') {
					if (branch && branch.city && branch.district) {
						const { data: dealers } = await DealersService.getByDistrictWithMikroPazar(
							branch.city,
							branch.district,
							branch.district_id
						);
						hasDealerInDistrict = dealers && dealers.length > 0;
					}
				}

				console.log('Teklif durumu:', branchOfferStatus, 'Ilcede bayi var mi:', hasDealerInDistrict);
			} catch (offerErr) {
				console.error('Teklif durumu kontrol hatasi:', offerErr);
			}
		}

		// Tüm ürünleri getir (önerilen ürünler için)
		var allResult = await ProductsService.getAll();
		if (allResult.data) {
			allProducts = allResult.data;
		}

		// PriceResolverService ile fiyatları çözümle
		// Şube şehir ID'sini al
		var cityId = currentBranchInfo ? currentBranchInfo.city_id : null;

		resolvedPrices = await PriceResolverService.resolvePricesForProducts(
			allProducts,
			currentCustomerId,
			currentBranchId,
			currentDealerId,
			cityId
		);

		// Favori durumunu kontrol et
		var isyerimCustomerId = sessionStorage.getItem('isyerim_customer_id');
		if (isyerimCustomerId) {
			var favResult = await FavoritesService.isFavorite(isyerimCustomerId, productId);
			if (favResult.data) {
				isProductFavorite = true;
			}
		}

		// Sayfayı render et
		renderProductDetail();
		renderRecommendedProducts();

	} catch (err) {
		console.error('Ürün yükleme hatası:', err);
		showError('Ürün yüklenirken bir hata oluştu');
	}
}

// Ürün detayını render et
function renderProductDetail() {
	var container = document.getElementById('product-detail-content');

	// PriceResolverService'den çözümlenmiş fiyatı al
	var priceInfo = resolvedPrices[currentProduct.id] || {
		price: currentProduct.base_price || 0,
		label: 'Perakende',
		cssClass: 'perakende',
		isInOffer: false,
		offerPrice: null,
		retailPrice: currentProduct.base_price || 0
	};
	var formattedPrice = parseFloat(priceInfo.price).toLocaleString('tr-TR', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});

	// Ürün resim URL'i
	var imageUrl = currentProduct.image_url || './İpragaz Bayi_files/IPR-BAYI-12-kg-ipr-uzun.png';

	// Teknik özellikler
	var specs = [];
	if (currentProduct.color) specs.push({ label: 'Rengi', value: currentProduct.color });
	if (currentProduct.weight_kg) specs.push({ label: 'Kapasite', value: currentProduct.weight_kg + ' kg' });
	if (currentProduct.height_mm) specs.push({ label: 'Tüp Boyu', value: currentProduct.height_mm + ' mm' });
	if (currentProduct.diameter_mm) specs.push({ label: 'Tüp Çapı', value: currentProduct.diameter_mm + ' mm' });

	var specsHtml = specs.map(function(spec) {
		return '<div class="spec-item"><span class="spec-label">' + spec.label + '</span><span class="spec-value">' + spec.value + '</span></div>';
	}).join('');

	// Breadcrumb güncelle
	document.getElementById('breadcrumb-product-name').textContent = currentProduct.name;
	document.title = currentProduct.name + ' - İpragaz İşYerim';

	// Favori butonu class'ı
	var favBtnClass = isProductFavorite ? 'product-favorite-btn active' : 'product-favorite-btn';

	// YENİ: Kampanya badge ve fiyat elemanlari
	var campaignBadgeHtml = '';
	var strikeThroughHtml = '';
	var advantageLabelHtml = '';
	var actionButtonHtml = '';
	var quantityHtml = '';

	// Aktif teklif var ve urun teklifte mi?
	if (branchOfferStatus === 'accepted' && priceInfo.isInOffer) {
		// Teklifte olan urun - Kirmizi badge + ustu cizili fiyat + Sepete Ekle
		var offerPriceFormatted = parseFloat(priceInfo.offerPrice).toLocaleString('tr-TR', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		});
		var retailPriceFormatted = parseFloat(priceInfo.retailPrice).toLocaleString('tr-TR', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		});

		campaignBadgeHtml =
			'<div class="product-detail-campaign-badge">' +
				'<div class="badge-left">' +
					'<span class="badge-label">Tavsiye edilen kampanyali fiyat</span>' +
					'<div class="badge-original-price"><del>₺' + retailPriceFormatted + '</del></div>' +
					'<div class="badge-advantage-label">Avantajli Fiyat</div>' +
				'</div>' +
				'<div class="badge-price-wrapper">' +
					'<span class="badge-price">₺' + offerPriceFormatted + '</span>' +
					'<span class="badge-unit">/ Adet* KDV dahil</span>' +
				'</div>' +
			'</div>';

		strikeThroughHtml = '';  // Artik badge icinde
		advantageLabelHtml = ''; // Artik badge icinde

		// Miktar secici
		quantityHtml = '<div class="quantity-selector">' +
			'<button class="quantity-btn" id="decreaseBtn" onclick="decreaseQuantity()">−</button>' +
			'<input type="number" class="quantity-input" id="quantityInput" value="1" min="1" max="99" onchange="onQuantityChange()">' +
			'<button class="quantity-btn" id="increaseBtn" onclick="increaseQuantity()">+</button>' +
		'</div>';

		// Sepete Ekle butonu
		actionButtonHtml = '<button class="btn-add-to-cart" id="addToCartBtn" onclick="addToCart()">' +
			'<span>Sepete Ekle</span>' +
			'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
				'<path d="M9 18l6-6-6-6"/>' +
			'</svg>' +
		'</button>';
	} else if (branchOfferStatus === 'accepted' && !priceInfo.isInOffer) {
		// Aktif teklif var ama bu urun teklifte degil - Overlay goster
		actionButtonHtml = '<button class="btn-request-offer" onclick="showActiveOfferOverlay()">' +
			'<span>Teklif Al</span>' +
			'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
				'<path d="M9 18l6-6-6-6"/>' +
			'</svg>' +
		'</button>';
	} else if (branchOfferStatus === 'in_process') {
		// Teklif süreçte - Teklifi İncele
		actionButtonHtml = '<button class="btn-review-offer" onclick="goToOfferPage()">' +
			'<span>Teklifi Incele</span>' +
			'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
				'<path d="M9 18l6-6-6-6"/>' +
			'</svg>' +
		'</button>';
	} else {
		// Teklif yok - Teklif Al
		if (hasDealerInDistrict) {
			actionButtonHtml = '<button class="btn-request-offer" onclick="goToOfferPage()">' +
				'<span>Teklif Al</span>' +
				'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
					'<path d="M9 18l6-6-6-6"/>' +
				'</svg>' +
			'</button>';
		} else {
			actionButtonHtml = '<button class="btn-request-offer" onclick="showNoDealerOverlay()">' +
				'<span>Teklif Al</span>' +
				'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
					'<path d="M9 18l6-6-6-6"/>' +
				'</svg>' +
			'</button>';
		}
	}

	var html = '<div class="product-detail-grid">' +
		'<div class="product-image-container">' +
			'<button class="' + favBtnClass + '" id="favoriteBtn">' +
				'<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
			'</button>' +
			'<img src="' + imageUrl + '" alt="' + currentProduct.name + '">' +
		'</div>' +
		'<div class="product-info">' +
			'<h1 class="product-title">' + currentProduct.name + '</h1>' +
			campaignBadgeHtml +
			strikeThroughHtml +
			advantageLabelHtml +
			'<div class="product-price-info">' +
				'<div class="product-price-value">₺' + formattedPrice + ' <span class="price-label ' + priceInfo.cssClass + '">' + priceInfo.label + '</span></div>' +
				'<div class="product-price-label">/ Adet* KDV dahil</div>' +
			'</div>' +
			(currentProduct.description ? '<p class="product-description">' + currentProduct.description + '</p>' : '') +
			'<div class="quantity-cart-row">' +
				quantityHtml +
				actionButtonHtml +
			'</div>' +
			(specs.length > 0 ?
				'<div class="accordion-section open" id="specsAccordion">' +
					'<div class="accordion-header" onclick="toggleAccordion(\'specsAccordion\')">' +
						'<span class="accordion-title">Teknik Özellikler</span>' +
						'<svg class="accordion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>' +
					'</div>' +
					'<div class="accordion-content">' +
						'<div class="accordion-body">' +
							'<div class="specs-list">' + specsHtml + '</div>' +
						'</div>' +
					'</div>' +
				'</div>' : '') +
			(currentProduct.warnings ?
				'<div class="accordion-section open" id="warningsAccordion">' +
					'<div class="accordion-header" onclick="toggleAccordion(\'warningsAccordion\')">' +
						'<span class="accordion-title">Uyarılar</span>' +
						'<svg class="accordion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>' +
					'</div>' +
					'<div class="accordion-content">' +
						'<div class="accordion-body">' +
							'<p class="warnings-text">' + currentProduct.warnings + '</p>' +
						'</div>' +
					'</div>' +
				'</div>' : '') +
		'</div>' +
	'</div>';

	container.innerHTML = html;

	// Favori butonuna event listener ekle
	document.getElementById('favoriteBtn').addEventListener('click', async function() {
		var customerId = sessionStorage.getItem('isyerim_customer_id');
		if (!customerId) {
			alert('Favorilere eklemek icin giris yapmaniz gerekiyor.');
			return;
		}

		var btn = this;
		var result = await FavoritesService.toggleFavorite(customerId, currentProduct.id);
		if (result.error) {
			console.error('Favori hatasi:', result.error);
			return;
		}

		// UI guncelle
		isProductFavorite = result.data.isFavorite;
		if (isProductFavorite) {
			btn.classList.add('active');
		} else {
			btn.classList.remove('active');
		}
	});
}

// Önerilen ürünleri render et
function renderRecommendedProducts() {
	var container = document.getElementById('recommended-products');

	// Mevcut ürünü filtrele
	var otherProducts = allProducts.filter(function(p) {
		return p.id !== currentProduct.id;
	});

	// Rastgele 3 ürün seç
	var shuffled = otherProducts.sort(function() { return 0.5 - Math.random(); });
	var recommended = shuffled.slice(0, 3);

	if (recommended.length === 0) {
		container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666;">Önerilen ürün bulunamadı</p>';
		return;
	}

	var html = recommended.map(function(product) {
		var priceInfo = resolvedPrices[product.id] || {
			price: product.base_price || 0,
			label: 'Perakende',
			cssClass: 'perakende',
			isInOffer: false,
			offerPrice: null,
			retailPrice: product.base_price || 0
		};
		var formattedPrice = parseFloat(priceInfo.price).toLocaleString('tr-TR', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		});
		var imageUrl = product.image_url || './İpragaz Bayi_files/IPR-BAYI-12-kg-ipr-uzun.png';

		// YENİ: Kampanya badge ve fiyat elemanlari
		var campaignBadgeHtml = '';
		var strikeThroughHtml = '';
		var advantageLabelHtml = '';
		var cardClass = '';
		var buttonHtml = '';

		// Aktif teklif var ve urun teklifte mi?
		if (branchOfferStatus === 'accepted' && priceInfo.isInOffer) {
			// Teklifte olan urun
			var offerPriceFormatted = parseFloat(priceInfo.offerPrice).toLocaleString('tr-TR', {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			});
			var retailPriceFormatted = parseFloat(priceInfo.retailPrice).toLocaleString('tr-TR', {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			});

			campaignBadgeHtml =
				'<div class="product-campaign-badge">' +
					'<span class="badge-label">Tavsiye edilen kampanyali fiyat</span>' +
					'<span class="badge-price">₺' + offerPriceFormatted + '</span>' +
				'</div>';

			strikeThroughHtml = '<div class="product-original-price"><del>₺' + retailPriceFormatted + '</del></div>';
			advantageLabelHtml = '<div class="product-advantage-label">Avantajli Fiyat</div>';
			cardClass = ' in-offer';
			buttonHtml = '<button class="btn-card-add-cart" onclick="event.stopPropagation(); addRecommendedToCart(this, \'' + product.id + '\')">Sepete Ekle</button>';
		} else if (branchOfferStatus === 'accepted' && !priceInfo.isInOffer) {
			// Aktif teklif var ama bu urun teklifte degil - Overlay goster
			cardClass = ' not-in-offer';
			buttonHtml = '<button class="btn-request-offer" onclick="event.stopPropagation(); showActiveOfferOverlay(event)">Teklif Al</button>';
		} else if (branchOfferStatus === 'in_process') {
			// Teklif süreçte
			cardClass = ' offer-pending';
			buttonHtml = '<button class="btn-review-offer" onclick="event.stopPropagation(); goToOfferPage()">Teklifi Incele</button>';
		} else {
			// Teklif yok
			cardClass = ' no-offer';
			buttonHtml = '<button class="btn-request-offer" onclick="event.stopPropagation(); goToOfferPage()">Teklif Al</button>';
		}

		return '<div class="product-card' + cardClass + '" data-product-id="' + product.id + '" onclick="goToProductDetail(\'' + product.id + '\')">' +
			campaignBadgeHtml +
			'<button class="product-card-favorite" onclick="event.stopPropagation(); toggleCardFavorite(this)">' +
				'<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
			'</button>' +
			'<div class="product-card-image">' +
				'<img src="' + imageUrl + '" alt="' + product.name + '">' +
			'</div>' +
			'<div class="product-card-name">' + product.name + '</div>' +
			strikeThroughHtml +
			advantageLabelHtml +
			'<div class="product-card-price">₺' + formattedPrice + ' <span class="price-label ' + priceInfo.cssClass + '">' + priceInfo.label + '</span></div>' +
			buttonHtml +
		'</div>';
	}).join('');

	container.innerHTML = html;
}

// Bayi değişikliğinde fiyatları yenile
window.refreshPrices = async function() {
	// Güncel bayi/şube bilgilerini sessionStorage'dan al
	currentBranchId = sessionStorage.getItem('selected_address_id');
	currentDealerId = sessionStorage.getItem('isyerim_dealer_id');

	// Şube bilgisini yeniden al (city_id için)
	var cityId = null;
	if (currentBranchId) {
		try {
			const { data: branch } = await BranchesService.getById(currentBranchId);
			if (branch) {
				currentBranchInfo = branch;
				cityId = branch.city_id;
			}
		} catch (err) {
			console.error('Sube bilgisi alinamadi:', err);
		}
	}

	// PriceResolverService ile fiyatları yeniden çözümle
	resolvedPrices = await PriceResolverService.resolvePricesForProducts(
		allProducts,
		currentCustomerId,
		currentBranchId,
		currentDealerId,
		cityId
	);

	// Sayfayı yeniden render et
	renderProductDetail();
	renderRecommendedProducts();
};

// Accordion toggle
function toggleAccordion(id) {
	var accordion = document.getElementById(id);
	accordion.classList.toggle('open');
}

// Miktar azalt
function decreaseQuantity() {
	var input = document.getElementById('quantityInput');
	if (!input) return;
	if (currentQuantity > 1) {
		currentQuantity--;
		input.value = currentQuantity;
		updateQuantityButtons();
	}
}

// Miktar artır
function increaseQuantity() {
	var input = document.getElementById('quantityInput');
	if (!input) return;
	if (currentQuantity < 99) {
		currentQuantity++;
		input.value = currentQuantity;
		updateQuantityButtons();
	}
}

// Miktar değişikliği
function onQuantityChange() {
	var input = document.getElementById('quantityInput');
	if (!input) return;
	var value = parseInt(input.value) || 1;
	value = Math.max(1, Math.min(99, value));
	currentQuantity = value;
	input.value = currentQuantity;
	updateQuantityButtons();
}

// Buton durumlarını güncelle
function updateQuantityButtons() {
	var decreaseBtn = document.getElementById('decreaseBtn');
	var increaseBtn = document.getElementById('increaseBtn');
	if (decreaseBtn) decreaseBtn.disabled = currentQuantity <= 1;
	if (increaseBtn) increaseBtn.disabled = currentQuantity >= 99;
}

// Sepete ekle
async function addToCart() {
	if (!currentProduct) return;

	// Çözümlenmiş fiyatı al
	var priceInfo = resolvedPrices[currentProduct.id] || { price: currentProduct.base_price || 0 };
	var btn = document.getElementById('addToCartBtn');

	// Ürünü sepete ekle
	await CartService.addItem({
		id: currentProduct.id,
		code: currentProduct.code,
		name: currentProduct.name,
		price: priceInfo.price,
		points: currentProduct.points_per_unit || 0,
		image_url: currentProduct.image_url
	}, currentQuantity);

	// Badge'i güncelle
	updateCartBadge();

	// Buton animasyonu
	btn.innerHTML = '<span>Eklendi ✓</span>';
	btn.classList.add('added');

	setTimeout(function() {
		btn.innerHTML = '<span>Sepete Ekle</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>';
		btn.classList.remove('added');
	}, 1500);
}

// Önerilen ürünü sepete ekle
async function addRecommendedToCart(btn, productId) {
	var product = allProducts.find(function(p) { return p.id === productId; });
	if (!product) return;

	// Çözümlenmiş fiyatı al
	var priceInfo = resolvedPrices[product.id] || { price: product.base_price || 0 };

	await CartService.addItem({
		id: product.id,
		code: product.code,
		name: product.name,
		price: priceInfo.price,
		points: product.points_per_unit || 0,
		image_url: product.image_url
	});

	updateCartBadge();

	// Buton animasyonu
	var originalText = btn.textContent;
	btn.textContent = 'Eklendi ✓';
	btn.classList.add('added');

	setTimeout(function() {
		btn.textContent = originalText;
		btn.classList.remove('added');
	}, 1500);
}

// Ürün detayına git
function goToProductDetail(productId) {
	window.location.href = 'isyerim-musteri-urun-detay.html?id=' + productId;
}

// Kart favorisini toggle
function toggleCardFavorite(btn) {
	btn.classList.toggle('active');
}

// Sepet badge güncelleme
function updateCartBadge() {
	var count = CartService.getItemCount();
	var badge = document.getElementById('cartBadge');
	if (badge) {
		if (count > 0) {
			badge.textContent = count;
			badge.style.display = 'flex';
		} else {
			badge.style.display = 'none';
		}
	}
}

// Hata göster
function showError(message) {
	var container = document.getElementById('product-detail-content');
	container.innerHTML = '<div class="error-message">' +
		'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
			'<circle cx="12" cy="12" r="10"/>' +
			'<line x1="12" y1="8" x2="12" y2="12"/>' +
			'<line x1="12" y1="16" x2="12.01" y2="16"/>' +
		'</svg>' +
		'<p>' + message + '</p>' +
		'<a href="isyerim-musteri-anasayfa.html" style="color: #e31e24; margin-top: 15px; display: inline-block;">← Anasayfaya Dön</a>' +
	'</div>';

	// Önerilen ürünleri gizle
	document.querySelector('.recommended-section').style.display = 'none';
}

// Sepet güncellendiğinde badge'i güncelle
window.addEventListener('cartUpdated', function() {
	updateCartBadge();
});

// =============================================
// TEKLIF DURUMU FONKSIYONLARI
// =============================================

// Teklif sayfasına git (guvenlik kontrolu ile)
function goToOfferPage() {
	var branchId = sessionStorage.getItem('selected_address_id');
	if (!branchId) {
		alert('Lutfen bir sube seciniz.');
		return;
	}

	// SecurityOverlay ile kontrol et
	SecurityOverlay.checkAndProceed(branchId, function() {
		window.location.href = 'isyerim-musteri-teklif-iste.html';
	});
}

// Bayi yok overlay'ı göster
function showNoDealerOverlay() {
	var overlay = document.getElementById('noDealerOverlay');
	if (overlay) {
		overlay.classList.add('active');
		document.body.style.overflow = 'hidden';
	}
}

// Overlay kapat
function closeNoDealerOverlay() {
	var overlay = document.getElementById('noDealerOverlay');
	if (overlay) {
		overlay.classList.remove('active');
		document.body.style.overflow = '';
	}
}

// =============================================
// AKTIF TEKLIF OVERLAY - URUN TEKLIFTE DEGIL
// =============================================

// Aktif teklif overlay'i goster
function showActiveOfferOverlay(e) {
	if (e) {
		e.preventDefault();
		e.stopPropagation();
	}

	var overlay = document.getElementById('activeOfferOverlay');
	var dealerInfoEl = document.getElementById('activeOfferDealerInfo');

	// Bayi bilgisini doldur
	if (dealerInfoEl && currentOfferDealer) {
		var name = currentOfferDealer.name || 'Bayiniz';
		var phone = currentOfferDealer.phone || '';
		if (phone) {
			dealerInfoEl.innerHTML = '<strong>' + name + '</strong> - <a href="tel:' + phone.replace(/\s/g, '') + '">' + phone + '</a>';
		} else {
			dealerInfoEl.innerHTML = '<strong>' + name + '</strong> ile iletisime gecin.';
		}
	}

	if (overlay) {
		overlay.classList.add('active');
		document.body.style.overflow = 'hidden';
	}
}

// Aktif teklif overlay'i kapat
function closeActiveOfferOverlay() {
	var overlay = document.getElementById('activeOfferOverlay');
	if (overlay) {
		overlay.classList.remove('active');
		document.body.style.overflow = '';
	}
}

// Teklif detayina git
function goToOfferDetail() {
	closeActiveOfferOverlay();
	window.location.href = 'isyerim-musteri-teklif-iste.html';
}

// Overlay'e tıklayınca kapat
document.addEventListener('DOMContentLoaded', function() {
	var overlay = document.getElementById('noDealerOverlay');
	if (overlay) {
		overlay.addEventListener('click', function(e) {
			if (e.target === this) {
				closeNoDealerOverlay();
			}
		});
	}

	// Aktif teklif overlay'e tiklaninca kapat
	var activeOfferOverlay = document.getElementById('activeOfferOverlay');
	if (activeOfferOverlay) {
		activeOfferOverlay.addEventListener('click', function(e) {
			if (e.target === this) {
				closeActiveOfferOverlay();
			}
		});
	}

	// Security overlay componentini yukle
	if (typeof ComponentLoader !== 'undefined') {
		ComponentLoader.loadSecurityOverlay();
	}
});
