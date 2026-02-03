// Auth kontrol - giris yapilmamissa login'e yonlendir
	if (!bayiAuthCheck()) {
		throw new Error('Auth required');
	}

	$(document).ready(async function() {
		// Bayi componentlerini yukle
		ComponentLoader.loadBayiComponents();
		// Ürünler Supabase'den yüklenecek
		var products = [];
		var currentCustomer = null;
		var currentDealerId = null;
		var currentDealerName = null;
		var currentOffer = null; // Mevcut kabul edilmiş teklif
		var isEditMode = false;
		var currentVkn = '';
		var isLoading = false;
		var messageSubscription = null;
		var currentUserType = 'dealer';
		var selectedBranchId = null; // Secili sube ID
		var customerBranches = []; // Musterinin bayi coverage'indaki subeleri
		var countdownInterval = null; // 24 saat geri sayim interval
		var countdownEndTime = null; // Geri sayim bitis zamani

		// Loading overlay
		function showLoading(text) {
			isLoading = true;
			if (!$('#loading-overlay').length) {
				$('body').append('<div id="loading-overlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(255,255,255,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;"><div style="text-align:center;"><div style="width:40px;height:40px;border:3px solid #e0e0e0;border-top-color:#002c77;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 15px;"></div><div style="color:#333;font-size:14px;">' + (text || 'Yükleniyor...') + '</div></div></div>');
				$('head').append('<style>@keyframes spin{to{transform:rotate(360deg)}}</style>');
			} else {
				$('#loading-overlay').find('div:last').text(text || 'Yükleniyor...');
				$('#loading-overlay').show();
			}
		}

		function hideLoading() {
			isLoading = false;
			$('#loading-overlay').hide();
		}

		// Error toast
		function showError(message) {
			if (!$('#error-toast').length) {
				$('body').append('<div id="error-toast" style="position:fixed;top:100px;left:50%;transform:translateX(-50%);background:#e53935;color:#fff;padding:16px 30px;border-radius:12px;font-size:14px;box-shadow:0 4px 20px rgba(229,57,53,0.4);z-index:1002;display:none;"><svg viewBox="0 0 24 24" fill="currentColor" style="width:20px;height:20px;display:inline-block;vertical-align:middle;margin-right:10px;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg><span></span></div>');
			}
			$('#error-toast span').text(message);
			$('#error-toast').fadeIn(300);
			setTimeout(function() { $('#error-toast').fadeOut(300); }, 4000);
		}

		// Musterinin bayi coverage'indaki subelerini yukle
		async function loadCustomerBranches(customerId) {
			try {
				const { data: branches, error } = await BranchesService.getByCustomerIdInDealerCoverage(customerId, currentDealerId);

				if (error) {
					console.error('Sube yukleme hatasi:', error);
					return;
				}

				customerBranches = branches || [];
				var $select = $('#branch-select');
				$select.empty().append('<option value="">Şube seçiniz...</option>');

				if (customerBranches.length === 0) {
					$('#branch-selector').addClass('visible');
					$select.hide();
					$('#no-branches-message').show();
					// ÜRÜNLERİ VE FORM ACTIONS'I GİZLE
					$('#products-form').removeClass('visible');
					$('#form-actions').hide();
					$('#city-district-selector').hide();
					$('#existing-notice').removeClass('visible');
					$('#passive-status-banner').removeClass('visible');
					return;
				}

				customerBranches.forEach(function(branch) {
					var label = branch.branch_name || branch.full_address || 'Şube';
					if (branch.is_default) label += ' (Varsayılan)';
					$select.append('<option value="' + branch.id + '">' + label + '</option>');
				});

				$select.show();
				$('#no-branches-message').hide();
				$('#branch-selector').addClass('visible');

				// Varsayilan subeyi sec
				var defaultBranch = customerBranches.find(function(b) { return b.is_default; });
				if (defaultBranch) {
					$select.val(defaultBranch.id);
					selectedBranchId = defaultBranch.id;
				} else if (customerBranches.length === 1) {
					$select.val(customerBranches[0].id);
					selectedBranchId = customerBranches[0].id;
				}
			} catch (err) {
				console.error('Sube yukleme hatasi:', err);
			}
		}

		// Sube secimi degistiginde
		$('#branch-select').on('change', function() {
			selectedBranchId = $(this).val() || null;
		});

		// İl değişince ilçeleri yükle (yeni müşteri için) - Sadece bayinin mikropazarlarındaki ilçeler
		$('#new-customer-city').on('change', async function() {
			var cityId = $(this).val();
			var $districtSelect = $('#new-customer-district');

			if (!cityId) {
				$districtSelect.prop('disabled', true).empty()
					.append('<option value="">Önce il seçiniz...</option>');
				return;
			}

			$districtSelect.prop('disabled', true).empty()
				.append('<option value="">Yükleniyor...</option>');

			// 1. Bayinin mikropazar ilçelerini al
			const { data: dealerDistricts } = await DealerDistrictsService.getByDealerId(currentDealerId);

			// 2. Seçili ile ait ve bayinin mikropazarında olan ilçeleri filtrele
			var dealerDistrictIdsInCity = (dealerDistricts || [])
				.filter(function(item) {
					return item.districts && item.districts.city_id === cityId;
				})
				.map(function(item) {
					return {
						id: item.district_id,
						name: item.districts.name
					};
				});

			// 3. Alfabetik sırala
			dealerDistrictIdsInCity.sort(function(a, b) {
				return a.name.localeCompare(b.name, 'tr');
			});

			// 4. Select'i doldur
			$districtSelect.prop('disabled', false).empty()
				.append('<option value="">İlçe seçiniz...</option>');
			dealerDistrictIdsInCity.forEach(function(district) {
				$districtSelect.append('<option value="' + district.id + '" data-name="' + district.name + '">' + district.name + '</option>');
			});
		});

		// Sayfa yüklendiğinde ürünleri ve bayi bilgisini al
		async function initPage() {
			showLoading('Ürünler yükleniyor...');
			try {
				// Ürünleri Supabase'den al
				const { data: productsData, error: productsError } = await ProductsService.getAll();
				if (productsError) throw new Error(productsError);

				// Session'dan bayi ID'sini ve ismini al
				currentDealerId = sessionStorage.getItem('bayi_dealer_id');
				currentDealerName = sessionStorage.getItem('bayi_dealer_name') || 'Bayi';
				if (!currentDealerId) {
					console.error('Bayi ID bulunamadi');
					hideLoading();
					showError('Bayi bilgisi bulunamadi. Lutfen tekrar giris yapin.');
					return;
				}

				// Bayinin sehir bilgisini al ve il bazli fiyatlari yukle
				var cityRetailPrices = {};
				try {
					const { data: dealer } = await DealersService.getById(currentDealerId);
					if (dealer) {
						// city_id varsa dogrudan kullan, yoksa city isminden bul
						var cityId = dealer.city_id;
						if (!cityId && dealer.city) {
							const { data: locationIds } = await LocationsService.findLocationIds(dealer.city);
							if (locationIds && locationIds.city_id) {
								cityId = locationIds.city_id;
							}
						}

						// city_id bulunduysa il bazli fiyatlari al
						if (cityId) {
							const { data: cityPrices } = await RetailPricesByCityService.getByCityId(cityId);
							if (cityPrices) {
								cityPrices.forEach(function(cp) {
									if (cp.product_id && cp.retail_price) {
										cityRetailPrices[cp.product_id] = cp.retail_price;
									}
								});
							}
						}
					}
				} catch (err) {
					console.warn('Il bazli fiyatlar yuklenemedi, genel fiyatlar kullanilacak:', err);
				}

				// Urunleri isle - il bazli fiyat varsa onu, yoksa base_price kullan
				products = productsData.map(p => ({
					id: p.id,
					code: p.code,
					name: p.name,
					image: p.image_url || './İpragaz Bayi_files/IPR-BAYI-12-kg-ipr-uzun.png',
					base_price: cityRetailPrices[p.id] !== undefined ? cityRetailPrices[p.id] : p.base_price
				}));

				hideLoading();

				// URL parametrelerini kontrol et
				var urlParams = new URLSearchParams(window.location.search);
				var offerIdParam = urlParams.get('offer_id');

				if (offerIdParam) {
					// Mevcut teklif düzenleme - VKN arama gizle
					$('#vkn-search-section').hide();
					await loadOfferById(offerIdParam);
				} else {
					// Yeni müşteri ekleme - VKN arama göster
					$('#vkn-search-section').show();
				}
			} catch (error) {
				hideLoading();
				showError('Sayfa yüklenirken hata oluştu: ' + error.message);
				console.error(error);
			}
		}

		// Sayfayı başlat
		initPage();

		// VKN search
		$('#vkn-search-btn').on('click', async function() {
			var vkn = $('#vkn-input').val().trim();
			if (vkn.length === 10) {
				await searchVkn(vkn);
			} else {
				$('#customer-info-box').addClass('visible error');
				$('#customer-name').text('Lütfen 10 haneli geçerli bir VKN giriniz.');
			}
		});

		$('#vkn-input').on('keypress', async function(e) {
			if (e.which === 13) {
				$('#vkn-search-btn').click();
			}
		});

		// Offer ID ile teklif yükleme
		async function loadOfferById(offerId) {
			showLoading('Teklif yükleniyor...');

			try {
				const { data: offer, error } = await OffersService.getById(offerId);

				if (error) {
					hideLoading();
					showError('Teklif yüklenirken hata oluştu');
					return;
				}

				if (!offer) {
					hideLoading();
					showError('Teklif bulunamadı');
					return;
				}

				// Bayi kontrolü - sadece kendi teklifini görebilir
				if (offer.dealer_id !== currentDealerId) {
					hideLoading();
					showError('Bu teklifi görüntüleme yetkiniz yok');
					return;
				}

				// Form değişkenlerini set et
				currentOffer = offer;
				currentCustomer = offer.customer;
				currentVkn = offer.customer.vkn;
				isEditMode = true;

				// Save buton metnini guncelle
				updateSaveButtonText();

				// Musterinin bayi coverage'indaki subelerini yukle
				await loadCustomerBranches(offer.customer.id);

				// Mevcut teklifin sube bilgisini sec
				if (offer.customer_branch_id && customerBranches.length > 0) {
					$('#branch-select').val(offer.customer_branch_id);
					selectedBranchId = offer.customer_branch_id;
				}

				// Chat'i baslat
				initializeChat();

				// offer_details'ı customer_prices formatına dönüştür
				var customerPrices = offer.offer_details || [];

				$('#customer-info-box').removeClass('error').addClass('visible');
				$('#customer-name').text(offer.customer.name + (offer.customer.company_name ? ' - ' + offer.customer.company_name : ''));
				$('#page-title').text('Teklif Düzenleme');
				$('#page-subtitle').text('Mevcut müşteri fiyatlarını düzenleyin');

				// Fiyat tanımlanmış mı kontrolü
				var hasPrices = customerPrices.some(function(p) { return p.unit_price !== undefined; });

				if (!hasPrices) {
					$('#existing-notice').addClass('visible');
					$('#existing-notice-text').text('Bu müşteriniz için henüz fiyat tanımlamadınız.');
					$('#passive-status-banner').removeClass('visible');
					$('#passive-customer-btn').hide();
					$('#activate-customer-btn').hide();
					$('#cancel-offer-btn').hide();
				} else {
					$('#existing-notice').removeClass('visible');

					// Teklif durumuna gore buton kontrolu
					if (offer.status === 'passive') {
						$('#passive-status-banner').addClass('visible');
						$('#passive-customer-btn').hide();
						$('#activate-customer-btn').show();
						$('#cancel-offer-btn').show();
					} else if (offer.status === 'accepted') {
						$('#passive-status-banner').removeClass('visible');
						$('#passive-customer-btn').show();
						$('#activate-customer-btn').hide();
						$('#cancel-offer-btn').show();
					} else if (offer.status === 'cancelled' || offer.status === 'rejected') {
						// Cancelled/rejected teklif - banner göster, butonları gizle
						$('#passive-status-banner').removeClass('visible');
						$('#cancelled-status-banner').addClass('visible');
						$('#passive-customer-btn').hide();
						$('#activate-customer-btn').hide();
						$('#cancel-offer-btn').hide();
						// Form populate edilecek sonra disable edilecek
					} else {
						$('#passive-status-banner').removeClass('visible');
						$('#passive-customer-btn').hide();
						$('#activate-customer-btn').hide();
						$('#cancel-offer-btn').hide();
					}
				}

				// Ürün satırlarını temizle
				$('#product-rows').empty();
				// Teklif özetini güncelle
				updateOfferSummary();

				// Teklif detayları varsa sadece onları göster
				if (customerPrices && customerPrices.length > 0) {
					customerPrices.forEach(function(detail) {
						var product = detail.product;
						if (product) {
							var fullProduct = products.find(function(p) { return p.id === product.id; }) || product;
							addProductRow(
								{ id: product.id, code: product.code, name: product.name, base_price: fullProduct.base_price, image: fullProduct.image || product.image_url },
								detail.commitment_quantity || '',
								detail.unit_price || '',
								detail.this_month_quantity,
								detail.last_month_quantity,
								detail.pricing_type || 'retail_price',
								detail.discount_value || 0
							);
						}
					});
				} else {
					// Teklif yoksa tüm ürünleri göster
					products.forEach(function(product) {
						addProductRow(product, '', '', undefined, undefined, 'retail_price', 0);
					});
				}

				$('#products-form').addClass('visible');
				$('#form-actions').show();

				// Save options - mevcut teklif var, gizle
				$('#save-options').hide();

				// Teklif gecmisini yukle
				loadOfferLogs(offer.id);

				// Teklif varsa "Yeni Ürün Ekle" butonunu göster
				if (customerPrices && customerPrices.length > 0) {
					$('#addProductSection').show();
				} else {
					$('#addProductSection').hide();
				}

				// 24 saat geri sayım - teklif onaylanmadıysa sayacı başlat
				if (offer.status !== 'accepted' && offer.status !== 'cancelled' && offer.status !== 'rejected') {
					// Son 'created' veya 'price_updated' action'ını bul
					const logsResult = await OfferLogsService.getByOfferId(offer.id);
					if (logsResult.data && logsResult.data.length > 0) {
						var lastSentLog = logsResult.data.find(function(log) {
							return log.action === 'price_updated' || log.action === 'created';
						});
						if (lastSentLog) {
							startCountdown(lastSentLog.created_at);
						}
					}
				} else {
					stopCountdown();
				}

				hideLoading();

				// Cancelled/rejected teklifler icin duzenlemeyi engelle (form doldurulduktan sonra)
				if (offer.status === 'cancelled' || offer.status === 'rejected') {
					disableEditingForCancelledOffer();
				}
			} catch (error) {
				hideLoading();
				showError('Teklif yüklenirken hata: ' + error.message);
				console.error(error);
			}
		}

		// Supabase ile VKN sorgulama - Yeni mikropazar mantığı
		async function searchVkn(vkn) {
			currentVkn = vkn;
			showLoading('Müşteri sorgulanıyor...');

			try {
				// ADIM 1: Bu VKN'li şubeleri bul (customer_branches tablosundan)
				const { data: branchesWithVkn, error: branchError } = await BranchesService.getByVkn(vkn);

				if (branchError) {
					hideLoading();
					showError('Şube sorgulanırken hata oluştu');
					return;
				}

				// DURUM 1: VKN YOK (Hiç şube kaydı yok)
				if (!branchesWithVkn || branchesWithVkn.length === 0) {
					// Customers tablosunda da kontrol et (dealer_created olanlar için)
					const { data: existingCustomer, error: customerError } = await CustomersService.getByVkn(vkn);

					if (customerError) {
						hideLoading();
						showError('Müşteri sorgulanırken hata oluştu');
						return;
					}

					if (existingCustomer && existingCustomer.registration_status === 'dealer_created') {
						// Bayi daha önce oluşturmuş - mevcut müşteriyi kullan
						currentCustomer = existingCustomer;
						isEditMode = true;

						// Şubesi var mı kontrol et
						const { data: existingBranches } = await BranchesService.getByCustomerId(existingCustomer.id);
						if (existingBranches && existingBranches.length > 0) {
							// Şube var, dropdown'a yükle
							customerBranches = existingBranches;
							loadBranchDropdown(existingBranches);
							$('#branch-selector').addClass('visible');
							$('#city-district-selector').hide();
						} else {
							// Şube yok, il/ilçe seçim formu göster
							$('#branch-selector').removeClass('visible');
							showCityDistrictSelector();
						}

						await showNewCustomerForm(vkn, existingCustomer);
						hideLoading();
						return;
					} else if (!existingCustomer) {
						// Tamamen yeni müşteri - il/ilçe seçimi göster
						// NOT: Müşteri ve şube kaydı KAYDET butonunda oluşturulacak
						currentCustomer = null;
						isEditMode = false;

						$('#branch-selector').removeClass('visible');
						showCityDistrictSelector();

						await showNewCustomerForm(vkn, null);
						hideLoading();
						return;
					} else {
						// Müşteri var ve customer_registered ama şubesi yok - edge case
						// Bu durumda müşterinin kendisi şube eklemeli
						hideLoading();
						$('#customer-info-box').addClass('visible error');
						$('#customer-name').html('<strong>Bu VKN ile kayıtlı müşteri var ancak şubesi bulunmuyor.</strong><br>Müşterinin kendi panelinden şube eklemesi gerekmektedir.');
						$('#products-form').removeClass('visible');
						$('#form-actions').hide();
						$('#branch-selector').removeClass('visible');
						$('#city-district-selector').hide();
						return;
					}
				}

				// ADIM 2: VKN VAR - Bayinin mikropazar alanlarını al
				const { data: dealerDistricts, error: districtError } = await DealerDistrictsService.getByDealerId(currentDealerId);

				if (districtError) {
					hideLoading();
					showError('Bayi bölge bilgisi alınamadı');
					return;
				}

				var dealerDistrictIds = (dealerDistricts || []).map(function(d) { return d.district_id; });

				// ADIM 3: Şubeleri filtrele - bayinin bölgesinde olanlar
				var branchesInCoverage = branchesWithVkn.filter(function(branch) {
					return dealerDistrictIds.includes(branch.district_id);
				});

				// DURUM 2: VKN VAR + Mikropazar eşleşmesi YOK
				if (branchesInCoverage.length === 0) {
					hideLoading();
					showNotInCoverageError(vkn);
					return;
				}

				// DURUM 3: VKN VAR + Mikropazar eşleşmesi VAR
				// Başka bayi ile aktif teklifi olmayan şubeleri filtrele
				var branchIdsInCoverage = branchesInCoverage.map(function(b) { return b.id; });
				const { data: availableBranchIds, error: filterError } = await OffersService.filterBranchesWithoutActiveOffers(branchIdsInCoverage, currentDealerId);

				if (filterError) {
					hideLoading();
					showError('Teklif kontrolü sırasında hata oluştu');
					return;
				}

				// Uygun şubeleri bul
				var availableBranches = branchesInCoverage.filter(function(b) {
					return availableBranchIds.includes(b.id);
				});

				if (availableBranches.length === 0) {
					hideLoading();
					showAllBranchesHaveOffersError(vkn);
					return;
				}

				// Müşteri bilgisini al
				var customerId = branchesInCoverage[0].customer_id;
				const { data: customer, error: customerFetchError } = await CustomersService.getById(customerId);

				if (customerFetchError || !customer) {
					hideLoading();
					showError('Müşteri bilgisi alınamadı');
					return;
				}

				currentCustomer = customer;
				isEditMode = true;
				customerBranches = availableBranches;

				// Dropdown'a şubeleri yükle
				loadBranchDropdown(availableBranches);
				$('#branch-selector').addClass('visible');
				$('#city-district-selector').hide();

				// Bu bayi-müşteri için en son teklifi çek
				const { data: offer } = await OffersService.getLatestOfferForDealerCustomer(currentDealerId, customer.id);

				// Cancelled/rejected teklif döndüyse yeni teklif oluşturulabilmesi için null yap
				if (offer && (offer.status === 'cancelled' || offer.status === 'rejected')) {
					currentOffer = null;
				} else {
					currentOffer = offer;
				}

				// Save buton metnini guncelle
				updateSaveButtonText();

				// Chat'i baslat
				initializeChat();

				// offer_details'ı customer_prices formatına dönüştür
				var customerPrices = [];
				if (currentOffer && currentOffer.offer_details) {
					customerPrices = currentOffer.offer_details;
				}
				customer.customer_prices = customerPrices;

				$('#customer-info-box').removeClass('error').addClass('visible');
				$('#customer-name').text(customer.name + (customer.company_name ? ' - ' + customer.company_name : ''));
				$('#page-title').text('Teklif Düzenleme');
				$('#page-subtitle').text('Mevcut müşteri fiyatlarını düzenleyin');

				// Fiyat tanımlanmış mı kontrolü
				var hasPrices = customerPrices.some(function(p) { return p.unit_price !== undefined; });

				if (!hasPrices) {
					$('#existing-notice').addClass('visible');
					$('#existing-notice-text').text('Bu müşteriniz için henüz fiyat tanımlamadınız.');
					$('#passive-status-banner').removeClass('visible');
					$('#passive-customer-btn').hide();
					$('#activate-customer-btn').hide();
					$('#cancel-offer-btn').hide();
				} else {
					$('#existing-notice').removeClass('visible');

					if (currentOffer && currentOffer.status === 'passive') {
						$('#passive-status-banner').addClass('visible');
						$('#passive-customer-btn').hide();
						$('#activate-customer-btn').show();
						$('#cancel-offer-btn').show();
					} else if (currentOffer && currentOffer.status === 'accepted') {
						$('#passive-status-banner').removeClass('visible');
						$('#passive-customer-btn').show();
						$('#activate-customer-btn').hide();
						$('#cancel-offer-btn').show();
					} else {
						$('#passive-status-banner').removeClass('visible');
						$('#cancelled-status-banner').removeClass('visible');
						$('#passive-customer-btn').hide();
						$('#activate-customer-btn').hide();
						$('#cancel-offer-btn').hide();
					}
				}

				// Ürün satırlarını temizle
				$('#product-rows').empty();
				updateOfferSummary();

				// Teklif detayları varsa sadece onları göster
				if (customerPrices && customerPrices.length > 0) {
					customerPrices.forEach(function(detail) {
						var product = detail.product;
						if (product) {
							var fullProduct = products.find(function(p) { return p.id === product.id; }) || product;
							addProductRow(
								{ id: product.id, code: product.code, name: product.name, base_price: fullProduct.base_price, image: fullProduct.image || product.image_url },
								detail.commitment_quantity || '',
								detail.unit_price || '',
								detail.this_month_quantity,
								detail.last_month_quantity,
								detail.pricing_type || 'retail_price',
								detail.discount_value || 0
							);
						}
					});
				} else {
					products.forEach(function(product) {
						addProductRow(product, '', '', undefined, undefined, 'retail_price', 0);
					});
				}

				$('#products-form').addClass('visible');
				$('#form-actions').show();

				if (currentOffer) {
					$('#save-options').hide();
				} else {
					$('#save-options').show();
				}

				loadOfferLogs(currentOffer ? currentOffer.id : null);

				if (customerPrices && customerPrices.length > 0) {
					$('#addProductSection').show();
				} else {
					$('#addProductSection').hide();
				}

				// 24 saat geri sayım
				if (currentOffer && currentOffer.status !== 'accepted' && currentOffer.status !== 'cancelled' && currentOffer.status !== 'rejected') {
					const logsResult = await OfferLogsService.getByOfferId(currentOffer.id);
					if (logsResult.data && logsResult.data.length > 0) {
						var lastSentLog = logsResult.data.find(function(log) {
							return log.action === 'price_updated' || log.action === 'created';
						});
						if (lastSentLog) {
							startCountdown(lastSentLog.created_at);
						}
					}
				} else {
					stopCountdown();
				}

				hideLoading();
			} catch (err) {
				hideLoading();
				showError('Bir hata oluştu: ' + err.message);
				console.error(err);
			}
		}

		// Şubeleri dropdown'a yükle
		function loadBranchDropdown(branches) {
			var $select = $('#branch-select');
			$select.empty().append('<option value="">Şube seçiniz...</option>');

			branches.forEach(function(branch) {
				var label = branch.branch_name || branch.full_address || 'Şube';
				if (branch.is_default) label += ' (Varsayılan)';
				$select.append('<option value="' + branch.id + '">' + label + '</option>');
			});

			$select.show();
			$('#no-branches-message').hide();

			// Varsayilan subeyi sec
			var defaultBranch = branches.find(function(b) { return b.is_default; });
			if (defaultBranch) {
				$select.val(defaultBranch.id);
				selectedBranchId = defaultBranch.id;
			} else if (branches.length === 1) {
				$select.val(branches[0].id);
				selectedBranchId = branches[0].id;
			}
		}

		// İl/İlçe seçici göster
		function showCityDistrictSelector() {
			$('#city-district-selector').show();
			loadCitiesForNewCustomer();
		}

		// İlleri yükle (yeni müşteri için) - Sadece bayinin mikropazarlarındaki iller
		async function loadCitiesForNewCustomer() {
			// 1. Bayinin mikropazar ilçelerini al
			const { data: dealerDistricts } = await DealerDistrictsService.getByDealerId(currentDealerId);

			// 2. Benzersiz city_id'leri çıkart
			var dealerCityIds = [];
			(dealerDistricts || []).forEach(function(item) {
				if (item.districts && item.districts.city_id) {
					if (!dealerCityIds.includes(item.districts.city_id)) {
						dealerCityIds.push(item.districts.city_id);
					}
				}
			});

			// 3. Tüm illeri al
			const { data: allCities } = await LocationsService.getCities();

			// 4. Sadece bayinin mikropazarlarında olan illeri filtrele
			var filteredCities = (allCities || []).filter(function(city) {
				return dealerCityIds.includes(city.id);
			});

			// 5. Select'i doldur
			var $select = $('#new-customer-city');
			$select.empty().append('<option value="">İl seçiniz...</option>');
			filteredCities.forEach(function(city) {
				$select.append('<option value="' + city.id + '" data-name="' + city.name + '">' + city.name + '</option>');
			});
		}

		// Yeni müşteri formu göster
		async function showNewCustomerForm(vkn, existingCustomer) {
			currentOffer = null;
			selectedBranchId = null;

			// Save buton metnini guncelle
			updateSaveButtonText();

			if (existingCustomer) {
				$('#customer-info-box').removeClass('error').addClass('visible');
				$('#customer-name').text(existingCustomer.name + (existingCustomer.company_name ? ' - ' + existingCustomer.company_name : ''));
				$('#page-title').text('Teklif Düzenleme');
				$('#page-subtitle').text('Mevcut müşteri fiyatlarını düzenleyin');
			} else {
				$('#customer-info-box').removeClass('error').addClass('visible');
				$('#customer-name').text('YENİ MÜŞTERİ - Şirket Ünvanı (VKN: ' + vkn + ')');
				$('#page-title').text('Yeni Müşteri Fiyat Tanımlama');
				$('#page-subtitle').text('Müşteri için özel fiyat ve taahhüt tanımlayın');
			}

			$('#existing-notice').addClass('visible');
			$('#existing-notice-text').text('Bu VKN ile kayıtlı müşteri bulunamadı. Yeni müşteri olarak eklenecektir.');
			$('#passive-status-banner').removeClass('visible');
			$('#passive-customer-btn').hide();
			$('#activate-customer-btn').hide();
			$('#cancel-offer-btn').hide();

			// Tüm ürünleri varsayılan perakende fiyatla göster
			$('#product-rows').empty();
			updateOfferSummary();

			products.forEach(function(product) {
				addProductRow(product, '', '', undefined, undefined, 'retail_price', 0);
			});

			$('#products-form').addClass('visible');
			$('#form-actions').show();
			$('#save-options').show();
			$('#addProductSection').hide();

			// Yeni müşteri - sayacı gizle
			stopCountdown();
		}

		// "Bölgenizde Değil" hata mesajı
		function showNotInCoverageError(vkn) {
			$('#customer-info-box').addClass('visible error');
			$('#customer-name').html(
				'<strong>Bu VKN sizin bölgenizde değil!</strong><br>' +
				'Bu VKN\'li müşterinin şubeleri sizin sorumluluk alanınızda bulunmamaktadır.'
			);
			$('#products-form').removeClass('visible');
			$('#form-actions').hide();
			$('#branch-selector').removeClass('visible');
			$('#city-district-selector').hide();
			$('#existing-notice').removeClass('visible');
			$('#passive-status-banner').removeClass('visible');
		}

		// "Tüm Şubelerde Aktif Teklif Var" hata mesajı
		function showAllBranchesHaveOffersError(vkn) {
			$('#customer-info-box').addClass('visible error');
			$('#customer-name').html(
				'<strong>Uygun şube bulunamadı!</strong><br>' +
				'Bu VKN\'li müşterinin bölgenizdeki tüm şubelerinde başka bayilerle aktif teklif bulunmaktadır.'
			);
			$('#products-form').removeClass('visible');
			$('#form-actions').hide();
			$('#branch-selector').removeClass('visible');
			$('#city-district-selector').hide();
			$('#existing-notice').removeClass('visible');
			$('#passive-status-banner').removeClass('visible');
		}

		function addProductRow(product, quantity, price, thisMonth, lastMonth, pricingType, discountValue) {

			// Calculate percentages for stats
			var target = quantity || 0;
			var hasCommitment = target > 0;

			// Tüketim değerleri
			var thisMonthVal = thisMonth || 0;
			var lastMonthVal = lastMonth || 0;

			// Yüzde ve değer hesaplama
			var thisMonthPercent, lastMonthPercent;
			var thisMonthValueText, lastMonthValueText;

			if (hasCommitment) {
				thisMonthPercent = Math.round((thisMonthVal / target) * 100);
				lastMonthPercent = Math.round((lastMonthVal / target) * 100);
				thisMonthValueText = thisMonthVal + '/' + target;
				lastMonthValueText = lastMonthVal + '/' + target;
			} else {
				thisMonthPercent = 100;
				lastMonthPercent = 100;
				thisMonthValueText = thisMonthVal;
				lastMonthValueText = lastMonthVal;
			}

			function getColorClass(percent, hasCommitment) {
				if (!hasCommitment) return 'good';
				if (percent >= 80) return 'good';
				if (percent >= 50) return 'medium';
				return 'low';
			}

			var thisMonthClass = getColorClass(thisMonthPercent, hasCommitment);
			var lastMonthClass = getColorClass(lastMonthPercent, hasCommitment);

			var hasStats = thisMonth !== undefined || lastMonth !== undefined;
			var statsVisible = hasStats ? ' visible' : '';

			// Pricing type defaults - varsayılan perakende fiyat
			var selectedType = pricingType || 'retail_price';
			var basePrice = product.base_price || 0;

			// Hesaplanan degerler
			var fixedDiscountValue = selectedType === 'fixed_discount' ? (discountValue || '') : '';
			var fixedPriceValue = selectedType === 'fixed_price' ? (price || '') : '';
			var percentageValue = selectedType === 'percentage_discount' ? (discountValue || '') : '';

			// Son fiyat hesapla
			var finalPrice = calculateFinalPrice(basePrice, selectedType, discountValue || 0, price || 0);

			var rowHtml = '<div class="product-row" data-product-id="' + product.id + '" data-base-price="' + basePrice + '">' +
				'<div class="product-image">' +
					'<img src="' + product.image + '" alt="' + product.name + '">' +
				'</div>' +
				'<div class="product-info">' +
					'<div class="product-name">' + product.name + '</div>' +
					'<div class="product-code">' + product.code + '</div>' +
				'</div>' +

				// YENİ: Üst İstatistik Bölümü - GEÇEN AY | BU AY | AYLIK ORT. TÜKETİM
				'<div class="product-stats-header' + statsVisible + '">' +
					// 1. GEÇEN AY
					'<div class="stat-box-compact">' +
						'<div class="stat-box-compact-title">Geçen Ay</div>' +
						'<div class="stat-box-compact-value">' + lastMonthValueText + '</div>' +
						'<div class="stat-progress-compact">' +
							'<div class="stat-progress-compact-fill ' + lastMonthClass + '" style="width: ' + Math.min(lastMonthPercent, 100) + '%"></div>' +
						'</div>' +
						'<div class="stat-percent-compact ' + lastMonthClass + '">%' + lastMonthPercent + '</div>' +
					'</div>' +
					// 2. BU AY
					'<div class="stat-box-compact">' +
						'<div class="stat-box-compact-title">Bu Ay</div>' +
						'<div class="stat-box-compact-value">' + thisMonthValueText + '</div>' +
						'<div class="stat-progress-compact">' +
							'<div class="stat-progress-compact-fill ' + thisMonthClass + '" style="width: ' + Math.min(thisMonthPercent, 100) + '%"></div>' +
						'</div>' +
						'<div class="stat-percent-compact ' + thisMonthClass + '">%' + thisMonthPercent + '</div>' +
					'</div>' +
					// 3. AYLIK ORT. TÜKETİM
					'<div class="consumption-box-compact">' +
						'<div class="consumption-box-compact-label">Aylık Ort. Tüketim</div>' +
						'<div class="consumption-box-compact-input">' +
							'<input type="number" class="quantity-input" placeholder="0" value="' + (quantity || '') + '" min="0">' +
							'<span>adet</span>' +
						'</div>' +
					'</div>' +
				'</div>' +

				// Pricing Section
				'<div class="pricing-section">' +
					'<div class="base-price-display">' +
						'Perakende Fiyat: <strong>' + formatPrice(basePrice) + ' TL</strong>' +
					'</div>' +
					'<div class="pricing-options">' +
						// 1. Perakende Fiyatı Uygula
						'<div class="pricing-option' + (selectedType === 'retail_price' ? ' selected' : '') + '" data-type="retail_price">' +
							'<input type="radio" name="pricing_' + product.id + '" value="retail_price"' + (selectedType === 'retail_price' ? ' checked' : '') + '>' +
							'<div class="pricing-radio"><div class="pricing-radio-inner"></div></div>' +
							'<div class="pricing-label">Perakende Fiyatı Uygula</div>' +
							'<div class="pricing-input-wrapper">' +
								'<span class="retail-price-display">' + formatPrice(basePrice) + ' TL</span>' +
							'</div>' +
						'</div>' +
						// 2. Sabit Fiyat
						'<div class="pricing-option' + (selectedType === 'fixed_price' ? ' selected' : '') + '" data-type="fixed_price">' +
							'<input type="radio" name="pricing_' + product.id + '" value="fixed_price"' + (selectedType === 'fixed_price' ? ' checked' : '') + '>' +
							'<div class="pricing-radio"><div class="pricing-radio-inner"></div></div>' +
							'<div class="pricing-label">Sabit Fiyat</div>' +
							'<div class="pricing-input-wrapper">' +
								'<input type="number" class="discount-input fixed-price-input" placeholder="0" value="' + fixedPriceValue + '" min="0" step="0.01"' + (selectedType !== 'fixed_price' ? ' disabled' : '') + '>' +
								'<span class="input-unit">TL</span>' +
							'</div>' +
						'</div>' +
						// 3. Sabit Fiyat İndirimi
						'<div class="pricing-option' + (selectedType === 'fixed_discount' ? ' selected' : '') + '" data-type="fixed_discount">' +
							'<input type="radio" name="pricing_' + product.id + '" value="fixed_discount"' + (selectedType === 'fixed_discount' ? ' checked' : '') + '>' +
							'<div class="pricing-radio"><div class="pricing-radio-inner"></div></div>' +
							'<div class="pricing-label">Sabit Fiyat İndirimi</div>' +
							'<div class="pricing-input-wrapper">' +
								'<input type="number" class="discount-input fixed-discount-input" placeholder="0" value="' + fixedDiscountValue + '" min="0" step="0.01"' + (selectedType !== 'fixed_discount' ? ' disabled' : '') + '>' +
								'<span class="input-unit">TL indirim</span>' +
							'</div>' +
						'</div>' +
						// 4. Yüzdesel İndirim
						'<div class="pricing-option' + (selectedType === 'percentage_discount' ? ' selected' : '') + '" data-type="percentage_discount">' +
							'<input type="radio" name="pricing_' + product.id + '" value="percentage_discount"' + (selectedType === 'percentage_discount' ? ' checked' : '') + '>' +
							'<div class="pricing-radio"><div class="pricing-radio-inner"></div></div>' +
							'<div class="pricing-label">Yüzdesel İndirim</div>' +
							'<div class="pricing-input-wrapper">' +
								'<input type="number" class="discount-input percentage-input" placeholder="0" value="' + percentageValue + '" min="0" max="100" step="0.1"' + (selectedType !== 'percentage_discount' ? ' disabled' : '') + '>' +
								'<span class="input-unit">%</span>' +
							'</div>' +
						'</div>' +
					'</div>' +
					'<div class="final-price-display">' +
						'<span class="final-price-label">Müşteriye Uygulanacak BİRİM FİYAT:</span>' +
						'<span class="final-price-value">' + formatPrice(finalPrice) + ' TL</span>' +
					'</div>' +
				'</div>' +
			'</div>';

			$('#product-rows').append(rowHtml);

			// Teklif özetini güncelle
			updateOfferSummary();
		}

		// Fiyat formatlama
		function formatPrice(price) {
			return parseFloat(price || 0).toFixed(2);
		}

		// Son fiyat hesaplama
		function calculateFinalPrice(basePrice, pricingType, discountValue, fixedPrice) {
			switch(pricingType) {
				case 'retail_price':
					return basePrice;
				case 'fixed_discount':
					return Math.max(0, basePrice - (discountValue || 0));
				case 'fixed_price':
					return fixedPrice || 0;
				case 'percentage_discount':
					return basePrice * (1 - (discountValue || 0) / 100);
				default:
					return basePrice;
			}
		}

		// ===== YENİ ÜRÜN EKLEME FONKSİYONLARI =====

		// Eklenen ürün ID'lerini al
		function getAddedProductIds() {
			var ids = [];
			$('.product-row').each(function() {
				ids.push($(this).data('product-id'));
			});
			return ids;
		}

		// Modal aç ve kullanılabilir ürünleri göster
		function openProductModal() {
			var addedIds = getAddedProductIds();
			var available = products.filter(function(p) {
				return !addedIds.includes(p.id);
			});
			renderProductGrid(available);
			$('#productModalOverlay').addClass('active');
			$('body').css('overflow', 'hidden');
			$('#productSearchInput').val('').focus();
		}

		// Modal kapat
		function closeProductModal() {
			$('#productModalOverlay').removeClass('active');
			$('body').css('overflow', '');
		}

		// Ürün grid render
		function renderProductGrid(productList) {
			var html = '';
			if (productList.length === 0) {
				html = '<div class="product-grid-empty">Eklenebilecek ürün kalmadı.</div>';
			} else {
				productList.forEach(function(p) {
					html += '<div class="product-grid-item" data-id="' + p.id + '">' +
								'<img src="' + p.image + '" alt="' + p.name + '">' +
								'<div class="product-grid-name">' + p.name + '</div>' +
								'<div class="product-grid-code">' + p.code + '</div>' +
								'<button type="button" class="btn-select-product">Ekle</button>' +
							'</div>';
				});
			}
			$('#productModalGrid').html(html);
		}

		// Ürün seç ve listeye ekle
		function selectProduct(productId) {
			var product = products.find(function(p) { return p.id === productId; });
			if (!product) return;

			// Yeni satır ekle
			addProductRow(product, '', '', undefined, undefined, 'retail_price', 0);

			// Son eklenen satıra highlight ekle
			var $newRow = $('.product-row').last();
			$newRow.addClass('newly-added');

			// Smooth scroll
			setTimeout(function() {
				$newRow[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
			}, 100);

			// 3 saniye sonra highlight kaldır
			setTimeout(function() {
				$newRow.removeClass('newly-added');
			}, 3000);

			// Modal kapat
			closeProductModal();
		}

		// Yeni Ürün Ekle butonu click
		$('#btnAddProduct').on('click', function() {
			openProductModal();
		});

		// Modal kapat butonu
		$('#productModalClose').on('click', function() {
			closeProductModal();
		});

		// Modal overlay click - kapat
		$('#productModalOverlay').on('click', function(e) {
			if (e.target === this) {
				closeProductModal();
			}
		});

		// Save options checkbox toggle
		$('#save-as-accepted').on('change', function() {
			if (this.checked) {
				$('#notify-customer-option').addClass('show');
			} else {
				$('#notify-customer-option').removeClass('show');
				$('#notify-customer').prop('checked', false);
			}
		});

		// ESC tuşu ile modal kapat
		$(document).on('keydown', function(e) {
			if (e.key === 'Escape' && $('#productModalOverlay').hasClass('active')) {
				closeProductModal();
			}
		});

		// Ürün seç butonu click
		$(document).on('click', '.btn-select-product', function(e) {
			e.stopPropagation();
			var productId = $(this).closest('.product-grid-item').data('id');
			selectProduct(productId);
		});

		// Ürün kartına click (tüm kart tıklanabilir)
		$(document).on('click', '.product-grid-item', function(e) {
			if (!$(e.target).is('.btn-select-product')) {
				var productId = $(this).data('id');
				selectProduct(productId);
			}
		});

		// Ürün arama
		$('#productSearchInput').on('input', function() {
			var query = $(this).val().toLowerCase().trim();
			var addedIds = getAddedProductIds();
			var filtered = products.filter(function(p) {
				return !addedIds.includes(p.id) &&
					(p.name.toLowerCase().includes(query) || p.code.toLowerCase().includes(query));
			});
			renderProductGrid(filtered);
		});

		// ===== YENİ ÜRÜN EKLEME FONKSİYONLARI SONU =====

		// Pricing option click - select pricing type
		$(document).on('click', '.pricing-option', function(e) {
			// Input'a tıklandığında seçim değişmesin
			if ($(e.target).is('input.discount-input')) {
				return;
			}

			var $row = $(this).closest('.product-row');
			var $option = $(this);
			var selectedType = $option.data('type');

			// Zaten seçili ise bir şey yapma
			if ($option.hasClass('selected')) {
				return;
			}

			var basePrice = parseFloat($row.data('base-price')) || 0;

			// Deselect all options in this row
			$row.find('.pricing-option').removeClass('selected').removeClass('error');
			$row.find('.pricing-option input[type="radio"]').prop('checked', false);
			$row.find('.pricing-option .discount-input').prop('disabled', true).css('border-color', '#e0e0e0');

			// Select this option
			$option.addClass('selected');
			$option.find('input[type="radio"]').prop('checked', true);
			var $discountInput = $option.find('.discount-input');
			if ($discountInput.length) {
				$discountInput.prop('disabled', false).focus();
			}

			// Perakende fiyat seçildiğinde tüketim zorunluluğu kalkar
			if (selectedType === 'retail_price') {
				$row.find('.consumption-box-compact').removeClass('error');
			}

			// Update final price display
			updateFinalPrice($row);
		});

		// Discount input change - update price calculation and clear errors
		$(document).on('input', '.discount-input', function() {
			var $row = $(this).closest('.product-row');
			var $option = $(this).closest('.pricing-option');

			// Clear error state
			$option.removeClass('error');
			$(this).css('border-color', '#002c77');

			updateFinalPrice($row);
		});

		// Quantity input change - clear error and update summary
		$(document).on('input', '.quantity-input', function() {
			var $row = $(this).closest('.product-row');
			$row.find('.consumption-box-compact').removeClass('error');
			// Teklif özetini güncelle
			updateOfferSummary();
		});

		// Update final price for a row
		function updateFinalPrice($row) {
			var basePrice = parseFloat($row.data('base-price')) || 0;
			var $selectedOption = $row.find('.pricing-option.selected');
			var selectedType = $selectedOption.data('type');
			var inputValue = parseFloat($selectedOption.find('.discount-input').val()) || 0;

			var finalPrice = 0;
			if (selectedType === 'retail_price') {
				finalPrice = basePrice;
			} else if (selectedType === 'fixed_discount') {
				finalPrice = Math.max(0, basePrice - inputValue);
			} else if (selectedType === 'fixed_price') {
				finalPrice = inputValue;
			} else if (selectedType === 'percentage_discount') {
				finalPrice = basePrice * (1 - inputValue / 100);
			}

			// Update the final price display
			$row.find('.final-price-value').text(formatPrice(finalPrice) + ' TL');

			// Teklif özetini güncelle
			updateOfferSummary();
		}

		// Save buton metnini duruma gore guncelle
		function updateSaveButtonText() {
			var $saveBtn = $('#save-btn');
			if (currentOffer && ['requested', 'pending'].includes(currentOffer.status)) {
				$saveBtn.html('<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg> TEKLİFİ GÖNDER');
			} else {
				$saveBtn.html('<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg> Kaydet');
			}
		}

		// Update offer summary totals
		function updateOfferSummary() {
			var totalRetail = 0;
			var totalDiscounted = 0;

			$('#product-rows .product-row').each(function() {
				var $row = $(this);
				var basePrice = parseFloat($row.data('base-price')) || 0;
				var quantity = parseFloat($row.find('.quantity-input').val()) || 0;
				var finalPrice = parseFloat($row.find('.final-price-value').text().replace(/[^\d.,]/g, '').replace(',', '.')) || 0;

				totalRetail += basePrice * quantity;
				totalDiscounted += finalPrice * quantity;
			});

			var benefit = totalRetail - totalDiscounted;

			$('#total-retail-price').text(totalRetail.toLocaleString('tr-TR', {minimumFractionDigits: 2}) + ' TL');
			$('#total-discounted-price').text(totalDiscounted.toLocaleString('tr-TR', {minimumFractionDigits: 2}) + ' TL');
			$('#total-benefit').text(benefit.toLocaleString('tr-TR', {minimumFractionDigits: 2}) + ' TL');

			// En az bir ürün varsa özet alanını göster
			if ($('#product-rows .product-row').length > 0) {
				$('#offer-summary-section').show();
			} else {
				$('#offer-summary-section').hide();
			}
		}

		// Populate offer preview modal
		function populateOfferPreview() {
			// Müşteri bilgisi
			var customerName = $('#customer-name').text();
			var branchName = $('#branch-select option:selected').text();
			$('#preview-customer-name').text(customerName);
			$('#preview-customer-branch').text(branchName !== 'Şube seçiniz...' ? branchName : '');

			// Ürün listesi
			var productsHtml = '';
			var totalRetail = 0;
			var totalDiscounted = 0;

			$('#product-rows .product-row').each(function() {
				var $row = $(this);
				var productName = $row.find('.product-name').text();
				var basePrice = parseFloat($row.data('base-price')) || 0;
				var quantity = parseFloat($row.find('.quantity-input').val()) || 0;
				var finalPriceText = $row.find('.final-price-value').text();
				var finalPrice = parseFloat(finalPriceText.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;

				var rowRetail = basePrice * quantity;
				var rowDiscounted = finalPrice * quantity;
				totalRetail += rowRetail;
				totalDiscounted += rowDiscounted;

				var showOriginal = finalPrice < basePrice;

				productsHtml += '<div class="preview-product-item">' +
					'<div class="preview-product-info">' +
						'<div class="preview-product-name">' + productName + '</div>' +
						'<div class="preview-product-detail">' + quantity + ' adet x ' + finalPrice.toLocaleString('tr-TR', {minimumFractionDigits: 2}) + ' TL</div>' +
					'</div>' +
					'<div class="preview-product-prices">' +
						(showOriginal ? '<div class="preview-product-original">' + rowRetail.toLocaleString('tr-TR', {minimumFractionDigits: 2}) + ' TL</div>' : '') +
						'<div class="preview-product-final">' + rowDiscounted.toLocaleString('tr-TR', {minimumFractionDigits: 2}) + ' TL</div>' +
					'</div>' +
				'</div>';
			});

			$('#preview-products-list').html(productsHtml);

			// Toplamlar
			var benefit = totalRetail - totalDiscounted;
			$('#preview-retail-total').text(totalRetail.toLocaleString('tr-TR', {minimumFractionDigits: 2}) + ' TL');
			$('#preview-discounted-total').text(totalDiscounted.toLocaleString('tr-TR', {minimumFractionDigits: 2}) + ' TL');
			$('#preview-benefit-total').text(benefit.toLocaleString('tr-TR', {minimumFractionDigits: 2}) + ' TL');
		}

		// Save button
		$('#save-btn').on('click', function() {
			var hasError = false;
			var $firstError = null;
			var errorMessage = '';

			$('.product-row').each(function() {
				var $row = $(this);
				var $selectedOption = $row.find('.pricing-option.selected');
				var selectedType = $selectedOption.data('type');
				var $input = $selectedOption.find('.discount-input');
				var inputVal = parseFloat($input.val()) || 0;
				var quantity = parseInt($row.find('.quantity-input').val()) || 0;

				// Hata durumlarini temizle
				$selectedOption.removeClass('error');
				$input.css('border-color', '#e0e0e0');
				$row.find('.consumption-box-compact').removeClass('error');

				// Perakende fiyat seciliyse input kontrolu gerekmez
				if (selectedType !== 'retail_price') {
					// Diger seceneklerde input degeri olmali
					if (inputVal <= 0) {
						$selectedOption.addClass('error');
						$input.css('border-color', '#e53935');
						hasError = true;
						errorMessage = 'Lütfen tüm ürünler için fiyat bilgisi giriniz.';
						if (!$firstError) {
							$firstError = $row;
						}
					}

					// Perakende disinda tuketim adedi zorunlu
					if (quantity <= 0) {
						$row.find('.consumption-box-compact').addClass('error');
						hasError = true;
						errorMessage = 'Perakende fiyat dışında bir seçenek için Aylık Ort. Tüketim girilmelidir.';
						if (!$firstError) {
							$firstError = $row;
						}
					}
				}
			});

			if (hasError) {
				showError(errorMessage);
				if ($firstError) {
					$('html, body').animate({
						scrollTop: $firstError.offset().top - 100
					}, 300);
				}
				return;
			}

			populateOfferPreview();
			$('#offer-preview-modal').addClass('active');
		});

		$('#modal-cancel').on('click', function() {
			$('#save-modal').removeClass('active');
		});

		// Preview modal close/cancel handlers
		$('#preview-modal-close, #preview-modal-cancel').on('click', function() {
			$('#offer-preview-modal').removeClass('active');
		});

		// TEKLİFİ GÖNDER - preview modal send handler
		$('#preview-modal-send').on('click', async function() {
			$('#offer-preview-modal').removeClass('active');
			showLoading('Kaydediliyor...');

			try {
				var customerId;
				var branchIdToUse = selectedBranchId;

				// Yeni müşteri mi yoksa mevcut mu?
				if (!isEditMode || !currentCustomer) {
					// VKN YOK durumu - Yeni müşteri oluşturulacak
					// İl/ilçe seçimi kontrolü
					var cityId = $('#new-customer-city').val();
					var districtId = $('#new-customer-district').val();

					if (!cityId || !districtId) {
						hideLoading();
						showError('Lütfen müşteri için il ve ilçe seçiniz.');
						return;
					}

					// 1. Müşteri oluştur (registration_status = 'dealer_created')
					var customerData = {
						vkn: currentVkn,
						name: 'Müşteri ' + currentVkn,
						company_name: $('#customer-name').text().replace('YENİ MÜŞTERİ - ', '').split(' (VKN')[0],
						phone: '',
						registration_status: 'dealer_created',
						is_active: true
					};

					const { data: newCustomer, error: customerError } = await CustomersService.create(customerData);
					if (customerError) throw new Error(customerError);
					customerId = newCustomer.id;

					// 2. İl ve ilçe isimlerini al
					var cityName = $('#new-customer-city option:selected').attr('data-name') || '';
					var districtName = $('#new-customer-district option:selected').attr('data-name') || '';

					// 3. Merkez şube oluştur
					var branchData = {
						customer_id: newCustomer.id,
						branch_name: 'Merkez',
						city_id: cityId,
						district_id: districtId,
						city: cityName,
						district: districtName,
						is_default: true,
						is_active: true
					};

					const { data: newBranch, error: branchError } = await BranchesService.create(branchData);
					if (branchError) throw new Error(branchError);

					branchIdToUse = newBranch.id;
					currentCustomer = newCustomer;
				} else {
					customerId = currentCustomer.id;

					// Mevcut müşteri - şube seçimi kontrolü
					if (!branchIdToUse && customerBranches.length > 0) {
						hideLoading();
						showError('Lütfen teklif verilecek şubeyi seçiniz.');
						return;
					}
				}

				// Teklif detaylarını topla - yeni fiyatlandırma yapısı ile
				var offerDetails = [];
				$('.product-row').each(function() {
					var $row = $(this);
					var productId = $row.data('product-id');
					var basePrice = parseFloat($row.data('base-price')) || 0;
					var quantity = parseInt($row.find('.quantity-input').val()) || 0;

					// Seçili pricing option'ı bul
					var $selectedOption = $row.find('.pricing-option.selected');
					var pricingType = $selectedOption.data('type');
					var inputVal = parseFloat($selectedOption.find('.discount-input').val()) || 0;

					// Son fiyatı hesapla
					var finalPrice = 0;
					var discountValue = 0;

					if (pricingType === 'retail_price') {
						discountValue = 0;
						finalPrice = basePrice;
					} else if (pricingType === 'fixed_discount') {
						discountValue = inputVal;
						finalPrice = Math.max(0, basePrice - inputVal);
					} else if (pricingType === 'fixed_price') {
						discountValue = 0;
						finalPrice = inputVal;
					} else if (pricingType === 'percentage_discount') {
						discountValue = inputVal;
						finalPrice = basePrice * (1 - inputVal / 100);
					}

					// Ürünü teklife dahil etme koşulu:
					// - İndirim uygulandıysa (retail_price dışında bir seçenek) VEYA
					// - Aylık ortalama tüketim girilmişse (quantity > 0)
					var hasDiscount = pricingType !== 'retail_price';
					var hasQuantity = quantity > 0;

					if (finalPrice > 0 && (hasDiscount || hasQuantity)) {
						offerDetails.push({
							product_id: productId,
							unit_price: finalPrice,
							pricing_type: pricingType,
							discount_value: discountValue,
							commitment_quantity: quantity,
							this_month_quantity: 0,
							last_month_quantity: 0
						});
					}
				});

				// Teklif oluştur veya güncelle
				if (offerDetails.length > 0) {
					if (currentOffer) {
						// Mevcut teklifi güncelle
						const { error: detailsError } = await OffersService.updateDetails(currentOffer.id, offerDetails);
						if (detailsError) throw new Error(detailsError);

						// Fiyat guncelleme logunu kaydet
						await OfferLogsService.log(
							currentOffer.id,
							'price_updated',
							'dealer',
							currentDealerId,
							currentDealerName
						);

						// Status 'requested' ise 'pending' yap (bayi fiyat girdi)
						if (currentOffer.status === 'requested') {
							const { error: statusError } = await OffersService.updateStatus(currentOffer.id, 'pending');
							if (statusError) throw new Error(statusError);
						}
					} else {
						// Yeni teklif oluştur
						const saveAsAccepted = $('#save-as-accepted').is(':checked');
						const offerData = {
							dealer_id: currentDealerId,
							customer_id: customerId,
							customer_branch_id: branchIdToUse || null,
							status: saveAsAccepted ? 'accepted' : 'pending',
							notes: 'Bayi panelinden oluşturuldu'
						};
						const { data: newOffer, error: offerError } = await OffersService.create(offerData, offerDetails);
						if (offerError) throw new Error(offerError);

						// Teklif olusturma logunu kaydet
						if (newOffer && newOffer.id) {
							await OfferLogsService.log(
								newOffer.id,
								'created',
								'dealer',
								currentDealerId,
								currentDealerName
							);
						}
					}
				}

				// Sayacı şu anki zamandan başlat (teklif gönderildi)
				startCountdown(new Date().toISOString());

				hideLoading();
				$('#success-message').addClass('active');

				setTimeout(function() {
					$('#success-message').removeClass('active');
					window.location.href = 'bayi-teklif-listesi.html';
				}, 2000);

			} catch (err) {
				hideLoading();
				showError('Kayıt sırasında hata oluştu: ' + err.message);
				console.error(err);
			}
		});

		// Pasife Çek handlers
		$('#passive-customer-btn').on('click', function() {
			$('#passive-modal').addClass('active');
		});

		$('#passive-modal-cancel').on('click', function() {
			$('#passive-modal').removeClass('active');
		});

		$('#passive-modal-confirm').on('click', async function() {
			$('#passive-modal').removeClass('active');
			showLoading('İşlem yapılıyor...');

			try {
				if (currentOffer) {
					// Teklifi pasife al
					const { error } = await OffersService.update(currentOffer.id, {
						status: 'passive'
					});
					if (error) throw new Error(error);
					currentOffer.status = 'passive';

					// Pasife alma logunu kaydet
					await OfferLogsService.log(
						currentOffer.id,
						'passived',
						'dealer',
						currentDealerId,
						currentDealerName
					);

					// Timeline'i guncelle
					loadOfferLogs(currentOffer.id);
				}

				hideLoading();

				// Update UI - show passive banner, swap buttons
				$('#passive-status-banner').addClass('visible');
				$('#passive-customer-btn').hide();
				$('#activate-customer-btn').show();

				// Show success message
				$('#success-message').find('span').text('Teklif pasife alındı!');
				$('#success-message').addClass('active');

				setTimeout(function() {
					$('#success-message').removeClass('active');
				}, 2000);
			} catch (err) {
				hideLoading();
				showError('İşlem sırasında hata oluştu: ' + err.message);
			}
		});

		// Aktif Et handlers
		$('#activate-customer-btn').on('click', function() {
			$('#activate-modal').addClass('active');
		});

		$('#activate-modal-cancel').on('click', function() {
			$('#activate-modal').removeClass('active');
		});

		$('#activate-modal-confirm').on('click', async function() {
			$('#activate-modal').removeClass('active');
			showLoading('İşlem yapılıyor...');

			try {
				if (currentOffer) {
					// Teklifi aktif et (accepted durumuna geri al)
					const { error } = await OffersService.updateStatus(currentOffer.id, 'accepted');
					if (error) throw new Error(error);
					currentOffer.status = 'accepted';

					// Aktif etme logunu kaydet
					await OfferLogsService.log(
						currentOffer.id,
						'activated',
						'dealer',
						currentDealerId,
						currentDealerName
					);

					// Timeline'i guncelle
					loadOfferLogs(currentOffer.id);
				}

				hideLoading();

				// Update UI - hide passive banner, swap buttons
				$('#passive-status-banner').removeClass('visible');
				$('#passive-customer-btn').show();
				$('#activate-customer-btn').hide();

				// Show success message
				$('#success-message').find('span').text('Teklif aktif edildi!');
				$('#success-message').addClass('active');

				setTimeout(function() {
					$('#success-message').removeClass('active');
				}, 2000);
			} catch (err) {
				hideLoading();
				showError('İşlem sırasında hata oluştu: ' + err.message);
			}
		});

		// Teklifi İptal Et handlers
		$('#cancel-offer-btn').on('click', function() {
			$('#cancel-offer-modal').addClass('active');
		});

		$('#cancel-offer-modal-cancel').on('click', function() {
			$('#cancel-offer-modal').removeClass('active');
		});

		$('#cancel-offer-modal-confirm').on('click', async function() {
			$('#cancel-offer-modal').removeClass('active');
			showLoading('İşlem yapılıyor...');

			try {
				if (currentOffer) {
					// Teklifi iptal et
					const { error } = await OffersService.updateStatus(currentOffer.id, 'cancelled');
					if (error) throw new Error(error);
					currentOffer.status = 'cancelled';

					// Iptal logunu kaydet
					await OfferLogsService.log(
						currentOffer.id,
						'cancelled',
						'dealer',
						currentDealerId,
						currentDealerName
					);

					// Timeline'i guncelle
					loadOfferLogs(currentOffer.id);
				}

				hideLoading();

				// Update UI - hide cancel button
				$('#cancel-offer-btn').hide();
				$('#passive-customer-btn').hide();
				$('#activate-customer-btn').hide();
				$('#passive-status-banner').removeClass('visible');
				$('#cancelled-status-banner').addClass('visible');

				// Duzenlemeyi engelle
				disableEditingForCancelledOffer();

				// Show success message
				$('#success-message').find('span').text('Teklif iptal edildi!');
				$('#success-message').addClass('active');

				setTimeout(function() {
					$('#success-message').removeClass('active');
				}, 2000);
			} catch (err) {
				hideLoading();
				showError('İşlem sırasında hata oluştu: ' + err.message);
			}
		});

		// Close modals on overlay click
		$('.modal-overlay').on('click', function(e) {
			if ($(e.target).hasClass('modal-overlay')) {
				$(this).removeClass('active');
			}
		});

		// ==================== MESAJLASMA FONKSIYONLARI ====================

		// Mesajlari yukle
		async function loadMessages() {
			if (!currentOffer) {
				showChatDisabled();
				return;
			}

			try {
				const { data, error } = await MessagesService.getByOfferId(currentOffer.id);
				if (error) {
					console.error('Mesaj yukleme hatasi:', error);
					return;
				}

				renderMessages(data || []);

				// Okundu isaretle
				await MessagesService.markAsRead(currentOffer.id, currentUserType);
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

				var senderName = msg.sender_type === 'dealer' ? 'Siz' : 'Musteri';
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
		window.sendMessage = async function() {
			var input = document.getElementById('messageInput');
			var message = input.value.trim();

			if (!message || !currentOffer || !currentDealerId) return;

			var btn = document.getElementById('btnSendMessage');
			btn.disabled = true;

			try {
				const { data, error } = await MessagesService.create({
					offer_id: currentOffer.id,
					sender_type: currentUserType,
					sender_id: currentDealerId,
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
		};

		// Enter tusu ile mesaj gonder
		window.handleMessageKeydown = function(event) {
			if (event.key === 'Enter' && !event.shiftKey) {
				event.preventDefault();
				sendMessage();
			}
		};

		// Iptal edilmis teklifler icin duzenlemeyi engelle
		function disableEditingForCancelledOffer() {
			// Tum fiyat inputlarini disable et
			$('.discount-input').prop('disabled', true);
			$('.pricing-type-select').prop('disabled', true);

			// Urun ekleme bolumunu gizle
			$('#addProductSection').hide();

			// Kaydet butonunu gizle
			$('#save-btn').hide();

			// Mesajlasmayi kapat
			showChatDisabled();

			// Chat disabled mesajini guncelle
			$('#chatDisabled p').text('İptal edilmiş tekliflerde mesaj gönderilemez');
		}

		// Teklif gecmisini yukle ve goster
		async function loadOfferLogs(offerId) {
			if (!offerId) {
				$('#offer-metadata').hide();
				return;
			}

			$('#offer-metadata').show();
			var timeline = document.getElementById('metadata-timeline');
			timeline.innerHTML = '<p class="timeline-empty">Yukleniyor...</p>';

			var result = await OfferLogsService.getByOfferId(offerId);
			if (result.error || !result.data) {
				timeline.innerHTML = '<p class="timeline-empty">Gecmis yuklenemedi</p>';
				return;
			}

			var logs = result.data;
			if (!logs.length) {
				timeline.innerHTML = '<p class="timeline-empty">Henuz kayit yok</p>';
				return;
			}

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
		}

		// ==================== 24 SAAT GERİ SAYIM FONKSİYONLARI ====================

		// Sayacı başlat/güncelle
		function startCountdown(sentTimestamp) {
			// Önceki interval'i temizle
			if (countdownInterval) {
				clearInterval(countdownInterval);
			}

			// 24 saat = 86400000 ms
			countdownEndTime = new Date(sentTimestamp).getTime() + (24 * 60 * 60 * 1000);

			updateCountdownDisplay();
			countdownInterval = setInterval(updateCountdownDisplay, 1000);

			$('#offer-countdown').show();
		}

		// Sayaç gösterimini güncelle
		function updateCountdownDisplay() {
			var now = Date.now();
			var remaining = countdownEndTime - now;

			var $container = $('#offer-countdown');
			var $timer = $('#countdown-timer');

			if (remaining <= 0) {
				$timer.text('00:00:00');
				$container.addClass('warning');
				return;
			}

			var hours = Math.floor(remaining / (1000 * 60 * 60));
			var minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
			var seconds = Math.floor((remaining % (1000 * 60)) / 1000);

			var timeStr =
				String(hours).padStart(2, '0') + ':' +
				String(minutes).padStart(2, '0') + ':' +
				String(seconds).padStart(2, '0');

			$timer.text(timeStr);

			// Son 1 saatten az kaldıysa uyarı stili
			if (remaining < 60 * 60 * 1000) {
				$container.addClass('warning');
			} else {
				$container.removeClass('warning');
			}
		}

		// Sayacı durdur ve gizle
		function stopCountdown() {
			if (countdownInterval) {
				clearInterval(countdownInterval);
				countdownInterval = null;
			}
			$('#offer-countdown').hide();
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
			if (!currentOffer) return;

			// Onceki subscription'i kaldir
			if (messageSubscription) {
				MessagesService.unsubscribe(messageSubscription);
			}

			messageSubscription = MessagesService.subscribeToOffer(currentOffer.id, function(payload) {
				// Her yeni mesajda yükle (hem kendi hem karşı taraf)
				if (payload.new) {
					loadMessages();
				}
			});
		}

		// Mobil chat ac
		window.openChatMobile = function() {
			document.getElementById('chatColumn').classList.add('active');
			document.body.style.overflow = 'hidden';
			scrollToBottom();
		};

		// Mobil chat kapat
		window.closeChatMobile = function() {
			document.getElementById('chatColumn').classList.remove('active');
			document.body.style.overflow = '';
		};

		// Chat'i baslat
		window.initializeChat = async function() {
			if (currentOffer && ['requested', 'pending', 'accepted'].includes(currentOffer.status)) {
				showChatEnabled();
				await loadMessages();
				subscribeToMessages();
			} else {
				showChatDisabled();
			}
		};

		// Sayfa yuklendiginde chat disabled olarak baslasin
		showChatDisabled();
	});
