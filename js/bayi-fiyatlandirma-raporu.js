/**
 * Bayi Fiyatlandirma Raporu
 * Musterilere verilen fiyatlari il bazli perakende fiyatlarla karsilastirir
 */

(function() {
	var dealerId = null;
	var dealerName = null;
	var currentRows = [];
	var sortColumn = null;
	var sortDirection = 'asc';
	var selectedRowIndices = new Set();

	// Sayfa yuklendiginde
	document.addEventListener('DOMContentLoaded', function() {
		dealerId = sessionStorage.getItem('bayi_dealer_id');
		dealerName = sessionStorage.getItem('bayi_dealer_name') || '';
		if (!dealerId) {
			console.error('Dealer ID bulunamadı');
		}

		loadCities();
		loadProducts();
		loadCustomers();
		setupDropdownListeners();
		setupSortListeners();
		setupSelectionListeners();
		setupModalListeners();

		document.getElementById('btnGenerateReport').addEventListener('click', generateReport);
	});

	// ==========================================
	// FILTER DROPDOWN'LARI
	// ==========================================

	async function loadCities() {
		var select = document.getElementById('filterCity');
		select.innerHTML = '<option value="">İl Yükleniyor...</option>';

		// Bayinin micropazar ilcelerinden unique city_id'leri cek
		var ddResult = await DealerDistrictsService.getByDealerId(dealerId);
		if (ddResult.error || !ddResult.data || ddResult.data.length === 0) {
			select.innerHTML = '<option value="">İl bulunamadı</option>';
			return;
		}

		var cityIds = [];
		ddResult.data.forEach(function(dd) {
			if (dd.districts && dd.districts.city_id) {
				if (cityIds.indexOf(dd.districts.city_id) === -1) {
					cityIds.push(dd.districts.city_id);
				}
			}
		});

		if (cityIds.length === 0) {
			select.innerHTML = '<option value="">İl bulunamadı</option>';
			return;
		}

		// Tum illeri al ve sadece bayinin city_id'leriyle filtrele
		var citiesResult = await LocationsService.getCities();
		if (citiesResult.error) {
			select.innerHTML = '<option value="">Hata oluştu</option>';
			return;
		}

		var filteredCities = citiesResult.data.filter(function(city) {
			return cityIds.indexOf(city.id) !== -1;
		});

		select.innerHTML = '<option value="">Tüm İller</option>';
		filteredCities.forEach(function(city) {
			select.innerHTML += '<option value="' + city.id + '" data-name="' + city.name + '">' + city.name + '</option>';
		});
	}

	async function loadProducts() {
		var select = document.getElementById('filterProduct');
		select.innerHTML = '<option value="">Ürün Yükleniyor...</option>';

		var result = await ProductsService.getAll();
		if (result.error) {
			select.innerHTML = '<option value="">Hata oluştu</option>';
			return;
		}

		select.innerHTML = '<option value="">Tüm Ürünler</option>';
		result.data.forEach(function(p) {
			select.innerHTML += '<option value="' + p.id + '">' + p.name + '</option>';
		});
	}

	async function loadCustomers() {
		var select = document.getElementById('filterCustomer');
		select.innerHTML = '<option value="">Müşteri Yükleniyor...</option>';

		if (!dealerId) {
			select.innerHTML = '<option value="">Tüm Müşteriler</option>';
			return;
		}

		var offersResult = await OffersService.getCustomersWithAcceptedOffers(dealerId);
		if (offersResult.error || !offersResult.data || offersResult.data.length === 0) {
			select.innerHTML = '<option value="">Tüm Müşteriler</option>';
			return;
		}

		// Unique musterileri topla
		var customers = [];
		var seenIds = [];
		offersResult.data.forEach(function(offer) {
			if (offer.status !== 'accepted') return;
			if (offer.customer && seenIds.indexOf(offer.customer.id) === -1) {
				seenIds.push(offer.customer.id);
				customers.push(offer.customer);
			}
		});

		// Isme gore sirala
		customers.sort(function(a, b) {
			return (a.name || '').localeCompare(b.name || '', 'tr');
		});

		select.innerHTML = '<option value="">Tüm Müşteriler</option>';
		customers.forEach(function(c) {
			var label = c.name || '';
			if (c.company_name) label += ' (' + c.company_name + ')';
			select.innerHTML += '<option value="' + c.id + '">' + escapeHtml(label) + '</option>';
		});
	}

	function setupDropdownListeners() {
		document.getElementById('filterCity').addEventListener('change', function() {
			loadDistricts(this.value);
		});

		document.getElementById('filterDistrict').addEventListener('change', function() {
			loadNeighborhoods(this.value);
		});
	}

	async function loadDistricts(cityId) {
		var select = document.getElementById('filterDistrict');
		var neighborhoodSelect = document.getElementById('filterNeighborhood');

		neighborhoodSelect.innerHTML = '<option value="">Önce ilçe seçiniz</option>';
		neighborhoodSelect.disabled = true;

		if (!cityId) {
			select.innerHTML = '<option value="">Önce il seçiniz</option>';
			select.disabled = true;
			return;
		}

		select.innerHTML = '<option value="">İlçe Yükleniyor...</option>';
		select.disabled = true;

		var result = await LocationsService.getDistrictsByCityId(cityId);
		if (result.error) {
			select.innerHTML = '<option value="">Hata oluştu</option>';
			return;
		}

		select.innerHTML = '<option value="">Tüm İlçeler</option>';
		select.disabled = false;

		result.data.forEach(function(d) {
			select.innerHTML += '<option value="' + d.id + '" data-name="' + d.name + '">' + d.name + '</option>';
		});
	}

	async function loadNeighborhoods(districtId) {
		var select = document.getElementById('filterNeighborhood');

		if (!districtId) {
			select.innerHTML = '<option value="">Önce ilçe seçiniz</option>';
			select.disabled = true;
			return;
		}

		select.innerHTML = '<option value="">Mahalle Yükleniyor...</option>';
		select.disabled = true;

		var result = await LocationsService.getNeighborhoodsByDistrictId(districtId);
		if (result.error || !result.data || result.data.length === 0) {
			select.innerHTML = '<option value="">Mahalle bulunamadı</option>';
			select.disabled = false;
			return;
		}

		select.innerHTML = '<option value="">Tüm Mahalleler</option>';
		select.disabled = false;

		result.data.forEach(function(n) {
			select.innerHTML += '<option value="' + n.id + '" data-name="' + n.name + '">' + n.name + '</option>';
		});
	}

	// ==========================================
	// SIRALAMA
	// ==========================================

	function setupSortListeners() {
		var headers = document.querySelectorAll('#reportTable thead th[data-sort-key]');
		headers.forEach(function(th) {
			th.addEventListener('click', function() {
				var key = this.getAttribute('data-sort-key');
				if (sortColumn === key) {
					sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
				} else {
					sortColumn = key;
					sortDirection = 'asc';
				}
				updateSortIcons();
				if (currentRows.length > 0) {
					var sorted = sortRows(currentRows, sortColumn, sortDirection);
					renderTable(sorted);
				}
			});
		});
	}

	function updateSortIcons() {
		var headers = document.querySelectorAll('#reportTable thead th[data-sort-key]');
		headers.forEach(function(th) {
			var icon = th.querySelector('.sort-icon');
			var key = th.getAttribute('data-sort-key');
			th.classList.remove('sort-active');
			if (key === sortColumn) {
				th.classList.add('sort-active');
				icon.innerHTML = sortDirection === 'asc' ? '&#9650;' : '&#9660;';
			} else {
				icon.innerHTML = '&#9650;';
			}
		});
	}

	function sortRows(rows, key, direction) {
		var sorted = rows.slice();
		sorted.sort(function(a, b) {
			var valA = a[key];
			var valB = b[key];

			// null/undefined en sona
			if (valA == null && valB == null) return 0;
			if (valA == null) return 1;
			if (valB == null) return -1;

			var result;
			if (typeof valA === 'number' && typeof valB === 'number') {
				result = valA - valB;
			} else {
				result = String(valA).localeCompare(String(valB), 'tr');
			}
			return direction === 'desc' ? -result : result;
		});
		return sorted;
	}

	// ==========================================
	// RAPOR OLUSTURMA
	// ==========================================

	async function generateReport() {
		if (!dealerId) {
			alert('Bayi bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
			return;
		}

		var filterCityId = document.getElementById('filterCity').value;
		var filterDistrictId = document.getElementById('filterDistrict').value;
		var filterNeighborhoodId = document.getElementById('filterNeighborhood').value;
		var filterCustomerId = document.getElementById('filterCustomer').value;
		var filterProductId = document.getElementById('filterProduct').value;
		var filterPricingType = document.getElementById('filterPricingType').value;

		// Secimi temizle
		clearSelection();

		// UI state
		showLoading();

		try {
			// 1. Accepted teklifleri al
			var offersResult = await OffersService.getCustomersWithAcceptedOffers(dealerId);
			if (offersResult.error || !offersResult.data || offersResult.data.length === 0) {
				showNoData();
				return;
			}

			var offers = offersResult.data;

			// 2. Her musterinin subelerini al
			var customerIds = [];
			offers.forEach(function(offer) {
				if (offer.customer && customerIds.indexOf(offer.customer.id) === -1) {
					customerIds.push(offer.customer.id);
				}
			});

			var branchesByCustomer = {};
			await Promise.all(customerIds.map(async function(custId) {
				var brResult = await BranchesService.getByCustomerId(custId);
				if (!brResult.error && brResult.data) {
					branchesByCustomer[custId] = brResult.data;
				}
			}));

			// 3. Il fiyatlarini al
			var retailPriceMap = {}; // { cityId_productId: retail_price }
			var cityIdsToFetch = new Set();

			if (filterCityId) {
				cityIdsToFetch.add(filterCityId);
			} else {
				// Tum musteri subelerinin il'lerini topla
				Object.values(branchesByCustomer).forEach(function(branches) {
					branches.forEach(function(br) {
						if (br.city_id) cityIdsToFetch.add(br.city_id);
					});
				});
			}

			await Promise.all(Array.from(cityIdsToFetch).map(async function(cId) {
				var prResult = await RetailPricesByCityService.getByCityId(cId);
				if (!prResult.error && prResult.data) {
					prResult.data.forEach(function(rp) {
						retailPriceMap[cId + '_' + rp.product_id] = rp.retail_price;
					});
				}
			}));

			// 4. Rapor satirlarini olustur
			var rows = [];

			offers.forEach(function(offer) {
				if (!offer.customer || !offer.offer_details) return;
				if (offer.status !== 'accepted') return;
				var customer = offer.customer;

				// Filtrele: musteri
				if (filterCustomerId && customer.id !== filterCustomerId) return;

				var branches = branchesByCustomer[customer.id] || [];

				// Eger sube yoksa en az bir satir goster
				if (branches.length === 0) {
					branches = [{ id: null, branch_name: '-', city: '-', city_id: null, district: '-', district_id: null, neighborhood: '-', neighborhood_id: null }];
				}

				branches.forEach(function(branch) {
					// Filtrele: il
					if (filterCityId && branch.city_id !== filterCityId) return;
					// Filtrele: ilce
					if (filterDistrictId && branch.district_id !== filterDistrictId) return;
					// Filtrele: mahalle
					if (filterNeighborhoodId && branch.neighborhood_id !== filterNeighborhoodId) return;

					offer.offer_details.forEach(function(detail) {
						if (!detail.product) return;
						// Filtrele: urun
						if (filterProductId && detail.product.id !== filterProductId) return;
						// Filtrele: indirim yontemi
						var pType = detail.pricing_type || 'retail_price';
						if (filterPricingType && pType !== filterPricingType) return;

						var retailPrice = retailPriceMap[branch.city_id + '_' + detail.product.id] || null;
						var offerPrice = detail.unit_price;
						var diff = null;
						var diffPercent = null;

						if (retailPrice && offerPrice) {
							diff = offerPrice - retailPrice;
							diffPercent = ((diff / retailPrice) * 100);
						}

						rows.push({
							offerDetailId: detail.id,
							offerId: offer.id,
							productId: detail.product.id,
							customerId: customer.id,
							customerName: customer.name || '',
							customerCompany: customer.company_name || '',
							branchName: branch.branch_name || '',
							branchCity: branch.city || '',
							branchDistrict: branch.district || '',
							productName: detail.product.name || '',
							pricingType: detail.pricing_type || 'retail_price',
							pricingTypeLabel: getPricingTypeLabel(detail.pricing_type || 'retail_price'),
							discountValue: detail.discount_value || 0,
							thisMonthQty: detail.this_month_quantity || 0,
							commitmentQty: detail.commitment_quantity || 0,
							retailPrice: retailPrice,
							offerPrice: offerPrice,
							diff: diff,
							diffPercent: diffPercent
						});
					});
				});
			});

			// 5. Render
			if (rows.length === 0) {
				showNoData();
				return;
			}

			currentRows = rows;

			// Eger aktif siralama varsa uygula
			if (sortColumn) {
				rows = sortRows(rows, sortColumn, sortDirection);
				updateSortIcons();
			}

			renderTable(rows);
			renderSummary(currentRows);

		} catch (err) {
			console.error('Rapor oluşturma hatası:', err);
			showNoData();
		}
	}

	// ==========================================
	// RENDER
	// ==========================================

	function renderTable(rows) {
		var tbody = document.getElementById('reportBody');
		var html = '';

		rows.forEach(function(row, index) {
			var diffClass = 'price-diff-zero';
			var diffText = '-';
			var diffPctText = '-';

			if (row.diff !== null) {
				if (row.diff < 0) {
					diffClass = 'price-diff-negative';
					diffText = '-' + formatPrice(Math.abs(row.diff));
					diffPctText = row.diffPercent.toFixed(1) + '%';
				} else if (row.diff > 0) {
					diffClass = 'price-diff-positive';
					diffText = '+' + formatPrice(row.diff);
					diffPctText = '+' + row.diffPercent.toFixed(1) + '%';
				} else {
					diffText = formatPrice(0);
					diffPctText = '0%';
				}
			}

			var isSelected = selectedRowIndices.has(index);
			html += '<tr data-row-index="' + index + '"' + (isSelected ? ' class="row-selected"' : '') + '>';
			html += '<td class="checkbox-col"><label class="row-checkbox-label"><input type="checkbox" data-row-index="' + index + '"' + (isSelected ? ' checked' : '') + '><span class="row-checkbox"></span></label></td>';
			html += '<td><div class="customer-name">' + escapeHtml(row.customerName) + '</div>';
			if (row.customerCompany) {
				html += '<div class="customer-company">' + escapeHtml(row.customerCompany) + '</div>';
			}
			html += '</td>';
			html += '<td><div class="branch-name">' + escapeHtml(row.branchName || '-') + '</div>';
			html += '<div class="branch-address">' + escapeHtml(row.branchDistrict) + ', ' + escapeHtml(row.branchCity) + '</div></td>';
			html += '<td>' + escapeHtml(row.productName) + '</td>';
			html += '<td><span class="pricing-badge ' + getPricingTypeBadgeClass(row.pricingType) + '">' + escapeHtml(row.pricingTypeLabel) + '</span></td>';
			html += '<td class="text-center"><span class="usage-badge">' + row.thisMonthQty + ' / ' + row.commitmentQty + '</span></td>';
			html += '<td class="text-right price-cell">' + (row.retailPrice ? formatPrice(row.retailPrice) : '-') + '</td>';
			html += '<td class="text-right price-cell">' + (row.offerPrice ? formatPrice(row.offerPrice) : '-') + '</td>';
			html += '<td class="text-right price-cell ' + diffClass + '">' + diffText + '</td>';
			html += '<td class="text-right price-cell ' + diffClass + '">' + diffPctText + '</td>';
			html += '</tr>';
		});

		tbody.innerHTML = html;
		bindRowCheckboxes();
		showTable();
	}

	function renderSummary(rows) {
		var uniqueCustomers = new Set();
		var totalDiscount = 0;
		var countWithDiscount = 0;

		rows.forEach(function(row) {
			uniqueCustomers.add(row.customerName);
			if (row.diffPercent !== null) {
				totalDiscount += row.diffPercent;
				countWithDiscount++;
			}
		});

		var avgDiscount = countWithDiscount > 0 ? (totalDiscount / countWithDiscount) : 0;

		document.getElementById('sumCustomers').textContent = uniqueCustomers.size;
		document.getElementById('sumRows').textContent = rows.length;
		document.getElementById('sumAvgDiscount').textContent = '%' + avgDiscount.toFixed(1);
		document.getElementById('summaryCards').style.display = 'flex';
	}

	// ==========================================
	// UI HELPERS
	// ==========================================

	function showLoading() {
		document.getElementById('reportEmpty').style.display = 'none';
		document.getElementById('reportNoData').style.display = 'none';
		document.getElementById('reportTableWrapper').style.display = 'none';
		document.getElementById('summaryCards').style.display = 'none';
		document.getElementById('reportLoading').style.display = 'flex';
	}

	function showTable() {
		document.getElementById('reportEmpty').style.display = 'none';
		document.getElementById('reportNoData').style.display = 'none';
		document.getElementById('reportLoading').style.display = 'none';
		document.getElementById('reportTableWrapper').style.display = 'block';
	}

	function showNoData() {
		document.getElementById('reportEmpty').style.display = 'none';
		document.getElementById('reportLoading').style.display = 'none';
		document.getElementById('reportTableWrapper').style.display = 'none';
		document.getElementById('summaryCards').style.display = 'none';
		document.getElementById('reportNoData').style.display = 'flex';
	}

	function formatPrice(price) {
		return parseFloat(price || 0).toLocaleString('tr-TR', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}) + ' TL';
	}

	function escapeHtml(str) {
		if (!str) return '';
		return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	}

	function getPricingTypeLabel(type) {
		switch (type) {
			case 'fixed_price': return 'Sabit Fiyat';
			case 'fixed_discount': return 'Sabit Fiyat İndirimi';
			case 'percentage_discount': return 'Yüzdesel İndirim';
			case 'retail_price': return 'Perakende';
			default: return '-';
		}
	}

	function getPricingTypeBadgeClass(type) {
		switch (type) {
			case 'fixed_price': return 'pricing-badge-blue';
			case 'fixed_discount': return 'pricing-badge-teal';
			case 'percentage_discount': return 'pricing-badge-purple';
			case 'retail_price': return 'pricing-badge-gray';
			default: return 'pricing-badge-gray';
		}
	}

	// ==========================================
	// SATIR SECIMI
	// ==========================================

	function setupSelectionListeners() {
		var selectAll = document.getElementById('selectAllCheckbox');
		if (selectAll) {
			selectAll.addEventListener('change', function() {
				if (this.checked) {
					for (var i = 0; i < currentRows.length; i++) {
						selectedRowIndices.add(i);
					}
				} else {
					selectedRowIndices.clear();
				}
				syncRowCheckboxes();
				updateBulkActionBar();
			});
		}
	}

	function bindRowCheckboxes() {
		var checkboxes = document.querySelectorAll('#reportBody input[type="checkbox"]');
		checkboxes.forEach(function(cb) {
			cb.addEventListener('change', function() {
				var idx = parseInt(this.getAttribute('data-row-index'));
				var tr = this.closest('tr');
				if (this.checked) {
					selectedRowIndices.add(idx);
					if (tr) tr.classList.add('row-selected');
				} else {
					selectedRowIndices.delete(idx);
					if (tr) tr.classList.remove('row-selected');
				}
				updateSelectAllCheckbox();
				updateBulkActionBar();
			});
		});
	}

	function syncRowCheckboxes() {
		var checkboxes = document.querySelectorAll('#reportBody input[type="checkbox"]');
		checkboxes.forEach(function(cb) {
			var idx = parseInt(cb.getAttribute('data-row-index'));
			var tr = cb.closest('tr');
			cb.checked = selectedRowIndices.has(idx);
			if (cb.checked) {
				if (tr) tr.classList.add('row-selected');
			} else {
				if (tr) tr.classList.remove('row-selected');
			}
		});
	}

	function updateSelectAllCheckbox() {
		var selectAll = document.getElementById('selectAllCheckbox');
		if (!selectAll) return;
		var total = currentRows.length;
		var selected = selectedRowIndices.size;
		if (selected === 0) {
			selectAll.checked = false;
			selectAll.indeterminate = false;
		} else if (selected === total) {
			selectAll.checked = true;
			selectAll.indeterminate = false;
		} else {
			selectAll.checked = false;
			selectAll.indeterminate = true;
		}
	}

	function updateBulkActionBar() {
		var bar = document.getElementById('bulkActionBar');
		var countEl = document.getElementById('selectedCount');
		countEl.textContent = selectedRowIndices.size;
		if (selectedRowIndices.size > 0) {
			bar.classList.add('visible');
		} else {
			bar.classList.remove('visible');
		}
	}

	function clearSelection() {
		selectedRowIndices.clear();
		var selectAll = document.getElementById('selectAllCheckbox');
		if (selectAll) {
			selectAll.checked = false;
			selectAll.indeterminate = false;
		}
		syncRowCheckboxes();
		updateBulkActionBar();
	}

	// ==========================================
	// FIYAT GUNCELLEME MODALI
	// ==========================================

	function setupModalListeners() {
		var btnUpdate = document.getElementById('btnBulkPriceUpdate');
		var btnClose = document.getElementById('priceModalClose');
		var btnCancel = document.getElementById('priceModalCancel');
		var btnConfirm = document.getElementById('priceModalConfirm');
		var overlay = document.getElementById('priceUpdateModal');

		if (btnUpdate) btnUpdate.addEventListener('click', openPriceUpdateModal);
		if (btnClose) btnClose.addEventListener('click', closePriceUpdateModal);
		if (btnCancel) btnCancel.addEventListener('click', closePriceUpdateModal);
		if (btnConfirm) btnConfirm.addEventListener('click', confirmPriceUpdate);

		var btnBulkApply = document.getElementById('bulkApplyBtn');
		var bulkApplyInput = document.getElementById('bulkApplyInput');
		if (btnBulkApply) btnBulkApply.addEventListener('click', applyBulkPrice);
		if (bulkApplyInput) {
			bulkApplyInput.addEventListener('keydown', function(e) {
				if (e.key === 'Enter') {
					e.preventDefault();
					applyBulkPrice();
				}
			});
		}

		if (overlay) {
			overlay.addEventListener('click', function(e) {
				if (e.target === overlay) closePriceUpdateModal();
			});
		}

		document.addEventListener('keydown', function(e) {
			if (e.key === 'Escape') {
				var modal = document.getElementById('priceUpdateModal');
				if (modal && modal.classList.contains('active')) {
					closePriceUpdateModal();
				}
			}
		});
	}

	function openPriceUpdateModal() {
		if (selectedRowIndices.size === 0) return;

		// Secili satirlari topla
		var selectedRows = [];
		selectedRowIndices.forEach(function(idx) {
			if (currentRows[idx]) selectedRows.push(currentRows[idx]);
		});

		// offerDetailId'ye gore deduplicate et
		var uniqueMap = {};
		selectedRows.forEach(function(row) {
			if (uniqueMap[row.offerDetailId]) {
				uniqueMap[row.offerDetailId].branches.push(row.branchName);
			} else {
				uniqueMap[row.offerDetailId] = {
					offerDetailId: row.offerDetailId,
					offerId: row.offerId,
					customerName: row.customerName,
					customerCompany: row.customerCompany,
					productName: row.productName,
					offerPrice: row.offerPrice,
					branches: [row.branchName]
				};
			}
		});

		var uniqueDetails = Object.values(uniqueMap);

		// Modal tablosunu doldur
		var tbody = document.getElementById('priceUpdateBody');
		var html = '';

		uniqueDetails.forEach(function(detail, i) {
			var branchNote = '';
			if (detail.branches.length > 1) {
				branchNote = '<div class="modal-branch-note">' + detail.branches.length + ' şubede geçerli</div>';
			}

			html += '<tr data-detail-id="' + detail.offerDetailId + '" data-offer-id="' + detail.offerId + '" data-old-price="' + (detail.offerPrice || 0) + '">';
			html += '<td><div class="modal-customer-name">' + escapeHtml(detail.customerName) + '</div>' + branchNote + '</td>';
			html += '<td>' + escapeHtml(detail.productName) + '</td>';
			html += '<td class="text-right price-cell">' + (detail.offerPrice ? formatPrice(detail.offerPrice) : '-') + '</td>';
			html += '<td class="text-right"><div class="price-input-wrapper"><input type="number" class="price-input" data-index="' + i + '" value="' + (detail.offerPrice || '') + '" step="0.01" min="0.01"><span class="price-input-suffix">TL</span></div></td>';
			html += '<td class="text-right"><span class="modal-diff diff-same" data-index="' + i + '">-</span></td>';
			html += '</tr>';
		});

		tbody.innerHTML = html;

		// Input event'lerini bagla
		var inputs = tbody.querySelectorAll('.price-input');
		inputs.forEach(function(input) {
			input.addEventListener('input', function() {
				updateModalDiff(this);
				updateModalSummary();
			});
		});

		updateModalSummary();

		// Toplu uygula input'unu sifirla
		var bulkInput = document.getElementById('bulkApplyInput');
		if (bulkInput) bulkInput.value = '';

		// Modali goster
		document.getElementById('priceUpdateModal').classList.add('active');
		document.body.style.overflow = 'hidden';
	}

	function applyBulkPrice() {
		var bulkInput = document.getElementById('bulkApplyInput');
		if (!bulkInput) return;

		var value = parseFloat(bulkInput.value);
		if (isNaN(value) || value <= 0) {
			bulkInput.classList.add('input-error');
			showToast('Geçerli bir fiyat girin.', true);
			return;
		}

		bulkInput.classList.remove('input-error');

		// Tum satirlardaki input'lara uygula
		var inputs = document.querySelectorAll('#priceUpdateBody .price-input');
		inputs.forEach(function(input) {
			input.value = value;
			updateModalDiff(input);
		});

		updateModalSummary();
		showToast(inputs.length + ' satıra ' + formatPrice(value) + ' uygulandı.', false);
	}

	function closePriceUpdateModal() {
		document.getElementById('priceUpdateModal').classList.remove('active');
		document.body.style.overflow = '';
	}

	function updateModalDiff(input) {
		var tr = input.closest('tr');
		var oldPrice = parseFloat(tr.getAttribute('data-old-price')) || 0;
		var newPrice = parseFloat(input.value) || 0;
		var diffEl = tr.querySelector('.modal-diff');

		if (!input.value || newPrice === oldPrice) {
			diffEl.textContent = '-';
			diffEl.className = 'modal-diff diff-same';
			input.classList.remove('input-error');
		} else if (newPrice <= 0) {
			diffEl.textContent = 'Geçersiz';
			diffEl.className = 'modal-diff diff-up';
			input.classList.add('input-error');
		} else {
			var diff = newPrice - oldPrice;
			input.classList.remove('input-error');
			if (diff > 0) {
				diffEl.textContent = '+' + formatPrice(diff);
				diffEl.className = 'modal-diff diff-up';
			} else {
				diffEl.textContent = '-' + formatPrice(Math.abs(diff));
				diffEl.className = 'modal-diff diff-down';
			}
		}
	}

	function updateModalSummary() {
		var rows = document.querySelectorAll('#priceUpdateBody tr');
		var total = rows.length;
		var up = 0;
		var down = 0;
		var same = 0;

		rows.forEach(function(tr) {
			var oldPrice = parseFloat(tr.getAttribute('data-old-price')) || 0;
			var input = tr.querySelector('.price-input');
			var newPrice = parseFloat(input.value) || 0;

			if (!input.value || newPrice === oldPrice) {
				same++;
			} else if (newPrice > oldPrice) {
				up++;
			} else if (newPrice < oldPrice) {
				down++;
			}
		});

		var summaryEl = document.getElementById('priceUpdateSummary');
		summaryEl.innerHTML =
			'<span class="summary-pill pill-total">' + total + ' ürün</span>' +
			(up > 0 ? '<span class="summary-pill pill-up">&#9650; ' + up + ' artış</span>' : '') +
			(down > 0 ? '<span class="summary-pill pill-down">&#9660; ' + down + ' azalış</span>' : '') +
			(same > 0 ? '<span class="summary-pill pill-same">' + same + ' değişmeyecek</span>' : '');
	}

	async function confirmPriceUpdate() {
		var btnConfirm = document.getElementById('priceModalConfirm');
		var btnText = btnConfirm.querySelector('.btn-text');
		var btnSpinner = btnConfirm.querySelector('.btn-spinner');

		// Guncelleme listesi olustur
		var rows = document.querySelectorAll('#priceUpdateBody tr');
		var updates = [];
		var hasError = false;

		rows.forEach(function(tr) {
			var detailId = tr.getAttribute('data-detail-id');
			var offerId = tr.getAttribute('data-offer-id');
			var oldPrice = parseFloat(tr.getAttribute('data-old-price')) || 0;
			var input = tr.querySelector('.price-input');
			var newPrice = parseFloat(input.value);

			if (isNaN(newPrice) || newPrice <= 0) {
				if (input.value !== '' && input.value !== String(oldPrice)) {
					input.classList.add('input-error');
					hasError = true;
				}
				return;
			}

			// Degismeyen fiyatlari atla
			if (newPrice === oldPrice) return;

			updates.push({
				detailId: detailId,
				offerId: offerId,
				newUnitPrice: newPrice,
				oldUnitPrice: oldPrice
			});
		});

		if (hasError) {
			showToast('Lütfen geçersiz fiyatları düzeltin.', true);
			return;
		}

		if (updates.length === 0) {
			showToast('Değişiklik yapılmadı.', false);
			closePriceUpdateModal();
			return;
		}

		// Loading state
		btnConfirm.disabled = true;
		btnText.textContent = 'Güncelleniyor...';
		btnSpinner.style.display = 'inline-block';

		try {
			var result = await OffersService.bulkUpdateOfferDetailPrices(updates);

			var successCount = result.data.success.length;
			var failCount = result.data.failed.length;

			if (failCount > 0 && successCount > 0) {
				showToast(successCount + ' fiyat güncellendi, ' + failCount + ' hata oluştu.', true);
			} else if (failCount > 0) {
				showToast('Güncelleme sırasında hata oluştu.', true);
			} else {
				showToast(successCount + ' fiyat başarıyla güncellendi.', false);
			}

			closePriceUpdateModal();
			clearSelection();

			// Raporu yenile
			await generateReport();

		} catch (err) {
			console.error('Fiyat güncelleme hatası:', err);
			showToast('Güncelleme sırasında bir hata oluştu.', true);
		} finally {
			btnConfirm.disabled = false;
			btnText.textContent = 'Güncelle';
			btnSpinner.style.display = 'none';
		}
	}

	// ==========================================
	// TOAST
	// ==========================================

	function showToast(message, isError) {
		var toast = document.getElementById('priceUpdateToast');
		toast.textContent = message;
		toast.className = 'toast-notification show' + (isError ? ' toast-error' : ' toast-success');
		clearTimeout(toast._timer);
		toast._timer = setTimeout(function() {
			toast.classList.remove('show');
		}, 3500);
	}
})();
