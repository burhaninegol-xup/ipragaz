/**
 * Address Completion Overlay Component
 * Eksik adres bilgilerini tamamlamak icin overlay
 */

var AddressCompletionOverlay = (function() {
	// Private degiskenler
	var branchData = null;
	var successCallback = null;
	var isInitialized = false;
	var missingFields = [];

	/**
	 * Component'i baslat - event listener'lari bagla
	 */
	function init() {
		if (isInitialized) return;

		// Submit butonu
		var submitBtn = document.getElementById('addressCompletionSubmitBtn');
		if (submitBtn) {
			submitBtn.addEventListener('click', submit);
		}

		// Overlay'e tiklaninca kapat
		var overlay = document.getElementById('addressCompletionOverlay');
		if (overlay) {
			overlay.addEventListener('click', function(e) {
				if (e.target === this) {
					close();
				}
			});
		}

		// Sokak "Diger" secenegi: dropdown -> manual input gecisi
		var streetSelect = document.getElementById('acStreetSelect');
		if (streetSelect) {
			streetSelect.addEventListener('change', function() {
				if (this.value === '__other__') {
					this.style.display = 'none';
					var manualInput = document.getElementById('acStreetManualInput');
					var backLink = document.getElementById('acStreetBackToList');
					if (manualInput) { manualInput.style.display = ''; manualInput.focus(); }
					if (backLink) backLink.style.display = '';
				}
			});
		}

		// "Listeden sec" geri baglantisi
		var backToList = document.getElementById('acStreetBackToList');
		if (backToList) {
			backToList.addEventListener('click', function() {
				var sel = document.getElementById('acStreetSelect');
				var manualInput = document.getElementById('acStreetManualInput');
				if (sel) { sel.style.display = ''; sel.value = ''; }
				if (manualInput) { manualInput.style.display = 'none'; manualInput.value = ''; }
				this.style.display = 'none';
			});
		}

		isInitialized = true;
	}

	/**
	 * Overlay'i goster
	 */
	function show() {
		var overlay = document.getElementById('addressCompletionOverlay');
		if (overlay) {
			overlay.classList.add('active');
			document.body.style.overflow = 'hidden';
		}
	}

	/**
	 * Overlay'i kapat
	 */
	function close() {
		var overlay = document.getElementById('addressCompletionOverlay');
		if (overlay) {
			overlay.classList.remove('active');
			document.body.style.overflow = '';
		}
	}

	/**
	 * Eksik alanlari kontrol et ve gerekirse overlay ac
	 * @param {string} branchId - Sube ID
	 * @param {function} callback - Basarili olunca cagirilacak fonksiyon
	 */
	async function checkAndProceed(branchId, callback) {
		if (!branchId) {
			if (typeof callback === 'function') callback();
			return;
		}

		successCallback = callback;

		// BranchesService yuklu mu kontrol et
		if (typeof BranchesService === 'undefined') {
			console.error('BranchesService not loaded');
			if (typeof callback === 'function') callback();
			return;
		}

		// Sube bilgisini al
		var result = await BranchesService.getById(branchId);
		if (result.error || !result.data) {
			console.error('Branch bilgisi alinamadi');
			if (typeof callback === 'function') callback();
			return;
		}

		var branch = result.data;

		// Eksik alanlari kontrol et
		missingFields = [];
		if (!branch.city || !branch.city_id) missingFields.push('city');
		if (!branch.district || !branch.district_id) missingFields.push('district');
		if (!branch.neighborhood) missingFields.push('neighborhood');
		if (!branch.street) missingFields.push('street');
		if (!branch.building_no) missingFields.push('building_no');
		if (!branch.apartment) missingFields.push('apartment');

		if (missingFields.length === 0) {
			// Tam adres, devam et
			if (typeof callback === 'function') callback();
			return;
		}

		branchData = branch;
		renderForm(branch, missingFields);
		show();
	}

	/**
	 * Formu render et - dolu alanlar disabled, bos alanlar aktif dropdown
	 */
	function renderForm(branch, missing) {
		// Her alan icin kontrol
		setupField('City', 'city', branch, missing);
		setupField('District', 'district', branch, missing);
		setupField('Neighborhood', 'neighborhood', branch, missing);
		setupField('Street', 'street', branch, missing);

		// Mahalle manual input resetle
		var nhManualReset = document.getElementById('acNeighborhoodManualInput');
		var nhBackReset = document.getElementById('acNeighborhoodBackToList');
		var nhSelectReset = document.getElementById('acNeighborhoodSelect');
		if (nhManualReset) { nhManualReset.style.display = 'none'; nhManualReset.value = ''; }
		if (nhBackReset) nhBackReset.style.display = 'none';
		if (nhSelectReset) nhSelectReset.style.display = '';

		// Sokak manual input resetle
		var manualInput = document.getElementById('acStreetManualInput');
		var backLink = document.getElementById('acStreetBackToList');
		var streetSelect = document.getElementById('acStreetSelect');
		if (manualInput) { manualInput.style.display = 'none'; manualInput.value = ''; }
		if (backLink) backLink.style.display = 'none';
		if (streetSelect) streetSelect.style.display = '';

		// Bina No alani
		setupTextInputField('BuildingNo', 'building_no', branch, missing);
		// Daire No alani
		setupTextInputField('Apartment', 'apartment', branch, missing);

		// Cascading dropdown listener'larini kur
		setupDropdownListeners(branch, missing);

		// Ilk eksik alani yukle
		loadInitialData(branch, missing);
	}

	/**
	 * Tek bir alani kur - dolu ise disabled, bos ise aktif
	 */
	function setupField(fieldName, fieldKey, branch, missing) {
		var container = document.getElementById('addressField' + fieldName);
		var select = document.getElementById('ac' + fieldName + 'Select');
		if (!container || !select) return;

		if (missing.indexOf(fieldKey) === -1) {
			// Alan dolu - disabled goster
			container.classList.add('disabled');
			select.innerHTML = '<option value="' + (branch[fieldKey + '_id'] || '') + '">' + (branch[fieldKey] || '') + '</option>';
			select.disabled = true;
		} else {
			// Alan bos - aktif dropdown
			container.classList.remove('disabled');
			select.disabled = true; // Veri yuklenene kadar disabled
			var placeholders = {
				city: 'Il Seciniz',
				district: 'Ilce Seciniz',
				neighborhood: 'Mahalle Seciniz',
				street: 'Cadde/Sokak Seciniz'
			};
			select.innerHTML = '<option value="">' + placeholders[fieldKey] + '</option>';
		}
	}

	/**
	 * Text input alani kur - dolu ise disabled, bos ise aktif
	 */
	function setupTextInputField(fieldName, fieldKey, branch, missing) {
		var container = document.getElementById('addressField' + fieldName);
		var input = document.getElementById('ac' + fieldName + 'Input');
		if (!container || !input) return;

		if (missing.indexOf(fieldKey) === -1) {
			// Alan dolu - disabled goster
			container.classList.add('disabled');
			input.value = branch[fieldKey] || '';
			input.disabled = true;
		} else {
			// Alan bos - aktif input
			container.classList.remove('disabled');
			input.value = '';
			input.disabled = false;
		}
	}

	/**
	 * Cascading dropdown listener'larini kur
	 */
	function setupDropdownListeners(branch, missing) {
		var citySelect = document.getElementById('acCitySelect');
		var districtSelect = document.getElementById('acDistrictSelect');
		var neighborhoodSelect = document.getElementById('acNeighborhoodSelect');
		var streetSelect = document.getElementById('acStreetSelect');

		// Onceki listener'lari temizle (clone trick)
		if (citySelect && missing.indexOf('city') !== -1) {
			var newCity = citySelect.cloneNode(true);
			citySelect.parentNode.replaceChild(newCity, citySelect);
			newCity.addEventListener('change', function() {
				loadDistricts(this.value);
			});
		}

		if (districtSelect && missing.indexOf('district') !== -1) {
			var newDistrict = districtSelect.cloneNode(true);
			districtSelect.parentNode.replaceChild(newDistrict, districtSelect);
			newDistrict.addEventListener('change', function() {
				loadNeighborhoods(this.value);
			});
		}

		if (neighborhoodSelect && missing.indexOf('neighborhood') !== -1) {
			var nhContainer = document.getElementById('addressFieldNeighborhood');
			var newNeighborhood = neighborhoodSelect.cloneNode(true);
			neighborhoodSelect.parentNode.replaceChild(newNeighborhood, neighborhoodSelect);
			newNeighborhood.addEventListener('change', function() {
				if (this.value === '__other__') {
					this.style.display = 'none';
					var nhManual = nhContainer.querySelector('#acNeighborhoodManualInput');
					var nhBack = nhContainer.querySelector('#acNeighborhoodBackToList');
					if (nhManual) { nhManual.style.display = 'block'; nhManual.focus(); }
					if (nhBack) { nhBack.style.display = 'block'; }
					// Sokak da otomatik free-text'e geç
					var streetField = document.getElementById('addressFieldStreet');
					if (streetField) {
						var stSelect = streetField.querySelector('select');
						var stManual = streetField.querySelector('#acStreetManualInput');
						var stBack = streetField.querySelector('#acStreetBackToList');
						if (stSelect) stSelect.style.display = 'none';
						if (stManual) { stManual.style.display = 'block'; stManual.value = ''; }
						if (stBack) { stBack.style.display = 'block'; }
					}
				} else {
					loadStreets(this.value);
				}
			});

			// Mahalle geri dön handler
			var nhBackBtn = nhContainer.querySelector('#acNeighborhoodBackToList');
			if (nhBackBtn) {
				nhBackBtn.addEventListener('click', function() {
					var nhSelect = nhContainer.querySelector('select');
					var nhManual = nhContainer.querySelector('#acNeighborhoodManualInput');
					if (nhSelect) { nhSelect.style.display = ''; nhSelect.value = ''; }
					if (nhManual) { nhManual.style.display = 'none'; nhManual.value = ''; }
					this.style.display = 'none';
				});
			}
		}
	}

	/**
	 * Ilk veriyi yukle - zincir mantigi
	 */
	async function loadInitialData(branch, missing) {
		if (missing.indexOf('city') !== -1) {
			// Il eksik - illeri yukle
			await loadCities();
		} else if (missing.indexOf('district') !== -1) {
			// Ilce eksik - ilceleri yukle
			await loadDistricts(branch.city_id);
		} else if (missing.indexOf('neighborhood') !== -1) {
			// Mahalle eksik - mahalleleri yukle
			await loadNeighborhoods(branch.district_id);
		} else if (missing.indexOf('street') !== -1) {
			// Sokak eksik - sokaklari yukle
			await loadStreets(branch.neighborhood_id);
		}
	}

	/**
	 * Illeri yukle
	 */
	async function loadCities() {
		var select = document.getElementById('acCitySelect');
		if (!select) return;

		select.innerHTML = '<option value="">Il Yukleniyor...</option>';
		select.disabled = true;

		var result = await LocationsService.getCities();
		if (result.error) {
			select.innerHTML = '<option value="">Hata olustu</option>';
			return;
		}

		select.innerHTML = '<option value="">Il Seciniz</option>';
		select.disabled = false;

		result.data.forEach(function(city) {
			select.innerHTML += '<option value="' + city.id + '" data-name="' + city.name + '">' + city.name + '</option>';
		});
	}

	/**
	 * Ilceleri yukle
	 */
	async function loadDistricts(cityId) {
		var select = document.getElementById('acDistrictSelect');
		if (!select) return;

		// Eksik olmayan alt alanlari resetle
		resetChildDropdowns('district');

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

		select.innerHTML = '<option value="">Ilce Seciniz</option>';
		select.disabled = false;

		result.data.forEach(function(d) {
			select.innerHTML += '<option value="' + d.id + '" data-name="' + d.name + '">' + d.name + '</option>';
		});
	}

	/**
	 * Mahalleleri yukle
	 */
	async function loadNeighborhoods(districtId) {
		var select = document.getElementById('acNeighborhoodSelect');
		if (!select) return;

		// Sokak resetle
		resetChildDropdowns('neighborhood');

		// Manuel mahalle giriş alanlarını sıfırla
		select.style.display = '';
		var nhManual = document.getElementById('acNeighborhoodManualInput');
		var nhBack = document.getElementById('acNeighborhoodBackToList');
		if (nhManual) { nhManual.style.display = 'none'; nhManual.value = ''; }
		if (nhBack) { nhBack.style.display = 'none'; }

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
			select.innerHTML += '<option value="__other__">\u2014 Diğer (Elle yazınız) \u2014</option>';
			select.disabled = false;
			return;
		}

		select.innerHTML = '<option value="">Mahalle Seçiniz</option>';
		select.disabled = false;

		result.data.forEach(function(n) {
			select.innerHTML += '<option value="' + n.id + '" data-name="' + n.name + '">' + n.name + '</option>';
		});
		select.innerHTML += '<option value="__other__">\u2014 Diğer (Elle yazınız) \u2014</option>';
	}

	/**
	 * Sokaklari yukle
	 */
	async function loadStreets(neighborhoodId) {
		var select = document.getElementById('acStreetSelect');
		if (!select) return;

		if (!neighborhoodId) {
			select.innerHTML = '<option value="">Once mahalle seciniz</option>';
			select.disabled = true;
			return;
		}

		select.innerHTML = '<option value="">Sokak Yukleniyor...</option>';
		select.disabled = true;

		// Sokak degistiginde manual input'u resetle
		var manualInput = document.getElementById('acStreetManualInput');
		var backLink = document.getElementById('acStreetBackToList');
		if (manualInput) { manualInput.style.display = 'none'; manualInput.value = ''; }
		if (backLink) backLink.style.display = 'none';
		select.style.display = '';

		var result = await LocationsService.getStreetsByNeighborhoodId(neighborhoodId);
		if (result.error || !result.data || result.data.length === 0) {
			select.innerHTML = '<option value="">Sokak bulunamadi</option>';
			select.innerHTML += '<option value="__other__">\u2014 Diger (Elle yaziniz) \u2014</option>';
			select.disabled = false;
			return;
		}

		select.innerHTML = '<option value="">Cadde/Sokak Seciniz</option>';
		select.disabled = false;

		result.data.forEach(function(s) {
			select.innerHTML += '<option value="' + s.id + '" data-name="' + s.name + '">' + s.name + '</option>';
		});
		select.innerHTML += '<option value="__other__">\u2014 Diger (Elle yaziniz) \u2014</option>';
	}

	/**
	 * Alt dropdown'lari resetle
	 */
	function resetChildDropdowns(parentField) {
		var fields = ['city', 'district', 'neighborhood', 'street'];
		var startIndex = fields.indexOf(parentField) + 1;

		for (var i = startIndex; i < fields.length; i++) {
			var field = fields[i];
			if (missingFields.indexOf(field) !== -1) {
				var selectIds = {
					district: 'acDistrictSelect',
					neighborhood: 'acNeighborhoodSelect',
					street: 'acStreetSelect'
				};
				var placeholders = {
					district: 'Once il seciniz',
					neighborhood: 'Once ilce seciniz',
					street: 'Once mahalle seciniz'
				};
				var select = document.getElementById(selectIds[field]);
				if (select) {
					select.innerHTML = '<option value="">' + placeholders[field] + '</option>';
					select.disabled = true;
				}
			}
		}
	}

	/**
	 * Selected option'in data-name attribute'unu getir
	 */
	function getSelectedName(selectId) {
		var select = document.getElementById(selectId);
		if (!select || !select.selectedOptions[0]) return '';
		return select.selectedOptions[0].getAttribute('data-name') || select.selectedOptions[0].textContent || '';
	}

	/**
	 * Kaydet ve devam et
	 */
	async function submit() {
		var submitBtn = document.getElementById('addressCompletionSubmitBtn');

		// Eksik alanlari topla
		var updateData = {};
		var hasEmpty = false;

		if (missingFields.indexOf('city') !== -1) {
			var citySelect = document.getElementById('acCitySelect');
			if (!citySelect || !citySelect.value) {
				hasEmpty = true;
			} else {
				updateData.city_id = citySelect.value;
				updateData.city = getSelectedName('acCitySelect');
			}
		}

		if (missingFields.indexOf('district') !== -1) {
			var districtSelect = document.getElementById('acDistrictSelect');
			if (!districtSelect || !districtSelect.value) {
				hasEmpty = true;
			} else {
				updateData.district_id = districtSelect.value;
				updateData.district = getSelectedName('acDistrictSelect');
			}
		}

		if (missingFields.indexOf('neighborhood') !== -1) {
			var nhManualInput = document.getElementById('acNeighborhoodManualInput');
			var isManualNeighborhood = nhManualInput && nhManualInput.style.display !== 'none';
			if (isManualNeighborhood) {
				var nhManualVal = nhManualInput.value.trim();
				if (!nhManualVal) {
					hasEmpty = true;
				} else {
					updateData.neighborhood_id = null;
					updateData.neighborhood = nhManualVal;
				}
			} else {
				var neighborhoodSelect = document.getElementById('acNeighborhoodSelect');
				if (!neighborhoodSelect || !neighborhoodSelect.value || neighborhoodSelect.value === '__other__') {
					hasEmpty = true;
				} else {
					updateData.neighborhood_id = neighborhoodSelect.value;
					updateData.neighborhood = getSelectedName('acNeighborhoodSelect');
				}
			}
		}

		if (missingFields.indexOf('street') !== -1) {
			var streetManualInput = document.getElementById('acStreetManualInput');
			var isManualStreet = streetManualInput && streetManualInput.style.display !== 'none';
			if (isManualStreet) {
				var manualVal = streetManualInput.value.trim();
				if (!manualVal) {
					hasEmpty = true;
				} else {
					updateData.street_id = null;
					updateData.street = manualVal;
				}
			} else {
				var streetSelect = document.getElementById('acStreetSelect');
				if (!streetSelect || !streetSelect.value) {
					hasEmpty = true;
				} else {
					updateData.street_id = streetSelect.value;
					updateData.street = getSelectedName('acStreetSelect');
				}
			}
		}

		if (missingFields.indexOf('building_no') !== -1) {
			var buildingNoInput = document.getElementById('acBuildingNoInput');
			var buildingVal = buildingNoInput ? buildingNoInput.value.trim() : '';
			if (!buildingVal) {
				hasEmpty = true;
			} else {
				updateData.building_no = buildingVal;
			}
		}

		if (missingFields.indexOf('apartment') !== -1) {
			var apartmentInput = document.getElementById('acApartmentInput');
			var apartmentVal = apartmentInput ? apartmentInput.value.trim() : '';
			if (!apartmentVal) {
				hasEmpty = true;
			} else {
				updateData.apartment = apartmentVal;
			}
		}

		if (hasEmpty) {
			alert('Lutfen tum eksik alanlari doldurunuz.');
			return;
		}

		// Loading state
		submitBtn.disabled = true;
		submitBtn.textContent = 'Kaydediliyor...';

		try {
			// Mevcut branch verileriyle birlestir (full_address hesabi icin)
			var mergedData = {};
			mergedData.city = updateData.city || branchData.city;
			mergedData.district = updateData.district || branchData.district;
			mergedData.neighborhood = updateData.neighborhood || branchData.neighborhood;
			mergedData.street = updateData.street || branchData.street;
			mergedData.building_no = updateData.building_no || branchData.building_no;
			mergedData.apartment = updateData.apartment || branchData.apartment;

			// updateData'ya sadece eksik alanlari koy
			// full_address'i de guncelle
			updateData.full_address = BranchesService.buildFullAddress(mergedData);

			var result = await BranchesService.update(branchData.id, updateData);

			if (result.error) {
				alert('Adres guncellenirken bir hata olustu. Lutfen tekrar deneyiniz.');
				submitBtn.disabled = false;
				submitBtn.textContent = 'Kaydet ve Devam Et';
				return;
			}

			// Basarili - overlay kapat ve callback cagir
			close();
			submitBtn.disabled = false;
			submitBtn.textContent = 'Kaydet ve Devam Et';

			if (typeof successCallback === 'function') {
				successCallback();
			}
		} catch (err) {
			console.error('Adres guncelleme hatasi:', err);
			alert('Bir hata olustu. Lutfen tekrar deneyiniz.');
			submitBtn.disabled = false;
			submitBtn.textContent = 'Kaydet ve Devam Et';
		}
	}

	// Public API
	return {
		init: init,
		show: show,
		close: close,
		checkAndProceed: checkAndProceed
	};
})();

// Global erisim
window.AddressCompletionOverlay = AddressCompletionOverlay;
