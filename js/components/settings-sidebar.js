// Settings Sidebar Component Script
// Sidebar'i yukle ve aktif sayfayi isaretle
function initSettingsSidebar(activePage) {
	// Kullanici bilgilerini yukle
	var userName = sessionStorage.getItem('isyerim_user_name') || 'Kullanici';
	var tabelaUnvani = sessionStorage.getItem('isyerim_tabela_unvani') || '';
	var userId = sessionStorage.getItem('isyerim_user_id') || sessionStorage.getItem('isyerim_customer_id') || '';
	var userRole = sessionStorage.getItem('isyerim_user_role') || 'owner';

	var nameElement = document.getElementById('sidebarUserName');
	var companyElement = document.getElementById('sidebarUserCompany');
	var phoneElement = document.getElementById('sidebarUserPhone');

	if (nameElement) nameElement.textContent = userName;
	if (companyElement) companyElement.textContent = tabelaUnvani;
	if (phoneElement) phoneElement.textContent = userId;

	// Staff kullanicilar icin owner-only menuleri gizle
	if (userRole !== 'owner') {
		var ownerOnlyItems = document.querySelectorAll('.sidebar-menu-item.owner-only');
		ownerOnlyItems.forEach(function(item) {
			item.style.display = 'none';
		});
	}

	// Aktif sayfayi isaretle
	if (activePage) {
		var links = document.querySelectorAll('.sidebar-menu-link');
		links.forEach(function(link) {
			if (link.getAttribute('data-page') === activePage) {
				link.classList.add('active');
			}
		});
	}
}

// Cikis islemi
function handleLogout() {
	sessionStorage.clear();
}

// ===========================================
// HESABIMI SIL OVERLAY FONKSIYONLARI
// ===========================================

// Delete account overlay'i ac
async function openDeleteAccountOverlay() {
	var overlay = document.getElementById('deleteAccountOverlay');
	if (!overlay) {
		console.error('Delete account overlay bulunamadi');
		return;
	}

	overlay.classList.add('active');
	document.body.style.overflow = 'hidden';

	// Checkbox'i sifirla
	var checkbox = document.getElementById('deleteConfirmCheckbox');
	if (checkbox) checkbox.checked = false;

	// Butonu devre disi birak
	var btn = document.getElementById('btnConfirmDelete');
	if (btn) btn.disabled = true;

	// Etki listesini yukle
	await loadDeletionImpact();
}

// Delete account overlay'i kapat
function closeDeleteAccountOverlay() {
	var overlay = document.getElementById('deleteAccountOverlay');
	if (overlay) {
		overlay.classList.remove('active');
	}
	document.body.style.overflow = '';
}

// Checkbox degisikliginde butonu aktif/pasif yap
function toggleDeleteButton() {
	var checkbox = document.getElementById('deleteConfirmCheckbox');
	var btn = document.getElementById('btnConfirmDelete');
	if (checkbox && btn) {
		btn.disabled = !checkbox.checked;
	}
}

// Silme etkisini yukle ve goster
async function loadDeletionImpact() {
	var container = document.getElementById('deletionImpactList');
	if (!container) return;

	// Loading goster
	container.innerHTML = '<div class="impact-loading"><div class="impact-spinner"></div><span>Hesap bilgileri yukleniyor...</span></div>';

	var userId = sessionStorage.getItem('isyerim_user_id');
	if (!userId) {
		container.innerHTML = '<div class="impact-item danger"><div class="impact-content"><div class="impact-title">Hata</div><div class="impact-detail">Kullanici bilgisi bulunamadi.</div></div></div>';
		return;
	}

	try {
		var result = await AccountDeletionService.calculateDeletionImpact(userId);

		if (result.error || !result.data) {
			container.innerHTML = '<div class="impact-item danger"><div class="impact-content"><div class="impact-title">Hata</div><div class="impact-detail">Bilgiler yuklenemedi.</div></div></div>';
			return;
		}

		renderDeletionImpact(result.data);
	} catch (err) {
		console.error('loadDeletionImpact error:', err);
		container.innerHTML = '<div class="impact-item danger"><div class="impact-content"><div class="impact-title">Hata</div><div class="impact-detail">Bir hata olustu.</div></div></div>';
	}
}

// Silme etkisini render et
function renderDeletionImpact(impact) {
	var container = document.getElementById('deletionImpactList');
	if (!container) return;

	var html = '';

	// 1. Kullanici hesabi silinecek
	html += '<div class="impact-item danger">';
	html += '<div class="impact-icon danger"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>';
	html += '<div class="impact-content">';
	html += '<div class="impact-title">Kullanici Hesabiniz</div>';
	html += '<div class="impact-detail">' + impact.userName + ' hesabi silinecek</div>';
	html += '</div></div>';

	// 2. Silinecek subeler
	if (impact.branchesToDelete.length > 0) {
		html += '<div class="impact-item danger">';
		html += '<div class="impact-icon danger"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>';
		html += '<div class="impact-content">';
		html += '<div class="impact-title">Silinecek Subeler (' + impact.branchesToDelete.length + ')</div>';
		html += '<div class="impact-detail"><ul>';
		for (var i = 0; i < impact.branchesToDelete.length; i++) {
			var branch = impact.branchesToDelete[i];
			var label = branch.name || 'Sube';
			if (branch.isDefault) label += ' (Merkez)';
			html += '<li>' + label + ' - ' + (branch.district || '') + ', ' + (branch.city || '') + '</li>';
		}
		html += '</ul></div></div></div>';
	}

	// 3. Korunacak subeler (baska kullanici var)
	if (impact.branchesToKeep.length > 0) {
		html += '<div class="impact-item info">';
		html += '<div class="impact-icon info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></div>';
		html += '<div class="impact-content">';
		html += '<div class="impact-title">Korunacak Subeler (' + impact.branchesToKeep.length + ')</div>';
		html += '<div class="impact-detail">Bu subeler baska kullanicilar tarafindan yonetilmeye devam edecek:<ul>';
		for (var j = 0; j < impact.branchesToKeep.length; j++) {
			var keptBranch = impact.branchesToKeep[j];
			html += '<li>' + (keptBranch.name || 'Sube') + '</li>';
		}
		html += '</ul></div></div></div>';
	}

	// 4. Musteri kaydi silinecek mi?
	if (impact.willDeleteCustomer) {
		html += '<div class="impact-item danger">';
		html += '<div class="impact-icon danger"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M9 8h1"/><path d="M9 12h1"/><path d="M9 16h1"/><path d="M14 8h1"/><path d="M14 12h1"/><path d="M14 16h1"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/></svg></div>';
		html += '<div class="impact-content">';
		html += '<div class="impact-title">Isletme Hesabi</div>';
		html += '<div class="impact-detail">' + impact.customerName + ' isletme hesabi tamamen silinecek</div>';
		html += '</div></div>';
	}

	// 5. Puanlar
	if (impact.totalPoints > 0) {
		html += '<div class="impact-item warning">';
		html += '<div class="impact-icon warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div>';
		html += '<div class="impact-content">';
		html += '<div class="impact-title">Kazanilmis Puanlar</div>';
		html += '<div class="impact-detail">' + impact.totalPoints.toLocaleString('tr-TR') + ' puan hesabinizda kalacak (silinmeyecek)</div>';
		html += '</div></div>';
	}

	container.innerHTML = html;
}

// Hesap silmeyi onayla
async function confirmAccountDeletion() {
	var btn = document.getElementById('btnConfirmDelete');
	if (btn) {
		btn.disabled = true;
		btn.innerHTML = '<div class="impact-spinner" style="width:20px;height:20px;border-width:2px;"></div> Siliniyor...';
	}

	var userId = sessionStorage.getItem('isyerim_user_id');
	if (!userId) {
		alert('Kullanici bilgisi bulunamadi.');
		return;
	}

	try {
		var result = await AccountDeletionService.executeAccountDeletion(userId);

		if (result.error || !result.data) {
			alert('Hesap silinirken bir hata olustu: ' + (result.error ? result.error.message : 'Bilinmeyen hata'));
			if (btn) {
				btn.disabled = false;
				btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Hesabimi Sil';
			}
			return;
		}

		// Basarili - success overlay goster
		document.getElementById('deleteAccountOverlay').classList.remove('active');
		document.getElementById('deleteSuccessOverlay').classList.add('active');

		// 2.5 saniye sonra logout ve yonlendir
		setTimeout(function() {
			sessionStorage.clear();
			window.location.href = 'isyerim-musteri-login.html';
		}, 2500);

	} catch (err) {
		console.error('confirmAccountDeletion error:', err);
		alert('Bir hata olustu: ' + err.message);
		if (btn) {
			btn.disabled = false;
			btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Hesabimi Sil';
		}
	}
}
