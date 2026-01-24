// Auth kontrol - giris yapilmamissa login'e yonlendir
if (!bayiAuthCheck()) {
	throw new Error('Auth required');
}

// Bayi componentlerini yukle
document.addEventListener('DOMContentLoaded', function() {
	ComponentLoader.loadBayiComponents();
});

$(document).ready(async function() {
	var allCustomers = [];
	var currentDealerId = null;

	// Pagination state
	var paginationState = {
		currentPage: 0,
		pageSize: 20,
		totalCount: 0,
		totalPages: 0,
		currentFilter: 'all' // Varsayilan: Tumu (rejected/cancelled haric)
	};

	// Countdown state - her offer icin ayri interval
	var countdownIntervals = {};

	// Tum sayaclari temizle
	function clearAllCountdowns() {
		Object.values(countdownIntervals).forEach(function(interval) {
			clearInterval(interval);
		});
		countdownIntervals = {};
	}

	// Son gonderim zamanini al (price_updated veya created)
	async function getLastSentTimestamp(offerId, fallbackCreatedAt) {
		try {
			var result = await OfferLogsService.getByOfferId(offerId);
			if (result.data && result.data.length > 0) {
				// En son price_updated veya created log'unu bul
				var lastSentLog = result.data.find(function(log) {
					return log.action === 'price_updated' || log.action === 'created';
				});
				if (lastSentLog) {
					return lastSentLog.created_at;
				}
			}
		} catch (e) {
			console.error('Log yukleme hatasi:', e);
		}
		return fallbackCreatedAt;
	}

	// Tek bir teklif icin sayac baslat
	function startCountdownForOffer(offerId, sentTimestamp, $badge) {
		var endTime = new Date(sentTimestamp).getTime() + (24 * 60 * 60 * 1000);

		function updateDisplay() {
			var now = Date.now();
			var remaining = endTime - now;
			var $time = $badge.find('.countdown-time');

			if (remaining <= 0) {
				$time.text('00:00:00');
				$badge.addClass('expired').removeClass('warning');
				clearInterval(countdownIntervals[offerId]);
				return;
			}

			var hours = Math.floor(remaining / (1000 * 60 * 60));
			var minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
			var seconds = Math.floor((remaining % (1000 * 60)) / 1000);

			var timeStr = String(hours).padStart(2, '0') + ':' +
						  String(minutes).padStart(2, '0') + ':' +
						  String(seconds).padStart(2, '0');

			$time.text(timeStr);

			// Son 1 saat kontrolu
			if (remaining < 60 * 60 * 1000) {
				$badge.addClass('warning');
			} else {
				$badge.removeClass('warning');
			}
		}

		updateDisplay();
		countdownIntervals[offerId] = setInterval(updateDisplay, 1000);
	}

	// Tum sayaclari baslat
	async function initializeCountdowns() {
		// Mevcut intervallari temizle
		clearAllCountdowns();

		// Her countdown badge icin interval baslat
		var badges = $('.offer-countdown-badge');
		for (var i = 0; i < badges.length; i++) {
			var $badge = $(badges[i]);
			var offerId = $badge.data('offer-id');
			var createdAt = $badge.data('created-at');

			if (offerId && createdAt) {
				// OfferLogs'dan son gonderim zamanini al
				var sentTimestamp = await getLastSentTimestamp(offerId, createdAt);
				if (sentTimestamp) {
					startCountdownForOffer(offerId, sentTimestamp, $badge);
				}
			}
		}
	}

	// Loading overlay
	function showLoading() {
		if (!$('#loading-overlay').length) {
			$('body').append('<div id="loading-overlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(255,255,255,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;"><div style="text-align:center;"><div style="width:40px;height:40px;border:3px solid #e0e0e0;border-top-color:#002c77;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 15px;"></div><div style="color:#333;font-size:14px;">Yukleniyor...</div></div></div>');
			$('head').append('<style>@keyframes spin{to{transform:rotate(360deg)}}</style>');
		}
		$('#loading-overlay').show();
	}

	function hideLoading() {
		$('#loading-overlay').hide();
	}

	// Musteri listesini Supabase'den yukle (Pagination destekli)
	async function loadOffers() {
		showLoading();
		try {
			// Bayi ID'sini sessionStorage'dan al (login sirasinda kaydedilir)
			currentDealerId = sessionStorage.getItem('bayi_dealer_id');
			if (!currentDealerId) {
				console.error('Bayi ID bulunamadi');
				hideLoading();
				$('.customer-list').html('<div class="empty-state"><p>Bayi bilgisi bulunamadi. Lutfen tekrar giris yapin.</p></div>');
				return;
			}

			// Pagination ve filtre seceneklerini hazirla
			var options = {
				page: paginationState.currentPage,
				pageSize: paginationState.pageSize
			};

			// Filtre uygula
			if (paginationState.currentFilter === 'all') {
				// Tumu: rejected ve cancelled haric
				options.excludeStatus = ['rejected', 'cancelled'];
			} else if (paginationState.currentFilter === 'rejected') {
				// Iptal: rejected + cancelled birlikte
				options.includeStatus = ['rejected', 'cancelled'];
			} else {
				// Belirli bir status
				options.status = paginationState.currentFilter;
			}

			// Sayfali veri cek
			const result = await OffersService.getPaginatedOffersByDealerId(currentDealerId, options);
			if (result.error) throw new Error(result.error);

			// Pagination state guncelle
			paginationState.totalCount = result.totalCount;
			paginationState.totalPages = result.totalPages;

			// Offers verisini musteri formatina donustur
			allCustomers = (result.data || []).map(function(offer) {
				return {
					...offer.customer,
					offer_id: offer.id,
					offer_status: offer.status,
					offer_created_at: offer.created_at,
					customer_prices: offer.offer_details,
					customer_branch_id: offer.customer_branch_id,
					customer_branch: offer.customer_branch
				};
			});

			renderOfferList(allCustomers);
			renderPagination();

			// Filtre sayilarini ayri sorguda guncelle (ilk yuklemede)
			updateFilterCounts();

			hideLoading();
		} catch (err) {
			hideLoading();
			console.error('Musteri yukleme hatasi:', err);
			$('.customer-list').html('<div class="empty-state"><p>Musteriler yuklenirken hata olustu</p></div>');
		}
	}

	// Pagination render
	function renderPagination() {
		var $container = $('#pagination-container');
		if (paginationState.totalCount === 0) {
			$container.hide();
			return;
		}
		$container.show();

		// Info text
		var from = paginationState.currentPage * paginationState.pageSize + 1;
		var to = Math.min(from + paginationState.pageSize - 1, paginationState.totalCount);
		$('#pagination-info-text').text(from + '-' + to + ' / ' + paginationState.totalCount + ' musteri');

		// Prev/Next buttons
		$('#prev-page').prop('disabled', paginationState.currentPage === 0);
		$('#next-page').prop('disabled', paginationState.currentPage >= paginationState.totalPages - 1);

		// Page numbers
		renderPageNumbers();
	}

	function renderPageNumbers() {
		var $pages = $('#pagination-pages');
		$pages.empty();

		var total = paginationState.totalPages;
		var current = paginationState.currentPage;

		// Basit pagination: max 7 buton goster
		var pages = [];
		if (total <= 7) {
			for (var i = 0; i < total; i++) pages.push(i);
		} else {
			pages = [0];
			if (current > 2) pages.push('...');
			for (var j = Math.max(1, current - 1); j <= Math.min(total - 2, current + 1); j++) {
				pages.push(j);
			}
			if (current < total - 3) pages.push('...');
			pages.push(total - 1);
		}

		pages.forEach(function(p) {
			if (p === '...') {
				$pages.append('<span class="pagination-page ellipsis">...</span>');
			} else {
				var isActive = p === current ? ' active' : '';
				$pages.append('<button class="pagination-page' + isActive + '" data-page="' + p + '">' + (p + 1) + '</button>');
			}
		});
	}

	// Teklif durumu badge'i olustur
	function getStatusBadge(status) {
		var statusLabels = {
			requested: 'Talep Edildi',
			pending: 'Beklemede',
			accepted: 'Kabul Edildi',
			rejected: 'Reddedildi',
			cancelled: 'Iptal Edildi',
			passive: 'Pasif'
		};

		var statusIcons = {
			requested: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
			pending: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>',
			accepted: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
			rejected: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>',
			cancelled: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z"/></svg>',
			passive: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>'
		};

		return '<div class="offer-status-badge ' + status + '">' +
			statusIcons[status] +
			'<span>' + statusLabels[status] + '</span></div>';
	}

	// Teklif karti olustur
	function createOfferCard(customer) {
		var offerStatus = customer.offer_status || 'pending';

		// Sube bilgisi
		var branchHtml = '';
		if (customer.customer_branch) {
			var branchName = customer.customer_branch.branch_name || '';
			var branchLocation = [customer.customer_branch.district, customer.customer_branch.city].filter(Boolean).join(', ');
			var branchLabel = branchName || branchLocation || 'Sube';
			branchHtml = '<div class="offer-branch"><svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg><span>' + branchLabel + '</span></div>';
		}

		// Countdown sadece pending ve requested icin gosterilecek
		var needsCountdown = ['pending', 'requested'].indexOf(offerStatus) !== -1;
		var countdownHtml = '';
		if (needsCountdown) {
			countdownHtml = '<div class="offer-countdown-badge" data-offer-id="' + customer.offer_id + '" data-created-at="' + customer.offer_created_at + '">' +
				'<span class="countdown-time">--:--:--</span>' +
			'</div>';
		}

		return '<div class="offer-card" data-name="' + customer.name + '" data-vkn="' + customer.vkn + '" data-offer-id="' + customer.offer_id + '" data-status="' + offerStatus + '">' +
			'<div class="offer-avatar"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>' +
			'<div class="offer-info"><div class="offer-customer-name">' + customer.name + (customer.company_name ? ' - ' + customer.company_name : '') + '</div><div class="offer-vkn">VKN: ' + customer.vkn + '</div>' + branchHtml + '</div>' +
			countdownHtml +
			getStatusBadge(offerStatus) +
			'<a href="bayi-teklif-olustur.html?offer_id=' + customer.offer_id + '" class="offer-action"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg></a>' +
		'</div>';
	}

	// Teklif listesini render et
	function renderOfferList(customers) {
		// Mevcut sayaclari temizle
		clearAllCountdowns();

		var $list = $('.offer-list');
		$list.empty();

		if (customers.length === 0) {
			$list.html('<div class="empty-state"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg><h3>Teklif bulunamadi</h3><p>Arama kriterlerinize uygun teklif yok</p></div>');
			return;
		}

		customers.forEach(function(customer) {
			$list.append(createOfferCard(customer));
		});

		// Kart tiklama olayini yeniden bagla
		$('.offer-card').on('click', function(e) {
			if (!$(e.target).closest('.offer-action').length) {
				var offerId = $(this).data('offer-id');
				window.location.href = 'bayi-teklif-olustur.html?offer_id=' + offerId;
			}
		});

		// Sayaclari baslat
		initializeCountdowns();
	}

	// Filtre sayilarini guncelle (server-side count)
	async function updateFilterCounts() {
		if (!currentDealerId) return;

		try {
			const { data: counts, error } = await OffersService.getOffersCountByStatus(currentDealerId);
			if (error) throw error;

			// Rejected ve cancelled birlesik sayilsin
			var rejectedTotal = (counts.rejected || 0) + (counts.cancelled || 0);

			$('.filter-btn[data-filter="all"] .count').text(counts.all || 0);
			$('.filter-btn[data-filter="requested"] .count').text(counts.requested || 0);
			$('.filter-btn[data-filter="pending"] .count').text(counts.pending || 0);
			$('.filter-btn[data-filter="accepted"] .count').text(counts.accepted || 0);
			$('.filter-btn[data-filter="rejected"] .count').text(rejectedTotal);
			$('.filter-btn[data-filter="passive"] .count').text(counts.passive || 0);
		} catch (err) {
			console.error('Filtre sayilari yuklenemedi:', err);
		}
	}

	// Musterileri yukle
	loadOffers();

	// Pagination event handlers
	$('#prev-page').on('click', function() {
		if (paginationState.currentPage > 0) {
			paginationState.currentPage--;
			loadOffers();
		}
	});

	$('#next-page').on('click', function() {
		if (paginationState.currentPage < paginationState.totalPages - 1) {
			paginationState.currentPage++;
			loadOffers();
		}
	});

	$(document).on('click', '.pagination-page:not(.ellipsis)', function() {
		paginationState.currentPage = parseInt($(this).data('page'));
		loadOffers();
	});

	$('#page-size-select').on('change', function() {
		paginationState.pageSize = parseInt($(this).val());
		paginationState.currentPage = 0; // Sayfa basina don
		loadOffers();
	});

	// Filter functionality (server-side)
	$('.filter-btn').on('click', function() {
		var $btn = $(this);
		var filter = $btn.data('filter');

		// Update active state
		$('.filter-btn').removeClass('active');
		$btn.addClass('active');

		// Filtre degistiginde sayfa 0'a don ve yeniden yukle
		paginationState.currentFilter = filter;
		paginationState.currentPage = 0;
		loadOffers();
	});

	// Search functionality (client-side - mevcut sayfada)
	$('#search-input').on('keyup', function() {
		var searchTerm = $(this).val().toLowerCase();

		$('.offer-card').each(function() {
			var $card = $(this);
			var name = ($card.data('name') || '').toLowerCase();
			var vkn = ($card.data('vkn') || '').toString();

			if (name.indexOf(searchTerm) > -1 || vkn.indexOf(searchTerm) > -1) {
				$card.show();
			} else {
				$card.hide();
			}
		});
	});
});
