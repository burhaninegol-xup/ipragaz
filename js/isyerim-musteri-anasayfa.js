// Welcome Popup - Close Function
function closeWelcomePopup() {
	var popup = document.getElementById('welcomePopup');
	if (popup) {
		popup.style.opacity = '0';
		setTimeout(function() {
			popup.style.display = 'none';
		}, 300);
	}
}

// Hero Slider
(function() {
	var slides = document.getElementById('heroSlides');
	var dots = document.querySelectorAll('.hero-dot');
	var currentSlide = 0;
	var totalSlides = 4;
	var autoSlideInterval;

	function goToSlide(index) {
		currentSlide = index;
		slides.style.transform = 'translateX(-' + (currentSlide * 100) + '%)';

		// Update dots
		dots.forEach(function(dot, i) {
			dot.classList.toggle('active', i === currentSlide);
		});
	}

	function nextSlide() {
		currentSlide = (currentSlide + 1) % totalSlides;
		goToSlide(currentSlide);
	}

	// Auto-slide every 5 seconds
	function startAutoSlide() {
		autoSlideInterval = setInterval(nextSlide, 5000);
	}

	function stopAutoSlide() {
		clearInterval(autoSlideInterval);
	}

	// Dot click handlers
	dots.forEach(function(dot) {
		dot.addEventListener('click', function() {
			var slideIndex = parseInt(this.getAttribute('data-slide'));
			goToSlide(slideIndex);
			// Reset auto-slide timer
			stopAutoSlide();
			startAutoSlide();
		});
	});

	// Start auto-slide
	startAutoSlide();

	// Pause on hover
	var heroSection = document.querySelector('.hero');
	heroSection.addEventListener('mouseenter', stopAutoSlide);
	heroSection.addEventListener('mouseleave', startAutoSlide);
})();

// Global değişkenler
var products = [];
var resolvedPrices = {}; // PriceResolverService'den gelen fiyatlar
var currentCustomerId = null;
var currentBranchId = null;
var currentDealerId = null;
var favoriteIds = []; // Favori urun ID'leri

// Teklif durumu değişkenleri
var branchOfferStatus = null; // 'accepted', 'in_process', null
var hasDealerInDistrict = true; // İlçede bayi var mı?
var currentBranchInfo = null; // Seçili şube bilgisi

// Ürünleri Supabase'den yükle
async function loadProducts() {
	try {
		// Ürünleri çek
		const { data: productsData, error } = await ProductsService.getAll();
		if (error) throw new Error(error);

		products = productsData || [];

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

				// 2. Şube için teklif durumunu kontrol et
				const { data: offers } = await OffersService.getByBranchId(
					currentCustomerId,
					currentBranchId,
					{} // tüm durumlar
				);

				if (offers && offers.length > 0) {
					// En son teklifi al
					var latestOffer = offers[0];
					if (latestOffer.status === 'accepted') {
						branchOfferStatus = 'accepted';
					} else if (latestOffer.status === 'pending' || latestOffer.status === 'requested') {
						branchOfferStatus = 'in_process';
					} else {
						branchOfferStatus = null;
					}
				} else {
					branchOfferStatus = null;
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

		// PriceResolverService ile fiyatları çözümle
		// Şube şehir ID'sini al
		var cityId = currentBranchInfo ? currentBranchInfo.city_id : null;

		resolvedPrices = await PriceResolverService.resolvePricesForProducts(
			products,
			currentCustomerId,
			currentBranchId,
			currentDealerId,
			cityId
		);

		// Favorileri yükle (giriş yapılmışsa)
		var isyerimCustomerId = sessionStorage.getItem('isyerim_customer_id');
		if (isyerimCustomerId) {
			const { data: favIds } = await FavoritesService.getFavoriteIds(isyerimCustomerId);
			if (favIds) {
				favoriteIds = favIds;
			}
		}

		// Ürünleri render et
		renderProducts();
	} catch (err) {
		console.error('Ürün yükleme hatası:', err);
		document.getElementById('products-grid').innerHTML =
			'<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;"><p>Ürünler yüklenirken hata oluştu</p></div>';
	}
}

// Ürün kartı oluştur
function createProductCard(product) {
	// PriceResolverService'den çözümlenmiş fiyatı al
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

	// Ürün resim URL'i
	var imageUrl = product.image_url || './İpragaz Bayi_files/IPR-BAYI-12-kg-ipr-uzun.png';

	// Favori durumu kontrol
	var isFavorite = favoriteIds.indexOf(product.id) !== -1;
	var favoriteClass = isFavorite ? 'product-favorite active' : 'product-favorite';

	// YENİ: Kampanya badge ve fiyat elemanlari
	var campaignBadgeHtml = '';
	var strikeThroughHtml = '';
	var advantageLabelHtml = '';
	var cardClass = '';
	var buttonHtml = '';

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
			'<div class="product-campaign-badge">' +
				'<span class="badge-label">Tavsiye edilen<br>kampanyali fiyat</span>' +
				'<span class="badge-price">₺' + offerPriceFormatted + '</span>' +
			'</div>';

		strikeThroughHtml = '<div class="product-original-price"><del>₺' + retailPriceFormatted + '</del></div>';
		advantageLabelHtml = '<div class="product-advantage-label">Avantajli Fiyat</div>';
		cardClass = ' in-offer';
		buttonHtml = '<button class="btn-add-cart">Sepete Ekle</button>';
	} else if (branchOfferStatus === 'accepted' && !priceInfo.isInOffer) {
		// Aktif teklif var ama bu urun teklifte degil - Teklif Al
		cardClass = ' not-in-offer';
		if (hasDealerInDistrict) {
			buttonHtml = '<button class="btn-request-offer" onclick="goToOfferPage(event)">Teklif Al</button>';
		} else {
			buttonHtml = '<button class="btn-request-offer" onclick="showNoDealerOverlay(event)">Teklif Al</button>';
		}
	} else if (branchOfferStatus === 'in_process') {
		// Teklif süreçte - Teklifi İncele
		buttonHtml = '<button class="btn-review-offer" onclick="goToOfferPage(event)">Teklifi Incele</button>';
		cardClass = ' offer-pending';
	} else {
		// Teklif yok - Teklif Al
		if (hasDealerInDistrict) {
			buttonHtml = '<button class="btn-request-offer" onclick="goToOfferPage(event)">Teklif Al</button>';
		} else {
			buttonHtml = '<button class="btn-request-offer" onclick="showNoDealerOverlay(event)">Teklif Al</button>';
		}
		cardClass = ' no-offer';
	}

	return '<div class="product-card' + cardClass + '" data-product-id="' + product.id + '" style="cursor: pointer;">' +
		campaignBadgeHtml +
		'<button class="' + favoriteClass + '">' +
			'<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
		'</button>' +
		'<div class="product-image">' +
			'<img src="' + imageUrl + '" alt="' + product.name + '">' +
		'</div>' +
		'<div class="product-name">' + product.name + '</div>' +
		strikeThroughHtml +
		advantageLabelHtml +
		'<div class="product-price">₺' + formattedPrice + ' <span class="price-label ' + priceInfo.cssClass + '">' + priceInfo.label + '</span></div>' +
		buttonHtml +
	'</div>';
}

// Fiyatları yeniden yükle (bayi değişikliğinde çağrılacak)
async function refreshPrices() {
	// SessionStorage'dan güncel değerleri al
	currentCustomerId = sessionStorage.getItem('customer_id');
	currentBranchId = sessionStorage.getItem('selected_branch_id');
	currentDealerId = sessionStorage.getItem('isyerim_dealer_id') || sessionStorage.getItem('dealer_id');

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

	// Fiyatları yeniden çözümle
	resolvedPrices = await PriceResolverService.resolvePricesForProducts(
		products,
		currentCustomerId,
		currentBranchId,
		currentDealerId,
		cityId
	);

	// Ürün kartlarını yeniden render et
	renderProducts();
}

// Global erişim için window'a ata
window.refreshPrices = refreshPrices;

// =============================================
// TEKLIF DURUMU FONKSIYONLARI
// =============================================

// Teklif sayfasına git
function goToOfferPage(e) {
	e.preventDefault();
	e.stopPropagation();
	window.location.href = 'isyerim-musteri-teklif-iste.html';
}

// Bayi yok overlay'ı göster
function showNoDealerOverlay(e) {
	e.preventDefault();
	e.stopPropagation();
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
});

// Ürünleri render et
function renderProducts() {
	var grid = document.getElementById('products-grid');
	grid.innerHTML = '';

	if (products.length === 0) {
		grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;"><p>Ürün bulunamadı</p></div>';
		return;
	}

	// YENİ: Teklifte olan ürünleri başa al (sadece aktif teklif varsa)
	var sortedProducts = products.slice();
	if (branchOfferStatus === 'accepted') {
		sortedProducts.sort(function(a, b) {
			var aInOffer = resolvedPrices[a.id] && resolvedPrices[a.id].isInOffer;
			var bInOffer = resolvedPrices[b.id] && resolvedPrices[b.id].isInOffer;
			if (aInOffer && !bInOffer) return -1;
			if (!aInOffer && bInOffer) return 1;
			return 0;
		});
	}

	sortedProducts.forEach(function(product) {
		grid.innerHTML += createProductCard(product);
	});

	// Event listener'ları bağla
	bindProductEvents();
}

// Ürün event'lerini bağla
function bindProductEvents() {
	// Ürün kartına tıklama - detay sayfasına git
	document.querySelectorAll('.product-card').forEach(function(card) {
		card.addEventListener('click', function(e) {
			var productId = this.getAttribute('data-product-id');
			window.location.href = 'isyerim-musteri-urun-detay.html?id=' + productId;
		});
	});

	// Favorite Toggle
	document.querySelectorAll('.product-favorite').forEach(function(btn) {
		btn.addEventListener('click', async function(e) {
			e.preventDefault();
			e.stopPropagation(); // Kartın tıklanmasını engelle

			var customerId = sessionStorage.getItem('isyerim_customer_id');
			if (!customerId) {
				alert('Favorilere eklemek icin giris yapmaniz gerekiyor.');
				return;
			}

			var productCard = this.closest('.product-card');
			var productId = productCard.getAttribute('data-product-id');
			var btn = this;

			// Toggle favorite
			var result = await FavoritesService.toggleFavorite(customerId, productId);
			if (result.error) {
				console.error('Favori hatasi:', result.error);
				return;
			}

			// UI guncelle
			if (result.data.isFavorite) {
				btn.classList.add('active');
				favoriteIds.push(productId);
			} else {
				btn.classList.remove('active');
				var idx = favoriteIds.indexOf(productId);
				if (idx !== -1) favoriteIds.splice(idx, 1);
			}
		});
	});

	// Sepete Ekle
	document.querySelectorAll('.btn-add-cart').forEach(function(btn) {
		btn.addEventListener('click', async function(e) {
			e.preventDefault();
			e.stopPropagation(); // Kartın tıklanmasını engelle

			var productCard = this.closest('.product-card');
			var productId = productCard.getAttribute('data-product-id');

			// Ürünü bul
			var product = products.find(function(p) { return p.id === productId; });
			if (!product) return;

			// Çözümlenmiş fiyatı al
			var priceInfo = resolvedPrices[product.id] || { price: product.base_price || 0 };

			// Ürünü sepete ekle (async)
			await CartService.addItem({
				id: product.id,
				code: product.code,
				name: product.name,
				price: priceInfo.price,
				points: product.points_per_unit || 0,
				image_url: product.image_url
			});

			// Badge'i güncelle
			updateCartBadge();

			// Buton animasyonu göster
			showAddedFeedback(this);
		});
	});
}

// Sepet badge güncelleme
function updateCartBadge() {
	var badge = document.getElementById('cartBadge');
	if (!badge) return; // Component henuz yuklenmemis olabilir

	var count = CartService.getItemCount();
	if (count > 0) {
		badge.textContent = count;
		badge.style.display = 'flex';
	} else {
		badge.style.display = 'none';
	}
}

// Buton animasyonu
function showAddedFeedback(button) {
	var originalText = button.textContent;
	button.textContent = 'Eklendi ✓';
	button.classList.add('added');

	setTimeout(function() {
		button.textContent = originalText;
		button.classList.remove('added');
	}, 1500);
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', async function() {
	// Müşteri ID'sini al
	var customerId = sessionStorage.getItem('isyerim_customer_id');

	// Veritabanından sepeti yükle (login olmuşsa)
	if (customerId) {
		console.log('Sepet veritabanından yükleniyor...');
		await CartService.loadFromDatabase(customerId);
	}

	// Ürünleri yükle
	loadProducts();

	// Sepet badge'ini güncelle
	updateCartBadge();

	// Son siparisi yukle (buton icin)
	loadLastOrder();

	// Pending teklif countdown kontrolu (sadece owner icin)
	loadPendingOfferCountdown();
});

// Sepet güncellendiğinde badge'i güncelle
window.addEventListener('cartUpdated', function() {
	updateCartBadge();
});

// Profile Dropdown Toggle artik component-loader.js tarafindan yonetiliyor

// =============================================
// REPEAT ORDER FUNCTIONALITY
// =============================================
var lastOrder = null;
var selectedTimeSlot = null;

// Son siparisi yukle
async function loadLastOrder() {
	// DEBUG: Tüm ilgili sessionStorage değerlerini logla
	console.log('=== REPEAT ORDER DEBUG ===');
	console.log('isyerim_customer_id:', sessionStorage.getItem('isyerim_customer_id'));
	console.log('isyerim_customer_user_id:', sessionStorage.getItem('isyerim_customer_user_id'));
	console.log('customer_id:', sessionStorage.getItem('customer_id'));
	console.log('isyerim_branch_id:', sessionStorage.getItem('isyerim_branch_id'));
	console.log('==========================');

	var customerId = sessionStorage.getItem('isyerim_customer_id');
	if (!customerId) {
		console.log('Musteri giris yapmamis, son siparis yuklenmiyor');
		return;
	}

	try {
		console.log('OrdersService.getByCustomerId cagiriliyor, customerId:', customerId);
		const { data: orders, error } = await OrdersService.getByCustomerId(customerId, 1);
		console.log('OrdersService sonucu:', { orders, error });

		if (error) {
			console.error('Son siparis yukleme hatasi:', error);
			return;
		}

		if (orders && orders.length > 0) {
			lastOrder = orders[0];
			// Butonu goster
			document.getElementById('repeatOrderSection').classList.add('visible');
			console.log('Son siparis yuklendi, buton gosteriliyor:', lastOrder);

			// Dinamik metin olustur
			var branchName = sessionStorage.getItem('selected_branch_name') || sessionStorage.getItem('isyerim_branch_name') || null;
			var dealerName = lastOrder.dealer ? lastOrder.dealer.name : 'bayiniz';
			var orderDate = formatOrderDate(lastOrder.created_at);
			var descText = '';
			if (branchName) {
				descText = '<strong>' + branchName + '</strong> subeniz icin <strong>' + dealerName + '</strong> bayisinden verdiginiz <strong>' + orderDate + '</strong> tarihli siparisinizi tekrarlayabilirsiniz.';
			} else {
				descText = '<strong>' + dealerName + '</strong> bayisinden verdiginiz <strong>' + orderDate + '</strong> tarihli siparisinizi tekrarlayabilirsiniz.';
			}
			document.getElementById('repeatOrderDescription').innerHTML = descText;
		} else {
			console.log('Son siparis bulunamadi - orders bos veya null');
		}
	} catch (err) {
		console.error('Son siparis yukleme exception:', err);
	}
}

// Repeat order modal ac
function openRepeatOrderModal() {
	if (!lastOrder) {
		alert('Son siparis bulunamadi');
		return;
	}

	// Modal icerigini olustur
	var bodyHtml = '';

	// Sube bilgisi (en ustte)
	var branchName = sessionStorage.getItem('selected_branch_name') || '';
	var branchAddress = sessionStorage.getItem('selected_branch_address') || '';
	if (branchName) {
		bodyHtml += '<div class="repeat-order-branch">' +
			'<div class="repeat-order-branch-icon">' +
				'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
					'<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>' +
					'<polyline points="9 22 9 12 15 12 15 22"/>' +
				'</svg>' +
				'<span class="repeat-order-branch-label">Teslimat Adresi</span>' +
			'</div>' +
			'<div class="repeat-order-branch-name">' + branchName + '</div>' +
			(branchAddress ? '<div class="repeat-order-branch-address">' + branchAddress + '</div>' : '') +
		'</div>';
	}

	// Bayi bilgisi
	var dealer = lastOrder.dealer || {};
	var dealerName = dealer.name || 'Bayi';
	var dealerPhone = dealer.phone || '';
	var dealerLocation = '';
	if (dealer.district && dealer.city) {
		dealerLocation = dealer.district + ', ' + dealer.city;
	} else if (dealer.city) {
		dealerLocation = dealer.city;
	}

	bodyHtml += '<div class="repeat-order-dealer">' +
		'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
			'<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>' +
			'<circle cx="12" cy="10" r="3"/>' +
		'</svg>' +
		'<div class="repeat-order-dealer-info">' +
			'<div class="repeat-order-dealer-name">Bayi: ' + dealerName + '</div>' +
			(dealerPhone ? '<div class="repeat-order-dealer-phone">Tel: ' + dealerPhone + '</div>' : '') +
			(dealerLocation ? '<div class="repeat-order-dealer-location">' + dealerLocation + '</div>' : '') +
		'</div>' +
	'</div>';

	// Siparis kalemleri
	bodyHtml += '<div class="repeat-order-items-title">Siparis Kalemleri</div>';
	bodyHtml += '<div class="repeat-order-items">';

	var total = 0;
	if (lastOrder.order_items && lastOrder.order_items.length > 0) {
		lastOrder.order_items.forEach(function(item) {
			var imageUrl = item.product && item.product.image_url ? item.product.image_url : './İpragaz Bayi_files/IPR-BAYI-12-kg-ipr-uzun.png';
			var productName = item.product ? item.product.name : 'Urun';
			var itemTotal = parseFloat(item.total_price) || (item.quantity * item.unit_price);
			total += itemTotal;

			bodyHtml += '<div class="repeat-order-item">' +
				'<div class="repeat-order-item-image">' +
					'<img src="' + imageUrl + '" alt="' + productName + '">' +
				'</div>' +
				'<div class="repeat-order-item-info">' +
					'<div class="repeat-order-item-name">' + productName + '</div>' +
					'<div class="repeat-order-item-qty">x' + item.quantity + '</div>' +
				'</div>' +
				'<div class="repeat-order-item-price">' + formatPrice(itemTotal) + '</div>' +
			'</div>';
		});
	}
	bodyHtml += '</div>';

	// Zaman slotlari
	bodyHtml += '<div class="time-slots-title">Teslimat Zamani Secin</div>';
	bodyHtml += '<div class="time-slots" id="timeSlots">';
	var timeSlots = generateTimeSlots();
	timeSlots.forEach(function(slot, index) {
		var selectedClass = index === 0 ? ' selected' : '';
		bodyHtml += '<div class="time-slot' + selectedClass + '" data-slot-index="' + index + '" onclick="selectTimeSlot(' + index + ')">' +
			'<div class="time-slot-hour">' + slot.hour + '</div>' +
			'<div class="time-slot-day">' + slot.label + '</div>' +
		'</div>';
	});
	bodyHtml += '</div>';

	// Ilk slotu varsayilan olarak sec
	selectedTimeSlot = timeSlots[0];

	// Toplam
	bodyHtml += '<div class="repeat-order-total">' +
		'<span class="repeat-order-total-label">Toplam</span>' +
		'<span class="repeat-order-total-value">' + formatPrice(total) + '</span>' +
	'</div>';

	// Butonlar
	bodyHtml += '<div class="repeat-order-actions">' +
		'<button class="btn-repeat-edit" onclick="editRepeatOrder()">Siparisi Duzenle</button>' +
		'<button class="btn-repeat-submit" id="btnRepeatSubmit" onclick="submitRepeatOrder()">Siparis Ver</button>' +
	'</div>';

	document.getElementById('repeatOrderBody').innerHTML = bodyHtml;
	document.getElementById('repeatOrderOverlay').classList.add('active');
	document.body.style.overflow = 'hidden';
}

// Modal kapat
function closeRepeatOrderModal() {
	document.getElementById('repeatOrderOverlay').classList.remove('active');
	document.body.style.overflow = '';
}

// Overlay'e tiklayinca kapat
document.getElementById('repeatOrderOverlay').addEventListener('click', function(e) {
	if (e.target === this) {
		closeRepeatOrderModal();
	}
});

// Zaman slotlarini olustur (sabit 3'er saatlik araliklar)
function generateTimeSlots() {
	return [
		{ hour: '09:00 - 12:00', label: 'Sabah' },
		{ hour: '12:00 - 15:00', label: 'Ogle' },
		{ hour: '15:00 - 18:00', label: 'Aksam' }
	];
}

// Bugun mu kontrolu
function isToday(date) {
	var today = new Date();
	return date.getDate() === today.getDate() &&
		   date.getMonth() === today.getMonth() &&
		   date.getFullYear() === today.getFullYear();
}

// Zaman slotu sec
function selectTimeSlot(index) {
	var slots = document.querySelectorAll('.time-slot');
	slots.forEach(function(slot, i) {
		slot.classList.toggle('selected', i === index);
	});

	var timeSlots = generateTimeSlots();
	selectedTimeSlot = timeSlots[index];
}

// Fiyat formatlama
function formatPrice(amount) {
	return '₺' + parseFloat(amount).toLocaleString('tr-TR', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
}

// Siparis tarihi formatlama (gg.aa.yyyy)
function formatOrderDate(dateString) {
	var date = new Date(dateString);
	var day = date.getDate().toString().padStart(2, '0');
	var month = (date.getMonth() + 1).toString().padStart(2, '0');
	var year = date.getFullYear();
	return day + '.' + month + '.' + year;
}

// Siparisi gonder
async function submitRepeatOrder() {
	if (!lastOrder || !selectedTimeSlot) {
		alert('Lutfen bir teslimat zamani secin');
		return;
	}

	var submitBtn = document.getElementById('btnRepeatSubmit');
	submitBtn.disabled = true;
	submitBtn.textContent = 'Gonderiliyor...';

	try {
		// Sepete urunleri ekle
		for (var i = 0; i < lastOrder.order_items.length; i++) {
			var item = lastOrder.order_items[i];
			await CartService.addItem({
				id: item.product.id,
				code: item.product.code,
				name: item.product.name,
				price: item.unit_price,
				points: item.points || 0,
				image_url: item.product.image_url
			}, item.quantity);
		}

		// Badge'i guncelle
		updateCartBadge();

		// Modalı kapat
		closeRepeatOrderModal();

		// Sepet sayfasina yonlendir
		alert('Urunler sepete eklendi! Sepet sayfasina yonlendiriliyorsunuz...');
		window.location.href = 'isyerim-musteri-sepet.html';

	} catch (err) {
		console.error('Siparis gonderme hatasi:', err);
		alert('Siparis gonderilirken bir hata olustu. Lutfen tekrar deneyin.');
		submitBtn.disabled = false;
		submitBtn.textContent = 'Siparis Ver';
	}
}

// Siparisi duzenle - sepeti temizle, urunleri ekle ve sepet sayfasina yonlendir
async function editRepeatOrder() {
	if (!lastOrder) {
		alert('Son siparis bulunamadi');
		return;
	}

	try {
		// 1. Mevcut sepeti temizle
		await CartService.clearCart();

		// 2. Siparis urunlerini sepete ekle
		for (var i = 0; i < lastOrder.order_items.length; i++) {
			var item = lastOrder.order_items[i];
			await CartService.addItem({
				id: item.product.id,
				code: item.product.code,
				name: item.product.name,
				price: item.unit_price,
				points: item.points || 0,
				image_url: item.product.image_url
			}, item.quantity);
		}

		// 3. Badge'i guncelle
		updateCartBadge();

		// 4. Modali kapat
		closeRepeatOrderModal();

		// 5. Sepet sayfasina yonlendir
		window.location.href = 'isyerim-musteri-sepet.html';

	} catch (err) {
		console.error('Siparis duzenleme hatasi:', err);
		alert('Siparis duzenlenirken bir hata olustu. Lutfen tekrar deneyin.');
	}
}

// =============================================
// PENDING OFFER COUNTDOWN FUNCTIONALITY
// =============================================
var countdownInterval = null;
var pendingOffer = null;

// Pending teklif kontrolu ve countdown baslatma
async function loadPendingOfferCountdown() {
	// Sadece owner kullanicilar icin
	var userRole = sessionStorage.getItem('isyerim_user_role');
	if (userRole !== 'owner') {
		console.log('Countdown: Kullanici owner degil, gosterilmiyor');
		return;
	}

	var customerId = sessionStorage.getItem('isyerim_customer_id');
	if (!customerId) {
		console.log('Countdown: Musteri ID bulunamadi');
		return;
	}

	try {
		// Pending teklifleri getir
		const { data: offers, error } = await OffersService.getByCustomerId(customerId, { status: 'pending' });

		if (error) {
			console.error('Pending teklif yukleme hatasi:', error);
			return;
		}

		if (offers && offers.length > 0) {
			var offerCount = offers.length;
			console.log('Pending teklif bulundu:', offerCount, 'adet');

			// En erken deadline'i bul (OfferLogsService kullanarak)
			var earliestDeadline = null;
			for (var i = 0; i < offers.length; i++) {
				var offer = offers[i];
				try {
					var logsResult = await OfferLogsService.getByOfferId(offer.id);
					if (logsResult.data && logsResult.data.length > 0) {
						var lastSentLog = logsResult.data.find(function(log) {
							return log.action === 'price_updated' || log.action === 'created';
						});
						if (lastSentLog) {
							var deadline = new Date(new Date(lastSentLog.created_at).getTime() + (24 * 60 * 60 * 1000));
							if (!earliestDeadline || deadline < earliestDeadline) {
								earliestDeadline = deadline;
							}
						}
					}
				} catch (logErr) {
					console.error('Log yukleme hatasi:', logErr);
				}
			}

			if (!earliestDeadline) {
				console.log('Countdown: Deadline hesaplanamadi');
				return;
			}

			// UI metnini guncelle
			var titleEl = document.getElementById('offerCountdownTitle');
			var descEl = document.getElementById('offerCountdownDesc');

			if (offerCount === 1) {
				titleEl.textContent = 'Teklif Onay Bekliyor';
				descEl.textContent = 'Teklifinizi onaylamaniz bekleniyor';
			} else {
				titleEl.textContent = offerCount + ' Adet Teklif Bekliyor';
				descEl.textContent = 'Tekliflerinizi onaylamaniz bekleniyor';
			}

			// Countdown kutusunu goster
			var countdownBtn = document.getElementById('btnOfferCountdown');
			countdownBtn.classList.add('visible');

			// Section'i da goster (eger son siparis yoksa bile)
			document.getElementById('repeatOrderSection').classList.add('visible');

			// Countdown'i baslat (en erken deadline'a gore)
			startCountdown(earliestDeadline);
		} else {
			console.log('Pending teklif bulunamadi');
		}
	} catch (err) {
		console.error('Pending teklif yukleme exception:', err);
	}
}

// Countdown baslat
function startCountdown(deadline) {
	// Hemen bir kere guncelle
	updateCountdownDisplay(deadline);

	// Her saniye guncelle
	countdownInterval = setInterval(function() {
		updateCountdownDisplay(deadline);
	}, 1000);
}

// Countdown gostergesini guncelle
function updateCountdownDisplay(deadline) {
	var now = new Date().getTime();
	var timeLeft = deadline.getTime() - now;

	var timerElement = document.getElementById('countdownTimer');
	var countdownBtn = document.getElementById('btnOfferCountdown');

	if (timeLeft <= 0) {
		// Sure doldu
		timerElement.textContent = 'Sure doldu!';
		timerElement.style.background = 'rgba(255, 0, 0, 0.3)';
		clearInterval(countdownInterval);
		return;
	}

	// Saat ve dakika hesapla
	var hours = Math.floor(timeLeft / (1000 * 60 * 60));
	var minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

	// Format: "23 saat 12 dk"
	var displayText = hours + ' saat ' + minutes + ' dk';
	timerElement.textContent = displayText;
}
