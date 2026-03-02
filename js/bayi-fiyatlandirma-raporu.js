/**
 * Bayi Fiyatlandirma Raporu
 * Musterilere verilen fiyatlari il bazli perakende fiyatlarla karsilastirir
 */

(function() {
	var dealerId = null;
	var currentRows = [];
	var sortColumn = null;
	var sortDirection = 'asc';

	// Sayfa yuklendiginde
	document.addEventListener('DOMContentLoaded', function() {
		dealerId = sessionStorage.getItem('dealer_id');
		if (!dealerId) {
			console.error('Dealer ID bulunamadi');
		}

		loadCities();
		loadProducts();
		loadCustomers();
		setupDropdownListeners();
		setupSortListeners();

		document.getElementById('btnGenerateReport').addEventListener('click', generateReport);
	});

	// ==========================================
	// FILTER DROPDOWN'LARI
	// ==========================================

	async function loadCities() {
		var select = document.getElementById('filterCity');
		select.innerHTML = '<option value="">Il Yukleniyor...</option>';

		// Bayinin micropazar ilcelerinden unique city_id'leri cek
		var ddResult = await DealerDistrictsService.getByDealerId(dealerId);
		if (ddResult.error || !ddResult.data || ddResult.data.length === 0) {
			select.innerHTML = '<option value="">Il bulunamadi</option>';
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
			select.innerHTML = '<option value="">Il bulunamadi</option>';
			return;
		}

		// Tum illeri al ve sadece bayinin city_id'leriyle filtrele
		var citiesResult = await LocationsService.getCities();
		if (citiesResult.error) {
			select.innerHTML = '<option value="">Hata olustu</option>';
			return;
		}

		var filteredCities = citiesResult.data.filter(function(city) {
			return cityIds.indexOf(city.id) !== -1;
		});

		select.innerHTML = '<option value="">Tum Iller</option>';
		filteredCities.forEach(function(city) {
			select.innerHTML += '<option value="' + city.id + '" data-name="' + city.name + '">' + city.name + '</option>';
		});
	}

	async function loadProducts() {
		var select = document.getElementById('filterProduct');
		select.innerHTML = '<option value="">Urun Yukleniyor...</option>';

		var result = await ProductsService.getAll();
		if (result.error) {
			select.innerHTML = '<option value="">Hata olustu</option>';
			return;
		}

		select.innerHTML = '<option value="">Tum Urunler</option>';
		result.data.forEach(function(p) {
			select.innerHTML += '<option value="' + p.id + '">' + p.name + '</option>';
		});
	}

	async function loadCustomers() {
		var select = document.getElementById('filterCustomer');
		select.innerHTML = '<option value="">Musteri Yukleniyor...</option>';

		if (!dealerId) {
			select.innerHTML = '<option value="">Tum Musteriler</option>';
			return;
		}

		var offersResult = await OffersService.getCustomersWithAcceptedOffers(dealerId);
		if (offersResult.error || !offersResult.data || offersResult.data.length === 0) {
			select.innerHTML = '<option value="">Tum Musteriler</option>';
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

		select.innerHTML = '<option value="">Tum Musteriler</option>';
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

		neighborhoodSelect.innerHTML = '<option value="">Once ilce seciniz</option>';
		neighborhoodSelect.disabled = true;

		if (!cityId) {
			select.innerHTML = '<option value="">Once il seciniz</option>';
			select.disabled = true;
			return;
		}

		select.innerHTML = '<option value="">Ilce Yukleniyor...</option>';
		select.disabled = true;

		var result = await LocationsService.getDistrictsByCityId(cityId);
		if (result.error) {
			select.innerHTML = '<option value="">Hata olustu</option>';
			return;
		}

		select.innerHTML = '<option value="">Tum Ilceler</option>';
		select.disabled = false;

		result.data.forEach(function(d) {
			select.innerHTML += '<option value="' + d.id + '" data-name="' + d.name + '">' + d.name + '</option>';
		});
	}

	async function loadNeighborhoods(districtId) {
		var select = document.getElementById('filterNeighborhood');

		if (!districtId) {
			select.innerHTML = '<option value="">Once ilce seciniz</option>';
			select.disabled = true;
			return;
		}

		select.innerHTML = '<option value="">Mahalle Yukleniyor...</option>';
		select.disabled = true;

		var result = await LocationsService.getNeighborhoodsByDistrictId(districtId);
		if (result.error || !result.data || result.data.length === 0) {
			select.innerHTML = '<option value="">Mahalle bulunamadi</option>';
			select.disabled = false;
			return;
		}

		select.innerHTML = '<option value="">Tum Mahalleler</option>';
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
			alert('Bayi bilgisi bulunamadi. Lutfen tekrar giris yapin.');
			return;
		}

		var filterCityId = document.getElementById('filterCity').value;
		var filterDistrictId = document.getElementById('filterDistrict').value;
		var filterNeighborhoodId = document.getElementById('filterNeighborhood').value;
		var filterCustomerId = document.getElementById('filterCustomer').value;
		var filterProductId = document.getElementById('filterProduct').value;

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

						var retailPrice = retailPriceMap[branch.city_id + '_' + detail.product.id] || null;
						var offerPrice = detail.unit_price;
						var diff = null;
						var diffPercent = null;

						if (retailPrice && offerPrice) {
							diff = offerPrice - retailPrice;
							diffPercent = ((diff / retailPrice) * 100);
						}

						rows.push({
							customerName: customer.name || '',
							customerCompany: customer.company_name || '',
							branchName: branch.branch_name || '',
							branchCity: branch.city || '',
							branchDistrict: branch.district || '',
							productName: detail.product.name || '',
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
			console.error('Rapor olusturma hatasi:', err);
			showNoData();
		}
	}

	// ==========================================
	// RENDER
	// ==========================================

	function renderTable(rows) {
		var tbody = document.getElementById('reportBody');
		var html = '';

		rows.forEach(function(row) {
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

			html += '<tr>';
			html += '<td><div class="customer-name">' + escapeHtml(row.customerName) + '</div>';
			if (row.customerCompany) {
				html += '<div class="customer-company">' + escapeHtml(row.customerCompany) + '</div>';
			}
			html += '</td>';
			html += '<td><div class="branch-name">' + escapeHtml(row.branchName || '-') + '</div>';
			html += '<div class="branch-address">' + escapeHtml(row.branchDistrict) + ', ' + escapeHtml(row.branchCity) + '</div></td>';
			html += '<td>' + escapeHtml(row.productName) + '</td>';
			html += '<td class="text-center"><span class="usage-badge">' + row.thisMonthQty + ' / ' + row.commitmentQty + '</span></td>';
			html += '<td class="text-right price-cell">' + (row.retailPrice ? formatPrice(row.retailPrice) : '-') + '</td>';
			html += '<td class="text-right price-cell">' + (row.offerPrice ? formatPrice(row.offerPrice) : '-') + '</td>';
			html += '<td class="text-right price-cell ' + diffClass + '">' + diffText + '</td>';
			html += '<td class="text-right price-cell ' + diffClass + '">' + diffPctText + '</td>';
			html += '</tr>';
		});

		tbody.innerHTML = html;
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
})();
