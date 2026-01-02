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
