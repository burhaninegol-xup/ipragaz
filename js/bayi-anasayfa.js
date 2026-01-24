// Auth kontrol - giris yapilmamissa login'e yonlendir
if (!bayiAuthCheck()) {
	throw new Error('Auth required');
}

// Bayi componentlerini yukle
document.addEventListener('DOMContentLoaded', function() {
	ComponentLoader.loadBayiComponents();

	// Hoş geldiniz mesajını güncelle
	var dealerName = sessionStorage.getItem('bayi_dealer_name');
	if (dealerName) {
		document.getElementById('welcomeTitle').textContent = 'Hoş Geldiniz, ' + dealerName;
	}
});

$(document).ready(async function() {
	var currentDealerId = null;
	var salesData = {};
	var productMap = {};
	var products = []; // Supabase'den yüklenen ürünler

	// Loading overlay
	function showLoading() {
		if (!$('#loading-overlay').length) {
			$('body').append('<div id="loading-overlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(255,255,255,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;"><div style="text-align:center;"><div style="width:40px;height:40px;border:3px solid #e0e0e0;border-top-color:#002c77;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 15px;"></div><div style="color:#333;font-size:14px;">Yükleniyor...</div></div></div>');
			$('head').append('<style>@keyframes spin{to{transform:rotate(360deg)}}</style>');
		}
		$('#loading-overlay').show();
	}

	function hideLoading() {
		$('#loading-overlay').hide();
	}

	// Ürünleri Supabase'den yükle
	async function loadProducts() {
		try {
			const { data, error } = await ProductsService.getAll();
			if (!error && data) {
				products = data;
				renderProductCards();
			}
		} catch (err) {
			console.error('Ürünler yüklenemedi:', err);
		}
	}

	// Ürün koduna göre imaj URL'i belirle
	function getProductImageUrl(product) {
		// Önce veritabanındaki image_url kontrol et
		if (product.image_url) {
			return product.image_url;
		}

		// Ürün kodu veya ismine göre imaj eşleştir
		var code = (product.code || '').toUpperCase();
		var name = (product.name || '').toLowerCase();

		// 12 KG Uzun
		if (code.includes('12') && (code.includes('UZUN') || name.includes('uzun'))) {
			return './İpragaz Bayi_files/IPR-BAYI-12-kg-ipr-uzun.png';
		}
		// 12 KG İzopro
		if (code.includes('12') && (code.includes('IZO') || name.includes('izo') || name.includes('izopro'))) {
			return './İpragaz Bayi_files/IPR-BAYI-12kg-izo-pro.png';
		}
		// 24 KG Sanayi
		if (code.includes('24') && (code.includes('SAN') || name.includes('sanayi'))) {
			return './İpragaz Bayi_files/IPR-BAYI-24kg-sanayi.png';
		}
		// 45 KG Sanayi
		if (code.includes('45') && (code.includes('SAN') || name.includes('sanayi'))) {
			return './İpragaz Bayi_files/IPR-BAYI-45kg-sanayi.png';
		}

		// Default imaj
		return './İpragaz Bayi_files/IPR-BAYI-12-kg-ipr-uzun.png';
	}

	// Ürün kartlarını dinamik render et
	function renderProductCards() {
		var html = '';
		products.forEach(function(product) {
			var imageUrl = getProductImageUrl(product);
			html += '<div class="product-sale-card" data-product-id="' + product.id + '">' +
				'<div class="product-image">' +
					'<img src="' + imageUrl + '" alt="' + product.name + '">' +
				'</div>' +
				'<div class="product-name">' + product.name + '</div>' +
				'<div class="product-count">' +
					'<svg viewBox="0 0 24 24" fill="currentColor">' +
						'<path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.49 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>' +
					'</svg>' +
					'<span class="count-value">0</span> adet' +
				'</div>' +
			'</div>';
		});
		$('#products-grid').html(html);
	}

	// Dashboard verilerini yükle
	async function loadDashboardData() {
		showLoading();
		try {
			// Bayi ID'sini sessionStorage'dan al
			currentDealerId = sessionStorage.getItem('bayi_dealer_id');
			if (!currentDealerId) {
				console.error('Dealer ID bulunamadı');
				hideLoading();
				return;
			}

			// Önce ürünleri yükle (satış kartları için gerekli)
			await loadProducts();

			// Paralel olarak diğer verileri çek
			await Promise.all([
				loadOrderStats(),
				loadSalesData(),
				loadLimitAlerts()
			]);

			hideLoading();
		} catch (err) {
			hideLoading();
			console.error('Dashboard yükleme hatası:', err);
		}
	}

	// Sipariş istatistiklerini yükle
	async function loadOrderStats() {
		try {
			const [waitingResult, onTheWayResult, totalResult] = await Promise.all([
				OrdersService.getWaitingCount(currentDealerId),
				OrdersService.getOnTheWayCount(currentDealerId),
				OrdersService.getTotalCount(currentDealerId, getTodayStart())
			]);

			// Stat kartlarını güncelle
			$('.stat-card.danger .stat-number').text(waitingResult.data || 0);
			$('.stat-card.warning .stat-number').text(onTheWayResult.data || 0);
			$('.stat-card.primary .stat-number').text(totalResult.data || 0);
		} catch (err) {
			console.error('Sipariş istatistikleri hatası:', err);
		}
	}

	// Satış verilerini yükle
	async function loadSalesData() {
		try {
			// Tarih aralıklarını hesapla
			var now = new Date();
			var weekStart = new Date(now);
			weekStart.setDate(now.getDate() - 7);

			var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
			var lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
			var lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
			var yearStart = new Date(now.getFullYear(), 0, 1);

			// Satış verilerini çek
			const [weekData, monthData, lastMonthData, yearData] = await Promise.all([
				OrdersService.getSalesStats(currentDealerId, weekStart.toISOString(), now.toISOString()),
				OrdersService.getSalesStats(currentDealerId, monthStart.toISOString(), now.toISOString()),
				OrdersService.getSalesStats(currentDealerId, lastMonthStart.toISOString(), lastMonthEnd.toISOString()),
				OrdersService.getSalesStats(currentDealerId, yearStart.toISOString(), now.toISOString())
			]);

			// Satış verilerini işle ve sakla
			salesData = {
				week: processSalesStats(weekData.data || {}),
				month: processSalesStats(monthData.data || {}),
				lastmonth: processSalesStats(lastMonthData.data || {}),
				year: processSalesStats(yearData.data || {})
			};

			// İlk yükleme - haftalık veriyi göster
			updateSalesCards('week');
		} catch (err) {
			console.error('Satış verileri hatası:', err);
		}
	}

	// Satış istatistiklerini işle
	function processSalesStats(stats) {
		var result = {};

		// Tüm ürünler için 0 ile başlat
		products.forEach(function(p) {
			result[p.id] = 0;
		});

		// Satış verilerini ürün ID'lerine göre eşle
		Object.values(stats).forEach(function(item) {
			if (item.product && item.product.id) {
				result[item.product.id] = item.totalQuantity;
			}
		});

		return result;
	}

	// Satış kartlarını güncelle
	function updateSalesCards(period) {
		var data = salesData[period] || {};
		$('.product-sale-card').each(function() {
			var $card = $(this);
			var productId = $card.data('product-id');
			var newValue = data[productId] || 0;
			$card.find('.count-value').text(newValue);
		});
	}

	// Limit uyarılarını yükle (yeni offers sistemi üzerinden)
	async function loadLimitAlerts() {
		try {
			// Bayinin kabul edilmiş tekliflerini getir (offers + offer_details)
			const { data: offers } = await OffersService.getCustomersWithAcceptedOffers(currentDealerId);
			if (!offers) return;

			// Uyarı veren müşterileri filtrele
			var alertCustomers = [];
			offers.forEach(function(offer) {
				if (!offer.customer || !offer.customer.is_active) return;

				var warnings = [];
				(offer.offer_details || []).forEach(function(detail) {
					// commitment_quantity > 0 olan ve %50'nin altında tüketen ürünleri bul
					if (detail.commitment_quantity > 0) {
						var thisMonth = detail.this_month_quantity || 0;
						var percent = (thisMonth / detail.commitment_quantity) * 100;
						if (percent < 50) {
							warnings.push({
								product: detail.product,
								current: thisMonth,
								commitment: detail.commitment_quantity,
								percent: Math.round(percent)
							});
						}
					}
				});

				if (warnings.length > 0) {
					alertCustomers.push({ customer: offer.customer, warnings: warnings });
				}
			});

			// Limit alerts bölümünü render et
			renderLimitAlerts(alertCustomers);
		} catch (err) {
			console.error('Limit uyarıları hatası:', err);
		}
	}

	// Limit alerts render
	function renderLimitAlerts(alertCustomers) {
		var $list = $('.limit-alerts-list');
		var $count = $('.alert-count');

		$count.text(alertCustomers.length + ' Müşteri');
		$list.empty();

		if (alertCustomers.length === 0) {
			$list.html('<div style="text-align:center;padding:40px;color:#666;"><p>Limit uyarısı bulunmuyor</p></div>');
			return;
		}

		alertCustomers.forEach(function(item) {
			var warningsHtml = item.warnings.map(function(w) {
				var levelClass = w.percent < 25 ? 'low' : (w.percent < 50 ? 'medium' : 'good');
				return '<div class="product-row">' +
					'<span class="product-name">' + (w.product ? w.product.name.substring(0, 10) : 'Ürün') + '</span>' +
					'<div class="product-stats">' +
						'<span class="stat-text">' + w.current + '/' + w.commitment + ' adet</span>' +
						'<div class="progress-bar"><div class="progress ' + levelClass + '" style="width: ' + w.percent + '%"></div></div>' +
						'<span class="percent-badge ' + levelClass + '">%' + w.percent + '</span>' +
					'</div>' +
				'</div>';
			}).join('');

			var html = '<div class="limit-alert-item">' +
				'<div class="customer-header">' +
					'<div class="customer-avatar"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>' +
					'<div class="customer-name">' + item.customer.name + '</div>' +
					'<span class="product-count-badge">' + item.warnings.length + ' ürün</span>' +
				'</div>' +
				'<div class="product-groups">' + warningsHtml + '</div>' +
			'</div>';

			$list.append(html);
		});
	}

	// Bugünün başlangıcını al
	function getTodayStart() {
		var today = new Date();
		today.setHours(0, 0, 0, 0);
		return today.toISOString();
	}

	// Period selector with data update
	$('.period-btn').on('click', function() {
		var $btn = $(this);
		var period = $btn.data('period');

		// Update active state
		$('.period-btn').removeClass('active');
		$btn.addClass('active');

		// Update sales data with animation
		var data = salesData[period];
		if (data) {
			$('.product-sale-card').each(function() {
				var $card = $(this);
				var productId = $card.data('product-id');
				var newValue = data[productId] || 0;
				var $countValue = $card.find('.count-value');
				var currentValue = parseInt($countValue.text()) || 0;

				// Animate the number change
				$card.addClass('updating');

				$({ count: currentValue }).animate({ count: newValue }, {
					duration: 400,
					easing: 'swing',
					step: function() {
						$countValue.text(Math.floor(this.count));
					},
					complete: function() {
						$countValue.text(newValue);
						$card.removeClass('updating');
					}
				});
			});
		}
	});

	// Dashboard verilerini yükle
	loadDashboardData();
});
