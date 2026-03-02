/**
 * Bayi Sattigim Urunler
 * Bayinin hangi urunleri satip satmadigini yonetir
 */

(function() {
	var dealerId = null;
	var allProducts = [];
	var inactiveProductIds = [];

	document.addEventListener('DOMContentLoaded', function() {
		dealerId = sessionStorage.getItem('bayi_dealer_id');
		if (!dealerId) {
			console.error('Dealer ID bulunamadi');
		}

		loadProducts();

		document.getElementById('searchInput').addEventListener('input', function() {
			renderProducts(filterProducts(this.value.trim()));
		});
	});

	async function loadProducts() {
		showLoading();

		try {
			// Tum urunleri ve dealer kayitlarini paralel al
			var results = await Promise.all([
				ProductsService.getAll(),
				DealerProductsService.getByDealerId(dealerId)
			]);

			var productsResult = results[0];
			var dealerProductsResult = results[1];

			if (productsResult.error || !productsResult.data) {
				showNoResults('Urunler yuklenirken hata olustu.');
				return;
			}

			allProducts = productsResult.data;

			// Pasif urun ID'lerini topla
			inactiveProductIds = [];
			if (!dealerProductsResult.error && dealerProductsResult.data) {
				dealerProductsResult.data.forEach(function(dp) {
					if (dp.is_active === false) {
						inactiveProductIds.push(dp.product_id);
					}
				});
			}

			renderProducts(allProducts);
			updateSummary();

		} catch (err) {
			console.error('Urunler yuklenirken hata:', err);
			showNoResults('Urunler yuklenirken hata olustu.');
		}
	}

	function filterProducts(searchTerm) {
		if (!searchTerm) return allProducts;
		var term = searchTerm.toLowerCase();
		return allProducts.filter(function(p) {
			return (p.name && p.name.toLowerCase().indexOf(term) !== -1) ||
				   (p.code && p.code.toLowerCase().indexOf(term) !== -1);
		});
	}

	function renderProducts(products) {
		var grid = document.getElementById('productGrid');

		if (products.length === 0) {
			showNoResults('Aramaniza uygun urun bulunamadi.');
			return;
		}

		var html = '';
		products.forEach(function(product) {
			var isActive = inactiveProductIds.indexOf(product.id) === -1;
			var cardClass = isActive ? 'product-card' : 'product-card inactive';

			html += '<div class="' + cardClass + '" data-product-id="' + product.id + '">';

			// Product image
			html += '<div class="product-image">';
			html += '<img src="' + escapeHtml(getProductImageUrl(product)) + '" alt="' + escapeHtml(product.name) + '">';
			html += '</div>';

			// Product info
			html += '<div class="product-info">';
			html += '<div class="product-name" title="' + escapeHtml(product.name) + '">' + escapeHtml(product.name) + '</div>';
			html += '<div class="product-code">' + escapeHtml(product.code || '') + '</div>';
			html += '</div>';

			// Toggle switch
			html += '<div class="toggle-wrapper">';
			html += '<label class="toggle-switch">';
			html += '<input type="checkbox" ' + (isActive ? 'checked' : '') + ' data-product-id="' + product.id + '">';
			html += '<span class="toggle-slider"></span>';
			html += '</label>';
			html += '<div class="status-label ' + (isActive ? 'active' : 'passive') + '">' + (isActive ? 'Aktif' : 'Pasif') + '</div>';
			html += '</div>';

			html += '</div>';
		});

		grid.innerHTML = html;

		// Toggle event listeners
		grid.querySelectorAll('.toggle-switch input').forEach(function(toggle) {
			toggle.addEventListener('change', function() {
				var productId = this.getAttribute('data-product-id');
				var newState = this.checked;
				handleToggle(productId, newState, this);
			});
		});
	}

	async function handleToggle(productId, isActive, toggleEl) {
		// UI aninda guncelle
		var card = toggleEl.closest('.product-card');
		var statusLabel = card.querySelector('.status-label');

		if (isActive) {
			card.classList.remove('inactive');
			statusLabel.textContent = 'Aktif';
			statusLabel.className = 'status-label active';
			// ID'yi listeden cikar
			var idx = inactiveProductIds.indexOf(productId);
			if (idx !== -1) inactiveProductIds.splice(idx, 1);
		} else {
			card.classList.add('inactive');
			statusLabel.textContent = 'Pasif';
			statusLabel.className = 'status-label passive';
			// ID'yi listeye ekle
			if (inactiveProductIds.indexOf(productId) === -1) {
				inactiveProductIds.push(productId);
			}
		}

		updateSummary();

		// DB'ye kaydet
		var result = await DealerProductsService.toggleProduct(dealerId, productId, isActive);
		if (result.error) {
			console.error('Urun durumu kaydedilemedi:', result.error);
			// Geri al
			toggleEl.checked = !isActive;
			if (!isActive) {
				card.classList.remove('inactive');
				statusLabel.textContent = 'Aktif';
				statusLabel.className = 'status-label active';
				var idx2 = inactiveProductIds.indexOf(productId);
				if (idx2 !== -1) inactiveProductIds.splice(idx2, 1);
			} else {
				card.classList.add('inactive');
				statusLabel.textContent = 'Pasif';
				statusLabel.className = 'status-label passive';
				if (inactiveProductIds.indexOf(productId) === -1) {
					inactiveProductIds.push(productId);
				}
			}
			updateSummary();
		}
	}

	function updateSummary() {
		var total = allProducts.length;
		var inactive = inactiveProductIds.length;
		var active = total - inactive;

		document.getElementById('sumTotal').textContent = total;
		document.getElementById('sumActive').textContent = active;
		document.getElementById('sumInactive').textContent = inactive;
	}

	// UI Helpers

	function showLoading() {
		document.getElementById('productGrid').innerHTML =
			'<div class="loading-state"><div class="spinner"></div><p>Urunler yukleniyor...</p></div>';
	}

	function showNoResults(message) {
		document.getElementById('productGrid').innerHTML =
			'<div class="no-results">' + escapeHtml(message) + '</div>';
	}

	function getProductImageUrl(product) {
		if (product.image_url) return product.image_url;
		var code = (product.code || '').toUpperCase();
		if (code.indexOf('12') !== -1 && code.indexOf('UZUN') !== -1) return './İpragaz Bayi_files/IPR-BAYI-12-kg-ipr-uzun.png';
		if (code.indexOf('12') !== -1 && code.indexOf('IZO') !== -1) return './İpragaz Bayi_files/IPR-BAYI-12kg-izo-pro.png';
		if (code.indexOf('24') !== -1 && code.indexOf('SAN') !== -1) return './İpragaz Bayi_files/IPR-BAYI-24kg-sanayi.png';
		if (code.indexOf('45') !== -1 && code.indexOf('SAN') !== -1) return './İpragaz Bayi_files/IPR-BAYI-45kg-sanayi.png';
		return './İpragaz Bayi_files/IPR-BAYI-12-kg-ipr-uzun.png';
	}

	function escapeHtml(str) {
		if (!str) return '';
		return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	}
})();
