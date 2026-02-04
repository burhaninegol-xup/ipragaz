// Rol kontrolu - sadece owner erisebilir
		(function() {
			var userRole = sessionStorage.getItem('isyerim_user_role');
			if (userRole !== 'owner') {
				alert('Bu sayfaya erisim yetkiniz bulunmamaktadir.');
				window.location.href = 'isyerim-musteri-anasayfa.html';
				return;
			}
		})();

		// Global degiskenler
		var products = [];
		var currentCustomer = null;
		var selectedProducts = {};
		var selectedDealerId = null;
		var selectedDealerName = null;
		var activeOffer = null;
		var isReadOnlyMode = false;
		var messageSubscription = null;
		var currentUserType = 'customer';

		// Loading goster
		function showLoading(text) {
			document.getElementById('loadingText').textContent = text || 'Yukleniyor...';
			document.getElementById('loadingOverlay').classList.add('active');
		}

		// Loading gizle
		function hideLoading() {
			document.getElementById('loadingOverlay').classList.remove('active');
		}

		// Confirmation Modal goster
		function showConfirmationModal(title, message, onConfirm) {
			document.getElementById('confirmationTitle').textContent = title;
			document.getElementById('confirmationMessage').textContent = message;

			var actionBtn = document.getElementById('confirmationActionBtn');
			var newBtn = actionBtn.cloneNode(true);
			actionBtn.parentNode.replaceChild(newBtn, actionBtn);

			newBtn.addEventListener('click', function() {
				closeConfirmationModal();
				if (onConfirm) onConfirm();
			});

			document.getElementById('confirmationModal').classList.add('active');
		}

		// Confirmation Modal kapat
		function closeConfirmationModal() {
			document.getElementById('confirmationModal').classList.remove('active');
		}

		// Mevcut teklif kontrolu (musteri bazli teklif sistemi)
		async function checkExistingOffer() {
			if (!currentCustomer) return { hasOffer: false, isActive: false };

			try {
				// Musteri bazli teklif ara (sube bagimsiz)
				const { data: allOffer, error } = await OffersService.getLatestOfferByCustomerId(currentCustomer.id);

				if (error) {
					console.error('Teklif kontrolu hatasi:', error);
					return { hasOffer: false, isActive: false };
				}

				// Teklif var mi?
				if (allOffer) {
					// Teklif detayi kontrolu - detay yoksa gecersiz teklif
					if (!allOffer.offer_details || allOffer.offer_details.length === 0) {
						console.log('Teklif detayi bulunamadi, gecersiz teklif olarak isaretlendi');
						return { hasOffer: false, isActive: false };
					}

					activeOffer = allOffer;
					var isActiveStatus = ['requested', 'pending', 'accepted', 'passive'].includes(allOffer.status);

					if (isActiveStatus) {
						// Aktif teklif - read-only mod
						isReadOnlyMode = true;
						await renderReadOnlyMode();
					} else {
						// Sonuclanan teklif (rejected/cancelled) - sadece banner goster
						isReadOnlyMode = false;
						renderCompletedOfferBanner();
					}

					return { hasOffer: true, isActive: isActiveStatus };
				}

				// Hic teklif yok - bos form goster
				return { hasOffer: false, isActive: false };
			} catch (err) {
				console.error('Teklif kontrolu hatasi:', err);
				return { hasOffer: false, isActive: false };
			}
		}

		// Read-only modu render et (aktif teklifler icin)
		async function renderReadOnlyMode() {
			if (!activeOffer) return;

			// Status banner'i goster
			showStatusBanner(activeOffer.status, activeOffer.dealer);

			// Info card'i guncelle
			updateInfoCardForReadOnly();

			// Urunleri read-only modda render et
			await renderReadOnlyProducts(activeOffer.offer_details);

			// Submit section'i gizle
			document.getElementById('submitSection').style.display = 'none';

			// Bayi secim bolumunu gizle
			document.getElementById('dealerSelectionSection').style.display = 'none';

			// Teklif gecmisini yukle (cancelled degilse)
			if (activeOffer.status !== 'cancelled') {
				loadOfferLogs(activeOffer.id);

				// Countdown timer'ı başlat (sadece requested ve pending için)
				if (['requested', 'pending'].includes(activeOffer.status)) {
					initOfferCountdown(activeOffer.id);
				} else {
					stopOfferCountdown();
				}
			}

		}

		// Sonuclanan teklif banner'i goster (rejected/cancelled - yeni teklif isteyebilir)
		function renderCompletedOfferBanner() {
			if (!activeOffer) return;

			// Status banner'i goster (iptal butonu olmadan)
			showStatusBanner(activeOffer.status, activeOffer.dealer);

			// Iptal linkini gizle (yeni teklif isteyebilecegi icin)
			var cancelLinkWrapper = document.getElementById('cancelOfferLinkWrapper');
			if (cancelLinkWrapper) {
				cancelLinkWrapper.style.display = 'none';
			}

			// Cancelled tekliflerde gecmis gosterme
		}

		// Status banner'i goster
		function showStatusBanner(status, dealer) {
			var banner = document.getElementById('offerStatusBanner');
			var iconContainer = document.getElementById('statusIcon');
			var title = document.getElementById('statusTitle');
			var message = document.getElementById('statusMessage');
			var dealerName = document.getElementById('statusDealerName');

			var statusConfig = {
				'requested': {
					title: 'Teklif Talebiniz Iletildi',
					message: 'Teklif talebiniz bayiye iletildi. Bayiniz en kisa surede size ozel fiyat teklifi hazirlayacaktir.',
					icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
					className: 'status-requested'
				},
				'pending': {
					title: 'Fiyat Teklifi Hazir',
					message: 'Bayiniz fiyat teklifini hazirladi. Asagidaki urunleri ve fiyatlari inceleyip teklifi kabul edebilirsiniz.',
					icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
					className: 'status-pending'
				},
				'accepted': {
					title: 'Teklif Kabul Edildi',
					message: 'Tebrikler! Teklifi kabul ettiniz. Artik ozel fiyatlarla siparis verebilirsiniz.',
					icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
					className: 'status-accepted'
				},
				'rejected': {
					title: 'Teklifiniz Reddedildi',
					message: 'Bayiniz teklifinizi reddetmistir. Asagidan yeni bir teklif talebi olusturabilirsiniz.',
					icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
					className: 'status-rejected'
				},
				'cancelled': {
					title: 'Teklif Iptal Edildi',
					message: 'Onceki teklifiniz iptal edilmistir. Asagidan yeni bir teklif talebi olusturabilirsiniz.',
					icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
					className: 'status-cancelled'
				},
				'passive': {
					title: 'Teklifiniz Pasif Durumda',
					message: 'Bu teklif bayi tarafindan pasife alinmistir. Bu fiyatlarla siparis veremezsiniz. Detayli bilgi icin bayinizi arayabilirsiniz.',
					icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>',
					className: 'status-passive'
				}
			};

			var config = statusConfig[status] || statusConfig['requested'];

			banner.className = 'offer-status-banner ' + config.className;
			iconContainer.innerHTML = config.icon;
			title.textContent = config.title;

			// Passive durumda bayi telefonunu mesaja ekle
			if (status === 'passive' && dealer && dealer.phone) {
				message.innerHTML = config.message + '<br><strong style="margin-top:8px;display:inline-block;">📞 ' + dealer.phone + '</strong>';
			} else {
				message.textContent = config.message;
			}

			dealerName.textContent = dealer ? dealer.name : '-';

			banner.style.display = 'flex';

			// Buton gorunurluk kontrolu
			var acceptBtn = document.getElementById('btnAcceptOffer');
			var cancelLinkWrapper = document.getElementById('cancelOfferLinkWrapper');

			// Kabul Et butonu: sadece 'pending' durumunda goster (bayi fiyat girmis)
			if (acceptBtn) {
				acceptBtn.style.display = (status === 'pending') ? 'flex' : 'none';
			}

			// Iptal Et linki: requested, pending ve accepted durumlarinda goster
			if (cancelLinkWrapper) {
				cancelLinkWrapper.style.display = ['requested', 'pending', 'accepted'].includes(status) ? 'block' : 'none';
			}
		}

		// === COUNTDOWN TIMER ===
		var countdownInterval = null;
		var countdownEndTime = null;

		function startOfferCountdown(sentTimestamp) {
			var container = document.getElementById('offerCountdownContainer');
			if (!container) return;

			// 72 saat = 259200000 ms
			var sentTime = new Date(sentTimestamp).getTime();
			countdownEndTime = sentTime + (72 * 60 * 60 * 1000);

			// Önceki interval'i temizle
			if (countdownInterval) {
				clearInterval(countdownInterval);
			}

			container.style.display = 'flex';
			updateOfferCountdown();
			countdownInterval = setInterval(updateOfferCountdown, 1000);
		}

		function updateOfferCountdown() {
			var container = document.getElementById('offerCountdownContainer');
			var timerEl = document.getElementById('offerCountdownTimer');
			if (!container || !timerEl) return;

			var now = Date.now();
			var remaining = countdownEndTime - now;

			if (remaining <= 0) {
				timerEl.textContent = '00:00:00';
				container.classList.add('warning');
				stopOfferCountdown();
				return;
			}

			var hours = Math.floor(remaining / (1000 * 60 * 60));
			var minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
			var seconds = Math.floor((remaining % (1000 * 60)) / 1000);

			timerEl.textContent =
				String(hours).padStart(2, '0') + ':' +
				String(minutes).padStart(2, '0') + ':' +
				String(seconds).padStart(2, '0');

			// Son 6 saat kaldığında uyarı rengi
			if (remaining < 6 * 60 * 60 * 1000) {
				container.classList.add('warning');
			} else {
				container.classList.remove('warning');
			}
		}

		function stopOfferCountdown() {
			if (countdownInterval) {
				clearInterval(countdownInterval);
				countdownInterval = null;
			}
			var container = document.getElementById('offerCountdownContainer');
			if (container) {
				container.style.display = 'none';
			}
		}

		async function initOfferCountdown(offerId) {
			var logsResult = await OfferLogsService.getByOfferId(offerId);
			if (!logsResult.data || logsResult.data.length === 0) {
				stopOfferCountdown();
				return;
			}

			// En son 'price_updated' veya 'created' action'ını bul
			var lastSentLog = logsResult.data.find(function(log) {
				return log.action === 'price_updated' || log.action === 'created';
			});

			if (lastSentLog) {
				startOfferCountdown(lastSentLog.created_at);
			} else {
				stopOfferCountdown();
			}
		}

		// Teklif gecmisini yukle ve goster
		async function loadOfferLogs(offerId) {
			var metadataEl = document.getElementById('offer-metadata');

			if (!offerId) {
				metadataEl.style.display = 'none';
				return;
			}

			var timeline = document.getElementById('metadata-timeline');

			var result = await OfferLogsService.getByOfferId(offerId);
			if (result.error || !result.data || !result.data.length) {
				// Hata veya log yoksa gizli tut
				metadataEl.style.display = 'none';
				return;
			}

			var logs = result.data;

			var actionLabels = {
				'created': 'Teklif olusturuldu',
				'requested': 'Teklif talep edildi',
				'price_updated': 'Fiyatlar guncellendi',
				'accepted': 'Teklif kabul edildi',
				'rejected': 'Teklif reddedildi',
				'cancelled': 'Teklif iptal edildi',
				'passived': 'Teklif pasife alindi',
				'activated': 'Teklif aktif edildi',
				'details_updated': 'Teklif detaylari guncellendi'
			};

			var html = logs.map(function(log) {
				var date = new Date(log.created_at);
				var timeStr = date.toLocaleDateString('tr-TR') + ' ' +
							  date.toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'});

				return '<div class="timeline-item">' +
					'<div class="timeline-dot ' + log.action + '"></div>' +
					'<div class="timeline-content">' +
						'<div class="timeline-action">' + (actionLabels[log.action] || log.action) + '</div>' +
						'<div class="timeline-actor">' + (log.actor_name || '-') + '</div>' +
						'<div class="timeline-time">' + timeStr + '</div>' +
					'</div>' +
				'</div>';
			}).join('');

			timeline.innerHTML = html;
			metadataEl.style.display = 'block';
		}

		// Info card'i read-only mod icin gizle
		function updateInfoCardForReadOnly() {
			var infoCard = document.querySelector('.info-card');
			if (infoCard) {
				infoCard.style.display = 'none';
			}
		}

		// Urunleri read-only modda render et (yatay layout + fiyat gosterimi)
		async function renderReadOnlyProducts(offerDetails) {
			var grid = document.getElementById('productsGrid');

			if (!offerDetails || offerDetails.length === 0) {
				grid.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;">' +
					'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
					'<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>' +
					'<h3>Teklif Detayi Bulunamadi</h3>' +
					'<p>Teklifinizin detaylarina ulasilamiyor.</p></div>';
				return;
			}

			// İl bazlı fiyatları al (tavan fiyat için)
			var cityRetailPrices = {};
			var branchCityId = null;
			if (activeOffer && activeOffer.customer_branch && activeOffer.customer_branch.city_id) {
				branchCityId = activeOffer.customer_branch.city_id;
			} else {
				// Fallback: sessionStorage'dan seçili şube ID'sini al
				var selectedBranchId = sessionStorage.getItem('selected_address_id');
				if (selectedBranchId) {
					try {
						const { data: branch } = await BranchesService.getById(selectedBranchId);
						if (branch && branch.city_id) {
							branchCityId = branch.city_id;
						}
					} catch (err) {
						console.warn('Şube bilgisi alınamadı:', err);
					}
				}
			}
			if (branchCityId) {
				try {
					const { data: cityPrices } = await RetailPricesByCityService.getByCityId(branchCityId);
					if (cityPrices) {
						cityPrices.forEach(function(cp) {
							if (cp.product_id && cp.retail_price) {
								cityRetailPrices[cp.product_id] = cp.retail_price;
							}
						});
					}
				} catch (err) {
					console.warn('İl bazlı fiyatlar yüklenemedi:', err);
				}
			}

			grid.innerHTML = '';
			grid.className = 'products-grid readonly-grid';

			offerDetails.forEach(function(detail) {
				var product = detail.product;
				if (!product) return;

				var imageUrl = product.image_url || './İpragaz Bayi_files/IPR-BAYI-12-kg-ipr-uzun.png';

				// TAVAN FİYAT kutusu
				var ceilingPriceHtml = '';
				var ceilingPrice = cityRetailPrices[product.id] || product.base_price || 0;
				if (ceilingPrice > 0) {
					ceilingPriceHtml = '<div class="ceiling-price-display">' +
						'<div class="ceiling-price-label">Tavan Fiyat</div>' +
						'<div class="ceiling-price-value">' + formatCurrency(ceilingPrice) + ' <span class="unit">/ adet</span></div>' +
					'</div>';
				}

				// Fiyat gosterimi - kosullu
				var priceHtml = '';
				if (detail.unit_price && detail.unit_price > 0) {
					// Fiyat var
					priceHtml = '<div class="price-display">' +
						'<div class="price-display-label">Teklif Edilen Fiyat</div>' +
						'<div class="price-display-value">' + formatCurrency(detail.unit_price) + ' <span class="unit">/ adet</span></div>' +
					'</div>';
				} else {
					// Fiyat henuz belirlenmemis
					priceHtml = '<div class="price-display-pending">' +
						'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
							'<circle cx="12" cy="12" r="10"/>' +
							'<polyline points="12 6 12 12 16 14"/>' +
						'</svg>' +
						'Henuz fiyat belirlenmemis' +
					'</div>';
				}

				// Kompakt yatay kart yapisi
				var cardHtml = '<div class="product-card readonly" data-product-id="' + product.id + '">' +
					'<div class="product-image">' +
						'<img src="' + imageUrl + '" alt="' + product.name + '">' +
					'</div>' +
					'<div class="product-content">' +
						'<div class="product-info">' +
							'<div class="product-name">' + product.name + '</div>' +
							'<div class="product-code">' + product.code + '</div>' +
						'</div>' +
						'<div class="product-stats">' +
							'<div class="consumption-display">' +
								'<div class="consumption-display-label">Ortalama Tüketim</div>' +
								'<div class="consumption-display-value">' + detail.commitment_quantity + '<span>adet/ay</span></div>' +
							'</div>' +
							ceilingPriceHtml +
							priceHtml +
						'</div>' +
					'</div>' +
				'</div>';

				grid.innerHTML += cardHtml;
			});

			// Yeni urun ekleme mesaji - sadece aktif durumlar icin
			if (activeOffer && ['requested', 'pending', 'accepted'].includes(activeOffer.status)) {
				var dealer = activeOffer.dealer;
				var dealerInfo = dealer ? dealer.name : 'Bayiniz';
				var dealerPhone = dealer && dealer.phone ? dealer.phone : '';

				var addProductMessage = '<div class="add-product-notice">' +
					'<div class="notice-icon">' +
						'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
							'<circle cx="12" cy="12" r="10"/>' +
							'<line x1="12" y1="8" x2="12" y2="16"/>' +
							'<line x1="8" y1="12" x2="16" y2="12"/>' +
						'</svg>' +
					'</div>' +
					'<div class="notice-text">' +
						'<p>Mevcut teklifinize yeni bir urun eklemek icin bayinizi aramalisiniz.</p>' +
					'</div>' +
					'<div class="dealer-contact-vertical">' +
						'<strong>' + dealerInfo + '</strong>' +
						(dealerPhone ? '<a href="tel:' + dealerPhone + '" class="phone-link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> ' + dealerPhone + '</a>' : '') +
					'</div>' +
				'</div>';
			}

			grid.style.display = 'flex';

			// Teklif ozeti bolumunu ekle
			var existingSummary = document.getElementById('offerSummarySection');
			if (existingSummary) {
				existingSummary.remove();
			}

			var summaryHtml = '<div class="offer-summary-section" id="offerSummarySection" style="display: none;">' +
				'<div class="offer-summary-header">' +
					'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
						'<path d="M9 7h6m-6 4h6m-4 4h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"/>' +
					'</svg>' +
					'<h3>Teklif Özeti</h3>' +
				'</div>' +
				'<div class="summary-grid">' +
					'<div class="summary-item">' +
						'<span class="summary-label">Teklifin Perakende Tutarı</span>' +
						'<span class="summary-value" id="totalRetailPrice">0,00 TL</span>' +
					'</div>' +
					'<div class="summary-item">' +
						'<span class="summary-label">Teklifin İndirimli Tutarı</span>' +
						'<span class="summary-value highlight" id="totalDiscountedPrice">0,00 TL</span>' +
					'</div>' +
					'<div class="summary-item benefit">' +
						'<span class="summary-label">Müşteriye Sağlanan Fayda</span>' +
						'<span class="summary-value benefit-value" id="totalBenefit">0,00 TL</span>' +
					'</div>' +
				'</div>' +
			'</div>';

			// Önce Teklif Özeti eklenir
			grid.insertAdjacentHTML('afterend', summaryHtml);

			// Sonra Bayi ara mesajı (özetten sonra)
			if (activeOffer && ['requested', 'pending', 'accepted'].includes(activeOffer.status)) {
				var summarySection = document.getElementById('offerSummarySection');
				if (summarySection) {
					summarySection.insertAdjacentHTML('afterend', addProductMessage);
				} else {
					grid.insertAdjacentHTML('afterend', addProductMessage);
				}
			}

			// Ozeti hesapla ve goster
			await updateOfferSummary(offerDetails);
		}

		// Teklif ozeti hesapla ve goster
		async function updateOfferSummary(offerDetails) {
			var summarySection = document.getElementById('offerSummarySection');
			if (!summarySection) return;

			// Fiyat bilgisi olmayan detaylar varsa gosterme
			var hasAnyPrice = offerDetails.some(function(d) {
				return d.unit_price && d.unit_price > 0;
			});

			if (!hasAnyPrice) {
				summarySection.style.display = 'none';
				return;
			}

			var totalRetail = 0;
			var totalDiscounted = 0;

			// Il bazli perakende fiyatlarini al
			var cityRetailPrices = {};
			try {
				// Sube bilgisinden city_id al
				var branchCityId = null;
				if (activeOffer && activeOffer.customer_branch && activeOffer.customer_branch.city_id) {
					branchCityId = activeOffer.customer_branch.city_id;
				} else {
					// Fallback: sessionStorage'dan secili sube ID'sini al ve sube bilgisini cek
					var selectedBranchId = sessionStorage.getItem('selected_address_id');
					if (selectedBranchId) {
						const { data: branch } = await BranchesService.getById(selectedBranchId);
						if (branch && branch.city_id) {
							branchCityId = branch.city_id;
						}
					}
				}

				// city_id varsa il bazli fiyatlari al
				if (branchCityId) {
					const { data: cityPrices } = await RetailPricesByCityService.getByCityId(branchCityId);
					if (cityPrices) {
						cityPrices.forEach(function(cp) {
							if (cp.product_id && cp.retail_price) {
								cityRetailPrices[cp.product_id] = cp.retail_price;
							}
						});
					}
				}
			} catch (err) {
				console.warn('Il bazli fiyatlar yuklenemedi:', err);
			}

			offerDetails.forEach(function(detail) {
				var product = detail.product;
				var quantity = detail.commitment_quantity || 0;
				var unitPrice = detail.unit_price || 0;

				// Perakende fiyat: il bazli fiyat > product.base_price > 0
				var retailPrice = 0;
				if (product) {
					retailPrice = cityRetailPrices[product.id] || product.base_price || 0;
				}

				totalRetail += retailPrice * quantity;
				totalDiscounted += unitPrice * quantity;
			});

			var benefit = totalRetail - totalDiscounted;

			// Formatlama
			document.getElementById('totalRetailPrice').textContent =
				totalRetail.toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' TL';
			document.getElementById('totalDiscountedPrice').textContent =
				totalDiscounted.toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' TL';
			document.getElementById('totalBenefit').textContent =
				benefit.toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' TL';

			summarySection.style.display = 'block';
		}

		// Para birimi formatlama
		function formatCurrency(amount) {
			return new Intl.NumberFormat('tr-TR', {
				style: 'currency',
				currency: 'TRY',
				minimumFractionDigits: 2
			}).format(amount);
		}

		// Aktif teklifi kabul et
		async function acceptActiveOffer() {
			if (!activeOffer) return;

			var confirmed = confirm('Teklifi kabul etmek istediginize emin misiniz?');
			if (!confirmed) return;

			showLoading('Teklif kabul ediliyor...');

			try {
				// 1. Teklifi kabul et
				const { data, error } = await OffersService.update(activeOffer.id, {
					status: 'accepted'
				});

				if (error) throw new Error(error);

				// 2. Kabul logunu kaydet
				var customerName = currentCustomer.company_name || currentCustomer.name || 'Musteri';
				await OfferLogsService.log(
					activeOffer.id,
					'accepted',
					'customer',
					currentCustomer.id,
					customerName
				);

				// 3. Mevcut sepeti temizle
				CartService.clearCart();

				// 4. Teklifin urunlerini sepete ekle
				if (activeOffer.offer_details && activeOffer.offer_details.length > 0) {
					for (var i = 0; i < activeOffer.offer_details.length; i++) {
						var detail = activeOffer.offer_details[i];
						if (detail.product && detail.commitment_quantity > 0) {
							await CartService.addItem({
								id: detail.product.id,
								code: detail.product.code,
								name: detail.product.name,
								price: detail.unit_price || 0,
								image_url: detail.product.image_url,
								priceType: 'size_ozel',
								priceLabel: 'Teklif Fiyati'
							}, detail.commitment_quantity);
						}
					}
				}

				hideLoading();

				// 5. Sepet sayfasina yonlendir
				window.location.href = 'isyerim-musteri-sepet.html';

			} catch (err) {
				hideLoading();
				console.error('Teklif kabul hatasi:', err);
				alert('Teklif kabul edilirken bir hata olustu. Lutfen tekrar deneyin.');
			}
		}

		// Aktif teklifi iptal et
		function cancelActiveOffer() {
			if (!activeOffer) return;

			var title = activeOffer.status === 'accepted'
				? 'Kabul Edilmis Teklifi Iptal Et'
				: 'Teklif Talebini Iptal Et';

			var message = activeOffer.status === 'accepted'
				? 'Teklifi iptal ederseniz size ozel fiyatlar ortadan kalkacaktir. Bu islemi geri alamazsiniz.'
				: 'Teklif talebinizi iptal etmek istediginize emin misiniz? Bu islem geri alinamaz.';

			showConfirmationModal(title, message, async function() {
				showLoading('Teklif iptal ediliyor...');

				try {
					// Teklifi iptal et
					const { data, error } = await OffersService.update(activeOffer.id, {
						status: 'cancelled'
					});

					if (error) throw new Error(error);

					// Iptal logunu kaydet
					var customerName = currentCustomer.company_name || currentCustomer.name || 'Musteri';
					await OfferLogsService.log(
						activeOffer.id,
						'cancelled',
						'customer',
						currentCustomer.id,
						customerName
					);

					hideLoading();
					alert('Teklif talebiniz iptal edildi.');

					// Tekliflerim sayfasina yonlendir
					window.location.href = 'isyerim-musteri-teklifler.html';

				} catch (err) {
					hideLoading();
					console.error('Teklif iptal hatasi:', err);
					alert('Teklif iptal edilirken bir hata olustu. Lutfen tekrar deneyin.');
				}
			});
		}

		// Urunleri yukle
		async function loadProducts() {
			try {
				const { data, error } = await ProductsService.getAll();
				if (error) throw new Error(error);

				products = data || [];
				renderProducts();
			} catch (err) {
				console.error('Urun yukleme hatasi:', err);
				document.getElementById('productsGrid').innerHTML =
					'<div class="empty-state" style="grid-column: 1/-1;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><h3>Urunler Yuklenemedi</h3><p>Lutfen sayfayi yenileyip tekrar deneyin.</p></div>';
			}
		}

		// Urun kartini olustur
		function createProductCard(product) {
			var imageUrl = product.image_url || './İpragaz Bayi_files/IPR-BAYI-12-kg-ipr-uzun.png';

			return '<div class="product-card" data-product-id="' + product.id + '">' +
				'<div class="product-image">' +
					'<img src="' + imageUrl + '" alt="' + product.name + '">' +
				'</div>' +
				'<div class="product-name">' + product.name + '</div>' +
				'<div class="product-code">' + product.code + '</div>' +
				'<div class="consumption-input-wrapper">' +
					'<label>Aylik Ortalama Tuketim</label>' +
					'<div class="consumption-input-row">' +
						'<input type="number" class="consumption-input" ' +
							'data-product-id="' + product.id + '" ' +
							'min="0" ' +
							'placeholder="0" ' +
							'onchange="updateSelectedCount()">' +
						'<span class="consumption-unit">adet/ay</span>' +
					'</div>' +
				'</div>' +
			'</div>';
		}

		// Urunleri render et
		function renderProducts() {
			var grid = document.getElementById('productsGrid');

			if (products.length === 0) {
				grid.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg><h3>Urun Bulunamadi</h3><p>Henuz sistemde tanimli urun bulunmamaktadir.</p></div>';
				return;
			}

			grid.innerHTML = '';
			products.forEach(function(product) {
				grid.innerHTML += createProductCard(product);
			});

			// Submit section'i goster
			document.getElementById('submitSection').style.display = 'grid';
		}

		// Bayileri yukle - secili subenin ilcesine hizmet verenler
		async function loadDealers() {
			try {
				// 1. Secili subeyi al
				var selectedBranchId = sessionStorage.getItem('selected_address_id');
				console.log('[loadDealers] selectedBranchId:', selectedBranchId);

				if (selectedBranchId) {
					// 2. Subenin district_id'sini al
					const { data: branch, error: branchError } = await BranchesService.getById(selectedBranchId);
					console.log('[loadDealers] branch:', branch);
					console.log('[loadDealers] branch.district_id:', branch ? branch.district_id : 'N/A');
					console.log('[loadDealers] branch.district:', branch ? branch.district : 'N/A');

					if (!branchError && branch && branch.district_id) {
						// 3. Bu ilceye hizmet veren bayileri al
						const { data: dealers, error } = await DealerDistrictsService.getDealersByDistrictId(branch.district_id);
						console.log('[loadDealers] dealers for district_id ' + branch.district_id + ':', dealers);

						if (!error) {
							renderDealerList(dealers || []);
							return;
						}
					}
				}

				// 4. Fallback: Sube secili degilse veya district_id yoksa tum bayileri goster
				const { data, error } = await DealersService.getAll();
				if (error) throw new Error(error);
				renderDealerList(data || []);

			} catch (err) {
				console.error('Bayi yukleme hatasi:', err);
				document.getElementById('dealerList').innerHTML =
					'<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;"><p>Bayiler yuklenirken hata olustu.</p></div>';
			}
		}

		// Bayi listesini render et
		function renderDealerList(dealers) {
			var list = document.getElementById('dealerList');

			if (dealers.length === 0) {
				list.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;"><p>Bu bolgeye hizmet veren bayi bulunamadi.</p></div>';
				return;
			}

			var html = '';
			dealers.forEach(function(dealer) {
				html += '<div class="dealer-card" data-dealer-id="' + dealer.id + '" data-dealer-name="' + dealer.name + '" onclick="selectDealer(\'' + dealer.id + '\', \'' + dealer.name.replace(/'/g, "\\'") + '\')">';
				html += '<div class="dealer-card-name">' + dealer.name + '</div>';
				html += '<div class="dealer-card-location">';
				html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
				html += (dealer.district || '') + (dealer.district && dealer.city ? ', ' : '') + (dealer.city || '');
				html += '</div>';
				if (dealer.phone) {
					html += '<div class="dealer-card-phone">';
					html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
					html += dealer.phone;
					html += '</div>';
				}
				html += '</div>';
			});

			list.innerHTML = html;
		}

		// Bayi sec
		function selectDealer(dealerId, dealerName) {
			selectedDealerId = dealerId;
			selectedDealerName = dealerName;

			// Tum kartlarin secimini kaldir
			document.querySelectorAll('.dealer-card').forEach(function(card) {
				card.classList.remove('selected');
			});

			// Secilen karti isaretler
			var selectedCard = document.querySelector('.dealer-card[data-dealer-id="' + dealerId + '"]');
			if (selectedCard) {
				selectedCard.classList.add('selected');
			}

			// Devam Et butonunu aktif et
			document.getElementById('dealerContinueBtn').disabled = false;
		}

		// Bayi secimi onaylandi (sayfa ici bayi karti secimi)
		function confirmPageDealerSelection() {
			if (!selectedDealerId || !selectedDealerName) return;

			// Bayi secim bolumunu gizle
			document.getElementById('dealerSelectionSection').style.display = 'none';

			// Urun listesini ve formu goster
			document.getElementById('productsGrid').style.display = 'grid';
			document.getElementById('submitSection').style.display = 'grid';
			document.querySelector('.info-card').style.display = 'flex';

			// Bayi bilgisini goster
			document.getElementById('dealerName').textContent = selectedDealerName;
			document.getElementById('dealerInfo').style.display = 'flex';

			// Urunleri yukle
			loadProducts();
		}

		// Secilen urun sayisini guncelle
		function updateSelectedCount() {
			var inputs = document.querySelectorAll('.consumption-input');
			var count = 0;

			selectedProducts = {};

			inputs.forEach(function(input) {
				var value = parseInt(input.value) || 0;
				var productCard = input.closest('.product-card');

				if (value > 0) {
					count++;
					var productId = input.getAttribute('data-product-id');
					selectedProducts[productId] = value;
					// Secili gorunumu ekle
					if (productCard) productCard.classList.add('selected');
				} else {
					// Secili gorunumu kaldir
					if (productCard) productCard.classList.remove('selected');
				}
			});

			document.getElementById('selectedCount').textContent = count;
			document.getElementById('submitBtn').disabled = count === 0;
		}

		// Teklif ozeti overlay'ini goster
		function showOfferSummary() {
			// Validation
			if (Object.keys(selectedProducts).length === 0) {
				alert('Lutfen en az bir urun icin tuketim miktari girin.');
				return;
			}

			// Bayi ID'sini belirle - secilen veya mevcut
			var dealerId = selectedDealerId || (currentCustomer ? currentCustomer.dealer_id : null);

			if (!currentCustomer || !dealerId) {
				alert('Bayi bilgisi bulunamadi. Lutfen destek ile iletisime gecin.');
				return;
			}

			// Bayi adini ayarla
			var dealerName = selectedDealerName || (currentCustomer.dealer ? currentCustomer.dealer.name : '-');
			document.getElementById('summaryDealerName').textContent = dealerName;

			// Urun listesini olustur
			var productListHtml = '';
			var totalProducts = 0;

			for (var productId in selectedProducts) {
				var quantity = selectedProducts[productId];
				var product = products.find(function(p) { return p.id === productId; });
				var productName = product ? product.name : 'Urun #' + productId;

				productListHtml += '<div class="offer-summary-product-item">' +
					'<span class="offer-summary-product-name">' + productName + '</span>' +
					'<span class="offer-summary-product-qty">' + quantity + ' adet/ay</span>' +
				'</div>';

				totalProducts++;
			}

			document.getElementById('summaryProductsList').innerHTML = productListHtml;
			document.getElementById('summaryTotalProducts').textContent = totalProducts + ' urun';

			// Overlay'i goster
			document.getElementById('offerSummaryOverlay').classList.add('active');
		}

		// Teklif ozeti overlay'ini kapat
		function closeOfferSummary() {
			document.getElementById('offerSummaryOverlay').classList.remove('active');
		}

		// Teklif Iste butonuna tiklandiginda (guvenlik kontrolu ile)
		async function submitOfferRequest() {
			var branchId = sessionStorage.getItem('selected_address_id');

			if (!branchId) {
				alert('Lutfen bir sube seciniz.');
				return;
			}

			// Sube guvenlik cevaplarini kontrol et
			var hasAnswers = await BranchesService.hasSecurityAnswers(branchId);

			if (!hasAnswers) {
				// Guvenlik sorulari overlay'ini goster
				showSecurityQuestionsOverlay();
				return;
			}

			// Zaten cevaplanmis, direkt teklif ozeti goster
			showOfferSummary();
		}

		// ==================== GUVENLIK SORULARI FONKSIYONLARI ====================

		// Guvenlik sorulari overlay'ini goster
		function showSecurityQuestionsOverlay() {
			// Onceki cevaplari temizle
			document.querySelectorAll('input[name^="secQ"]').forEach(function(radio) {
				radio.checked = false;
			});
			document.getElementById('securityAcceptCheckbox').checked = false;
			updateSecurityProgress();

			document.getElementById('securityQuestionsOverlay').classList.add('active');
		}

		// Guvenlik sorulari overlay'ini kapat
		function closeSecurityQuestionsOverlay() {
			document.getElementById('securityQuestionsOverlay').classList.remove('active');
		}

		// Guvenlik progress bar'ini guncelle
		function updateSecurityProgress() {
			var questions = ['secQ1', 'secQ2', 'secQ3', 'secQ4'];
			var answered = 0;
			questions.forEach(function(q) {
				if (document.querySelector('input[name="' + q + '"]:checked')) answered++;
			});
			var progress = (answered / 4) * 100;
			document.getElementById('securityProgressFill').style.width = progress + '%';
		}

		// Guvenlik cevaplarini gonder
		async function submitSecurityAnswers() {
			var questions = ['secQ1', 'secQ2', 'secQ3', 'secQ4'];
			var answers = {};
			var allAnswered = true;
			var hasNoAnswer = false;

			questions.forEach(function(q, i) {
				var selected = document.querySelector('input[name="' + q + '"]:checked');
				if (!selected) {
					allAnswered = false;
				} else {
					answers['q' + (i + 1)] = selected.value === 'yes';
					if (selected.value === 'no') hasNoAnswer = true;
				}
			});

			if (!allAnswered) {
				alert('Lutfen tum sorulari cevaplayiniz.');
				return;
			}

			if (!document.getElementById('securityAcceptCheckbox').checked) {
				alert('Lutfen beyanlarinizin dogrulugunu kabul ediniz.');
				return;
			}

			if (hasNoAnswer) {
				closeSecurityQuestionsOverlay();
				document.getElementById('securityErrorOverlay').classList.add('active');
				return;
			}

			// Cevaplari kaydet
			var branchId = sessionStorage.getItem('selected_address_id');
			var result = await BranchesService.updateSecurityAnswers(branchId, answers);

			if (result.error) {
				alert('Bir hata olustu. Lutfen tekrar deneyiniz.');
				return;
			}

			closeSecurityQuestionsOverlay();
			showOfferSummary();
		}

		// Guvenlik hata overlay'ini kapat
		function closeSecurityError() {
			document.getElementById('securityErrorOverlay').classList.remove('active');
		}

		// Radio degisikliklerini dinle
		function initSecurityQuestionListeners() {
			document.querySelectorAll('input[name^="secQ"]').forEach(function(radio) {
				radio.addEventListener('change', updateSecurityProgress);
			});
		}

		// Teklif talebini onayla ve gonder
		async function confirmOfferRequest() {
			// Overlay'i kapat
			closeOfferSummary();

			// Bayi ID'sini belirle - secilen veya mevcut
			var dealerId = selectedDealerId || (currentCustomer ? currentCustomer.dealer_id : null);

			// Secili subeyi al
			var selectedBranchId = sessionStorage.getItem('selected_address_id');

			showLoading('Teklif talebiniz gonderiliyor...');

			try {
				// Offer data
				var offerData = {
					customer_id: currentCustomer.id,
					dealer_id: dealerId,
					customer_branch_id: selectedBranchId || null,
					status: 'requested',
					notes: 'Musteri tarafindan teklif talebi'
				};

				// Offer details
				var offerDetails = [];
				for (var productId in selectedProducts) {
					offerDetails.push({
						product_id: productId,
						commitment_quantity: selectedProducts[productId],
						unit_price: 0,
						pricing_type: 'retail_price',
						discount_value: 0,
						this_month_quantity: 0,
						last_month_quantity: 0
					});
				}

				// Teklifi olustur
				const { data, error } = await OffersService.create(offerData, offerDetails);

				if (error) throw new Error(error);

				// Teklif talep logunu kaydet
				if (data && data.id) {
					var customerName = currentCustomer.company_name || currentCustomer.name || 'Musteri';
					await OfferLogsService.log(
						data.id,
						'requested',
						'customer',
						currentCustomer.id,
						customerName
					);
				}

				hideLoading();

				// Basari modalini goster
				document.getElementById('successModal').classList.add('active');

			} catch (err) {
				hideLoading();
				console.error('Teklif gonderme hatasi:', err);
				alert('Teklif gonderilirken bir hata olustu. Lutfen tekrar deneyin.');
			}
		}

		// Musteri bilgilerini yukle
		async function loadCustomerData() {
			var customerId = sessionStorage.getItem('isyerim_customer_id');

			if (!customerId) {
				// Giris yapilmamis, login sayfasina yonlendir
				window.location.href = 'isyerim-musteri-login.html';
				return false;
			}

			try {
				const { data, error } = await CustomersService.getById(customerId);
				if (error) throw new Error(error);

				currentCustomer = data;

				// ONCE mevcut teklif kontrolu yap (dealer_id kontrolunden once!)
				var offerResult = await checkExistingOffer();
				if (offerResult.isActive) {
					return false; // Read-only mod aktif, normal akisi durdur
				}

				// Aktif teklif yoksa dealer_id kontrolu yap
				if (!currentCustomer.dealer_id) {
					// Bayi yok, bayi secim ekranini goster
					document.getElementById('productsGrid').style.display = 'none';
					document.getElementById('submitSection').style.display = 'none';
					document.querySelector('.info-card').style.display = 'none';
					document.getElementById('dealerSelectionSection').style.display = 'block';
					await loadDealers();
					return false;
				}

				// Bayi bilgisini goster
				if (currentCustomer.dealer) {
					document.getElementById('dealerName').textContent = currentCustomer.dealer.name;
					document.getElementById('dealerInfo').style.display = 'flex';
				}

				return true;

			} catch (err) {
				console.error('Musteri bilgisi yukleme hatasi:', err);
				return false;
			}
		}

		// ==================== MESAJLASMA FONKSIYONLARI ====================

		// Mesajlari yukle
		async function loadMessages() {
			if (!activeOffer) {
				showChatDisabled();
				return;
			}

			try {
				const { data, error } = await MessagesService.getByOfferId(activeOffer.id);
				if (error) {
					console.error('Mesaj yukleme hatasi:', error);
					return;
				}

				renderMessages(data || []);

				// Okundu isaretle
				await MessagesService.markAsRead(activeOffer.id, currentUserType);
				updateUnreadBadge(0);

			} catch (err) {
				console.error('Mesaj yukleme hatasi:', err);
			}
		}

		// Mesajlari render et
		function renderMessages(messages) {
			var container = document.getElementById('chatMessages');

			if (!messages || messages.length === 0) {
				container.innerHTML = '<div class="no-messages">' +
					'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
					'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' +
					'</svg>' +
					'<p>Henuz mesaj yok</p>' +
				'</div>';
				return;
			}

			var html = '';
			var lastDate = null;

			messages.forEach(function(msg) {
				var msgDate = new Date(msg.created_at).toDateString();

				// Gun degistiyse ayirici ekle
				if (lastDate !== msgDate) {
					html += '<div class="date-separator"><span>' +
						formatDateSeparator(msg.created_at) + '</span></div>';
					lastDate = msgDate;
				}

				var senderName = msg.sender_type === 'dealer' ? 'Bayi' : 'Siz';
				var timeStr = formatMessageTime(msg.created_at);

				html += '<div class="message-bubble ' + msg.sender_type + '">' +
					'<div class="message-sender">' + senderName + '</div>' +
					'<div class="message-text">' + escapeHtml(msg.message) + '</div>' +
					'<div class="message-time">' + timeStr + '</div>' +
				'</div>';
			});

			container.innerHTML = html;
			scrollToBottom();
		}

		// HTML escape
		function escapeHtml(text) {
			var div = document.createElement('div');
			div.textContent = text;
			return div.innerHTML;
		}

		// Gun ayirici formatlama
		function formatDateSeparator(dateStr) {
			var date = new Date(dateStr);
			var now = new Date();

			if (date.toDateString() === now.toDateString()) {
				return 'Bugun';
			}

			var yesterday = new Date(now);
			yesterday.setDate(yesterday.getDate() - 1);
			if (date.toDateString() === yesterday.toDateString()) {
				return 'Dun';
			}

			return date.toLocaleDateString('tr-TR', {
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			});
		}

		// Mesaj zamani formatlama
		function formatMessageTime(dateStr) {
			var date = new Date(dateStr);
			var now = new Date();
			var diff = now - date;

			// Bugun mi?
			if (date.toDateString() === now.toDateString()) {
				return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
			}

			// Dun mu?
			var yesterday = new Date(now);
			yesterday.setDate(yesterday.getDate() - 1);
			if (date.toDateString() === yesterday.toDateString()) {
				return 'Dun ' + date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
			}

			// Daha eski
			return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) + ' ' +
				date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
		}

		// Mesaj alanini en alta kaydir
		function scrollToBottom() {
			var container = document.getElementById('chatMessages');
			container.scrollTop = container.scrollHeight;
		}

		// Mesaj gonder
		async function sendMessage() {
			var input = document.getElementById('messageInput');
			var message = input.value.trim();

			if (!message || !activeOffer || !currentCustomer) return;

			var btn = document.getElementById('btnSendMessage');
			btn.disabled = true;

			try {
				const { data, error } = await MessagesService.create({
					offer_id: activeOffer.id,
					sender_type: currentUserType,
					sender_id: currentCustomer.id,
					message: message
				});

				if (error) {
					console.error('Mesaj gonderme hatasi:', error);
					alert('Mesaj gonderilemedi. Lutfen tekrar deneyin.');
				} else {
					input.value = '';
					input.style.height = 'auto';
					loadMessages();
				}

			} catch (err) {
				console.error('Mesaj gonderme hatasi:', err);
				alert('Mesaj gonderilemedi. Lutfen tekrar deneyin.');
			}

			btn.disabled = false;
		}

		// Enter tusu ile mesaj gonder
		function handleMessageKeydown(event) {
			if (event.key === 'Enter' && !event.shiftKey) {
				event.preventDefault();
				sendMessage();
			}
		}

		// Chat'i devre disi goster
		function showChatDisabled() {
			document.getElementById('chatMessages').style.display = 'none';
			document.getElementById('chatInputWrapper').style.display = 'none';
			document.getElementById('chatDisabled').style.display = 'flex';
		}

		// Chat'i aktif goster
		function showChatEnabled() {
			document.getElementById('chatMessages').style.display = 'flex';
			document.getElementById('chatInputWrapper').style.display = 'flex';
			document.getElementById('chatDisabled').style.display = 'none';
		}

		// Okunmamis mesaj badge'i guncelle
		function updateUnreadBadge(count) {
			var badge = document.getElementById('chatBadge');
			var mobileBadge = document.getElementById('unreadBadgeMobile');

			if (count > 0) {
				badge.textContent = count;
				badge.style.display = 'inline';
				mobileBadge.textContent = count;
				mobileBadge.style.display = 'inline';
			} else {
				badge.style.display = 'none';
				mobileBadge.style.display = 'none';
			}
		}

		// Real-time mesaj dinleme
		function subscribeToMessages() {
			if (!activeOffer) return;

			// Onceki subscription'i kaldir
			if (messageSubscription) {
				MessagesService.unsubscribe(messageSubscription);
			}

			messageSubscription = MessagesService.subscribeToOffer(activeOffer.id, function(payload) {
				// Her yeni mesajda yükle (hem kendi hem karşı taraf)
				if (payload.new) {
					loadMessages();
				}
			});
		}

		// Mobil chat ac
		function openChatMobile() {
			document.getElementById('chatColumn').classList.add('active');
			document.body.style.overflow = 'hidden';
			scrollToBottom();
		}

		// Mobil chat kapat
		function closeChatMobile() {
			document.getElementById('chatColumn').classList.remove('active');
			document.body.style.overflow = '';
		}

		// Chat'i baslat
		async function initializeChat() {
			if (activeOffer && ['requested', 'pending', 'accepted'].includes(activeOffer.status)) {
				showChatEnabled();
				await loadMessages();
				subscribeToMessages();
			} else {
				showChatDisabled();
			}
		}

		// ==================== SAYFA YUKLENDIGINDE ====================

		// Sayfa yuklendiginde
		document.addEventListener('DOMContentLoaded', async function() {
			showLoading('Sayfa yukleniyor...');

			// Sube degisikligini dinle - sayfayi yenile
			window.addEventListener('branchChanged', function(e) {
				location.reload();
			});

			// Guvenlik sorulari event'lerini kaydet
			initSecurityQuestionListeners();

			// Musteri bilgilerini yukle
			var hasDealer = await loadCustomerData();

			// Read-only modda degilsek normal akisa devam et
			if (!isReadOnlyMode) {
				if (hasDealer) {
					// Urunleri yukle
					await loadProducts();
				}

				// Submit butonuna event listener (read-only degilse)
				document.getElementById('submitBtn').addEventListener('click', submitOfferRequest);
			}

			// Chat'i baslat
			await initializeChat();

			hideLoading();
		});
