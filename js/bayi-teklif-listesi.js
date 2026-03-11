// Auth kontrol - giris yapilmamissa login'e yonlendir
if (!bayiAuthCheck()) {
	throw new Error('Auth required');
}

// ================================
// BULK IMPORT GLOBAL VARIABLES
// ================================
var bulkImportData = [];
var validatedRows = [];
var allProducts = [];
var productsMap = {};

// ================================
// BULK IMPORT MODAL FUNCTIONS
// ================================

function openBulkImportModal() {
	document.getElementById('bulkImportOverlay').classList.add('active');
	document.body.style.overflow = 'hidden';
	goToStep(1);
}

function closeBulkImportModal() {
	document.getElementById('bulkImportOverlay').classList.remove('active');
	document.body.style.overflow = '';
	// Reset state
	bulkImportData = [];
	validatedRows = [];
	document.getElementById('bulkFileInput').value = '';
}

function goToStep(step) {
	document.querySelectorAll('.bulk-step').forEach(function(el) {
		el.style.display = 'none';
	});
	document.getElementById('bulkStep' + step).style.display = 'flex';
}

// ================================
// TEMPLATE DOWNLOAD
// ================================

function downloadTemplate() {
	// Ornek veri
	var templateData = [
		{
			'VKN': '1234567890',
			'Urun Kodu': 'LPG-001',
			'Birim Fiyat': 150.00,
			'Indirim Tipi': 'discount_value',
			'Indirim Degeri': 10,
			'Taahhut Miktari': 100
		},
		{
			'VKN': '1234567890',
			'Urun Kodu': 'LPG-002',
			'Birim Fiyat': 200.00,
			'Indirim Tipi': 'retail_price',
			'Indirim Degeri': 0,
			'Taahhut Miktari': 50
		},
		{
			'VKN': '9876543210',
			'Urun Kodu': 'LPG-001',
			'Birim Fiyat': 145.00,
			'Indirim Tipi': 'discount_value',
			'Indirim Degeri': 15,
			'Taahhut Miktari': 200
		}
	];

	// Worksheet olustur
	var ws = XLSX.utils.json_to_sheet(templateData);

	// Kolon genislikleri
	ws['!cols'] = [
		{ wch: 15 }, // VKN
		{ wch: 15 }, // Urun Kodu
		{ wch: 12 }, // Birim Fiyat
		{ wch: 15 }, // Indirim Tipi
		{ wch: 15 }, // Indirim Degeri
		{ wch: 15 }  // Taahhut Miktari
	];

	// Workbook olustur
	var wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Teklifler');

	// Indir
	XLSX.writeFile(wb, 'toplu_teklif_sablonu.xlsx');
}

// ================================
// FILE UPLOAD & READ
// ================================

function handleBulkFileSelect(event) {
	var file = event.target.files[0];
	if (file) {
		handleBulkFileUpload(file);
	}
}

// Drag and drop desteği
document.addEventListener('DOMContentLoaded', function() {
	var uploadArea = document.getElementById('bulkUploadArea');
	if (uploadArea) {
		uploadArea.addEventListener('dragover', function(e) {
			e.preventDefault();
			uploadArea.classList.add('dragover');
		});

		uploadArea.addEventListener('dragleave', function(e) {
			e.preventDefault();
			uploadArea.classList.remove('dragover');
		});

		uploadArea.addEventListener('drop', function(e) {
			e.preventDefault();
			uploadArea.classList.remove('dragover');
			var file = e.dataTransfer.files[0];
			if (file) {
				handleBulkFileUpload(file);
			}
		});
	}
});

async function handleBulkFileUpload(file) {
	// Loading goster
	var step1 = document.getElementById('bulkStep1');
	step1.innerHTML = '<div class="bulk-loading"><div class="spinner"></div><p>Dosya okunuyor...</p></div>';

	try {
		// Urunleri yukle (henuz yuklenmemisse)
		if (allProducts.length === 0) {
			var productsResult = await ProductsService.getAll();
			if (productsResult.error) throw new Error(productsResult.error);
			allProducts = productsResult.data || [];
			// Kod bazli map olustur
			productsMap = {};
			allProducts.forEach(function(p) {
				productsMap[p.code] = p;
			});
		}

		// Excel oku
		var reader = new FileReader();
		reader.onload = async function(e) {
			try {
				var data = new Uint8Array(e.target.result);
				var workbook = XLSX.read(data, { type: 'array' });
				var firstSheet = workbook.Sheets[workbook.SheetNames[0]];
				var jsonData = XLSX.utils.sheet_to_json(firstSheet);

				if (jsonData.length === 0) {
					alert('Excel dosyasi bos veya hatali format!');
					resetStep1();
					return;
				}

				bulkImportData = jsonData;

				// Validasyon yap
				var dealerId = sessionStorage.getItem('bayi_dealer_id');
				await validateImportData(jsonData, dealerId);

				// Adim 2'ye gec
				goToStep(2);
			} catch (err) {
				console.error('Excel okuma hatasi:', err);
				alert('Excel dosyasi okunamadi: ' + err.message);
				resetStep1();
			}
		};
		reader.readAsArrayBuffer(file);
	} catch (err) {
		console.error('Dosya yukleme hatasi:', err);
		alert('Hata: ' + err.message);
		resetStep1();
	}
}

function resetStep1() {
	var step1 = document.getElementById('bulkStep1');
	step1.innerHTML = '<div class="bulk-step-header">' +
		'<h2>Toplu Teklif Olustur</h2>' +
		'<button type="button" class="modal-close-btn" onclick="closeBulkImportModal()">' +
		'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>' +
		'</button></div>' +
		'<p class="bulk-step-desc">Excel sablonunu indirin, doldurun ve yukleyin.</p>' +
		'<div class="template-download">' +
		'<div class="template-info">' +
		'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>' +
		'<div><strong>Ornek Excel Sablonu</strong><span>VKN, Urun Kodu, Fiyat bilgilerini iceren sablon</span></div>' +
		'</div>' +
		'<button type="button" class="btn-download" onclick="downloadTemplate()">' +
		'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg> Indir</button></div>' +
		'<div class="file-upload-area" id="bulkUploadArea">' +
		'<input type="file" id="bulkFileInput" accept=".xlsx,.xls" onchange="handleBulkFileSelect(event)" />' +
		'<div class="upload-content">' +
		'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg>' +
		'<p>Excel dosyasini surukleyin veya secin</p><span>.xlsx veya .xls formatinda</span></div></div>' +
		'<div class="bulk-actions"><button type="button" class="btn-secondary" onclick="closeBulkImportModal()">Vazgec</button></div>';
}

// ================================
// VALIDATION
// ================================

// Status text helper fonksiyonu
function getStatusText(status) {
	var statusMap = {
		'pending': 'Onay Bekliyor',
		'accepted': 'Kabul Edildi',
		'requested': 'Teklif Istendi',
		'passive': 'Pasif'
	};
	return statusMap[status] || status;
}

async function validateImportData(rows, dealerId) {
	validatedRows = [];
	var errors = [];
	var customerCache = {}; // VKN -> customer

	// Her satir icin validasyon
	for (var i = 0; i < rows.length; i++) {
		var row = rows[i];
		var rowErrors = [];
		var validatedRow = {
			rowIndex: i + 1,
			vkn: String(row['VKN'] || '').trim(),
			productCode: String(row['Urun Kodu'] || '').trim(),
			unitPrice: parseFloat(row['Birim Fiyat']) || 0,
			pricingType: String(row['Indirim Tipi'] || 'retail_price').trim(),
			discountValue: parseFloat(row['Indirim Degeri']) || 0,
			commitmentQuantity: parseInt(row['Taahhut Miktari']) || 0,
			customer: null,
			product: null,
			isValid: true,
			isNewCustomer: false,
			errors: []
		};

		// VKN kontrolu
		if (!validatedRow.vkn) {
			rowErrors.push('VKN bos olamaz');
		} else if (!/^\d{10,11}$/.test(validatedRow.vkn)) {
			rowErrors.push('VKN 10 veya 11 haneli olmali');
		} else {
			// Musteri kontrolu (cache kullan)
			if (!customerCache.hasOwnProperty(validatedRow.vkn)) {
				var customerResult = await CustomersService.getByVkn(validatedRow.vkn);
				customerCache[validatedRow.vkn] = customerResult.data || null;
			}
			validatedRow.customer = customerCache[validatedRow.vkn];
			// VKN sistemde yoksa - yeni musteri olarak isaretle (HATA DEGIL!)
			if (!validatedRow.customer) {
				validatedRow.isNewCustomer = true;
			}

			// Aktif teklif kontrolleri
			if (validatedRow.customer) {
				// 1. Baska bayide aktif teklifi var mi?
				var otherDealerCheck = await OffersService.hasActiveOfferWithOtherDealer(
					validatedRow.vkn,
					dealerId
				);
				if (otherDealerCheck.data && otherDealerCheck.data.hasOffer) {
					rowErrors.push('Bu VKN baska bayide (' + otherDealerCheck.data.dealerName + ') aktif teklifi var');
				}

				// 2. Bu bayide aktif teklifi var mi?
				var currentDealerOffer = await OffersService.getLatestOfferForDealerCustomer(
					dealerId,
					validatedRow.customer.id
				);
				if (currentDealerOffer.data &&
					['pending', 'accepted', 'requested', 'passive'].includes(currentDealerOffer.data.status)) {
					rowErrors.push('Bu VKN ile zaten aktif teklifiniz var (Durum: ' +
						getStatusText(currentDealerOffer.data.status) + ')');
				}
			}
		}

		// Urun kodu kontrolu
		if (!validatedRow.productCode) {
			rowErrors.push('Urun kodu bos olamaz');
		} else {
			validatedRow.product = productsMap[validatedRow.productCode] || null;
			if (!validatedRow.product) {
				rowErrors.push('Urun kodu gecersiz: ' + validatedRow.productCode);
			}
		}

		// Fiyat kontrolu
		if (validatedRow.unitPrice <= 0) {
			rowErrors.push('Birim fiyat 0\'dan buyuk olmali');
		}

		// Pricing type kontrolu
		if (!['retail_price', 'discount_value'].includes(validatedRow.pricingType)) {
			validatedRow.pricingType = 'retail_price';
		}

		// Taahhut kontrolu
		if (validatedRow.commitmentQuantity < 0) {
			validatedRow.commitmentQuantity = 0;
		}

		// Sonuclari kaydet
		if (rowErrors.length > 0) {
			validatedRow.isValid = false;
			validatedRow.errors = rowErrors;
			errors.push({ row: i + 1, errors: rowErrors });
		}

		validatedRows.push(validatedRow);
	}

	// Onizleme tablosunu doldur
	renderPreviewTable();

	// Ozet bilgileri guncelle
	updateSummary();

	// Hata ozetini goster
	updateValidationSummary(errors);
}

function renderPreviewTable() {
	var tbody = document.querySelector('#previewTable tbody');
	tbody.innerHTML = '';

	validatedRows.forEach(function(row) {
		var tr = document.createElement('tr');
		tr.className = row.isValid ? 'row-valid' : 'row-invalid';

		// Durum ikonu
		var statusIcon = row.isValid
			? '<div class="status-icon valid"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>'
			: '<div class="status-icon invalid"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></div>';

		// Musteri adi - yeni musteri icin ozel gosterim
		var customerNameHtml;
		if (row.customer) {
			customerNameHtml = row.customer.name;
		} else if (row.isNewCustomer && row.isValid) {
			customerNameHtml = '<span class="new-customer-badge">Yeni Musteri</span>';
		} else {
			customerNameHtml = '<span style="color:#ef4444">-</span>';
		}

		tr.innerHTML =
			'<td>' + statusIcon + '</td>' +
			'<td>' + row.vkn + '</td>' +
			'<td>' + customerNameHtml + '</td>' +
			'<td>' + row.productCode + '</td>' +
			'<td>' + (row.product ? row.product.name : '<span style="color:#ef4444">-</span>') + '</td>' +
			'<td>' + row.unitPrice.toFixed(2) + ' TL</td>' +
			'<td>' + row.commitmentQuantity + '</td>';

		if (!row.isValid) {
			tr.title = row.errors.join('\n');
		}

		tbody.appendChild(tr);
	});
}

function updateSummary() {
	// Benzersiz musteri sayisi
	var uniqueCustomers = new Set();
	var newCustomerVkns = new Set();
	var validCount = 0;
	var invalidCount = 0;

	validatedRows.forEach(function(row) {
		if (row.vkn) uniqueCustomers.add(row.vkn);
		if (row.isNewCustomer && row.isValid) newCustomerVkns.add(row.vkn);
		if (row.isValid) {
			validCount++;
		} else {
			invalidCount++;
		}
	});

	document.getElementById('totalQuotes').textContent = uniqueCustomers.size;
	document.getElementById('totalItems').textContent = validatedRows.length;
	document.getElementById('validRows').textContent = validCount;
	document.getElementById('invalidRows').textContent = invalidCount;

	// Yeni musteri sayisini goster (varsa)
	var newCustomerCount = newCustomerVkns.size;
	var existingNewCustomerEl = document.getElementById('newCustomersCount');
	if (newCustomerCount > 0) {
		if (!existingNewCustomerEl) {
			// Yeni eleman ekle
			var summaryContainer = document.querySelector('.bulk-summary');
			var newCustomerHtml = '<div class="summary-item new-customer">' +
				'<span class="summary-value" id="newCustomersCount">' + newCustomerCount + '</span>' +
				'<span class="summary-label">Yeni Musteri</span></div>';
			summaryContainer.insertAdjacentHTML('beforeend', newCustomerHtml);
		} else {
			existingNewCustomerEl.textContent = newCustomerCount;
		}
	} else if (existingNewCustomerEl) {
		existingNewCustomerEl.parentElement.remove();
	}

	// Onayla butonunu aktif/pasif yap
	var confirmBtn = document.getElementById('confirmImportBtn');
	confirmBtn.disabled = validCount === 0;
}

function updateValidationSummary(errors) {
	var summary = document.getElementById('validationSummary');

	if (errors.length === 0) {
		summary.classList.remove('show');
		return;
	}

	var html = '<h4><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg> Hatali Satirlar</h4><ul>';

	// Max 5 hata goster
	var displayErrors = errors.slice(0, 5);
	displayErrors.forEach(function(err) {
		html += '<li><strong>Satir ' + err.row + ':</strong> ' + err.errors.join(', ') + '</li>';
	});

	if (errors.length > 5) {
		html += '<li>... ve ' + (errors.length - 5) + ' hata daha</li>';
	}

	html += '</ul>';
	summary.innerHTML = html;
	summary.classList.add('show');
}

// ================================
// BULK CREATE OFFERS
// ================================

async function confirmBulkImport() {
	var confirmBtn = document.getElementById('confirmImportBtn');
	confirmBtn.disabled = true;
	confirmBtn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;margin-right:8px;"></div> Olusturuluyor...';

	try {
		var dealerId = sessionStorage.getItem('bayi_dealer_id');
		if (!dealerId) {
			throw new Error('Bayi ID bulunamadi');
		}

		// VKN bazinda grupla (sadece gecerli satirlar)
		var groupedByCustomer = {};
		validatedRows.forEach(function(row) {
			if (!row.isValid) return;

			if (!groupedByCustomer[row.vkn]) {
				groupedByCustomer[row.vkn] = {
					customer: row.customer,      // null olabilir (yeni musteri)
					isNewCustomer: row.isNewCustomer,
					items: []
				};
			}
			groupedByCustomer[row.vkn].items.push(row);
		});

		var results = { success: 0, failed: 0, errors: [], newCustomers: 0 };

		// Her musteri icin teklif olustur
		for (var vkn in groupedByCustomer) {
			var group = groupedByCustomer[vkn];
			var customerId;
			var customerName;

			// YENI: Musteri yoksa olustur
			if (group.isNewCustomer) {
				var customerData = {
					vkn: vkn,
					name: 'Musteri ' + vkn,
					company_name: '',
					phone: '',
					registration_status: 'dealer_created',
					is_active: true
				};

				var customerResult = await CustomersService.create(customerData);
				if (customerResult.error) {
					results.failed++;
					results.errors.push({ vkn: vkn, customerName: 'Yeni Musteri', error: 'Musteri olusturulamadi: ' + customerResult.error });
					continue;
				}
				customerId = customerResult.data.id;
				customerName = customerResult.data.name;
				results.newCustomers++;
			} else {
				customerId = group.customer.id;
				customerName = group.customer.name;
			}

			// Teklif olustur
			var offerData = {
				dealer_id: dealerId,
				customer_id: customerId,
				status: 'accepted',
				notes: 'Toplu import ile olusturuldu'
			};

			var offerDetails = group.items.map(function(item) {
				return {
					product_id: item.product.id,
					unit_price: item.unitPrice,
					pricing_type: item.pricingType,
					discount_value: item.discountValue,
					commitment_quantity: item.commitmentQuantity
				};
			});

			var result = await OffersService.create(offerData, offerDetails);

			if (result.error) {
				results.failed++;
				results.errors.push({ vkn: vkn, customerName: customerName, error: result.error });
			} else {
				results.success++;
			}
		}

		// Sonuclari goster
		showImportResults(results);
		goToStep(3);
	} catch (err) {
		console.error('Toplu teklif olusturma hatasi:', err);
		alert('Hata: ' + err.message);
		confirmBtn.disabled = false;
		confirmBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Teklifleri Olustur';
	}
}

function showImportResults(results) {
	var container = document.getElementById('importResults');
	var html = '';

	if (results.success > 0) {
		var newCustomerText = results.newCustomers > 0
			? '<p>' + results.newCustomers + ' yeni musteri olusturuldu.</p>'
			: '';

		html += '<div class="result-success">' +
			'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>' +
			'<h3>' + results.success + ' Teklif Basariyla Olusturuldu</h3>' +
			'<p>Teklifler musteri onayina gonderildi.</p>' +
			newCustomerText +
			'</div>';
	}

	if (results.failed > 0 && results.errors.length > 0) {
		html += '<div class="result-errors">' +
			'<h4>' + results.failed + ' Teklif Olusturulamadi</h4><ul>';

		results.errors.forEach(function(err) {
			html += '<li><strong>' + err.customerName + ' (VKN: ' + err.vkn + '):</strong> ' + err.error + '</li>';
		});

		html += '</ul></div>';
	}

	container.innerHTML = html;
}

// Global reference for loadOffers (will be set inside document.ready)
var loadOffers = null;

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
		var endTime = new Date(sentTimestamp).getTime() + (72 * 60 * 60 * 1000);

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

			// Son 6 saat kontrolu
			if (remaining < 6 * 60 * 60 * 1000) {
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
	loadOffers = async function() {
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
