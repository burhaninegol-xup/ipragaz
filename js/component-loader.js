/**
 * Component Loader
 * Header, Top-bar ve Footer componentlerini dinamik olarak yukler
 */

const ComponentLoader = {
    /**
     * Tek bir componenti yukle
     */
    async load(elementId, componentPath) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn('Element bulunamadi:', elementId);
            return;
        }

        try {
            const response = await fetch(componentPath);
            if (!response.ok) {
                throw new Error('Component yuklenemedi: ' + componentPath);
            }
            const html = await response.text();
            element.innerHTML = html;
        } catch (error) {
            console.error('Component yukleme hatasi:', error);
        }
    },

    /**
     * Tum componentleri yukle
     */
    async loadAll() {
        await Promise.all([
            this.load('isyerim-top-bar', './components/isyerim-top-bar.html'),
            this.load('isyerim-header', './components/isyerim-header.html'),
            this.load('isyerim-footer', './components/isyerim-footer.html')
        ]);

        // Componentler yuklendikten sonra event'leri bagla
        this.initializeComponents();
    },

    /**
     * Component event'lerini bagla
     */
    initializeComponents() {
        // Profile dropdown toggle
        const profileBtn = document.getElementById('profileBtn');
        const profileDropdown = document.getElementById('profileDropdown');

        if (profileBtn && profileDropdown) {
            profileBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                profileDropdown.classList.toggle('active');
            });

            document.addEventListener('click', function(e) {
                if (!profileDropdown.contains(e.target) && !profileBtn.contains(e.target)) {
                    profileDropdown.classList.remove('active');
                }
            });

            // ESC tusu ile kapat
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    profileDropdown.classList.remove('active');
                }
            });
        }

        // Sepet badge guncelle
        this.updateCartBadge();

        // Kullanici adini yukle
        this.loadUserName();

        // Adres modal'i baslat
        this.initAddressModal();

        // cartUpdated event'ini dinle
        window.addEventListener('cartUpdated', () => {
            this.updateCartBadge();
        });
    },

    /**
     * Kullanici adini sessionStorage'dan yukle ve goster
     */
    loadUserName() {
        var customerName = sessionStorage.getItem('isyerim_customer_name');

        // Profile dropdown'daki ismi guncelle
        var profileNameEl = document.getElementById('profileUserName');
        if (profileNameEl && customerName) {
            profileNameEl.textContent = customerName;
        }

        // Header'daki kullanici adini da guncelle
        var headerUserNameEl = document.getElementById('headerUserName');
        if (headerUserNameEl && customerName) {
            headerUserNameEl.textContent = customerName;
        }
    },

    /**
     * Sepet badge'ini guncelle
     */
    updateCartBadge() {
        const badge = document.getElementById('cartBadge');
        if (badge && typeof CartService !== 'undefined') {
            const count = CartService.getItemCount();
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    },

    /**
     * Adres modal fonksiyonlarini baslat
     */
    initAddressModal() {
        // Secili adresi yukle
        this.loadSelectedAddress();

        // Header user location'a click event ekle
        var headerUserLocation = document.querySelector('.header-user-location');
        if (headerUserLocation) {
            headerUserLocation.style.cursor = 'pointer';
            headerUserLocation.addEventListener('click', function() {
                window.openAddressModal();
            });
        }
    },

    /**
     * Kayitli secili adresi yukle
     */
    loadSelectedAddress() {
        var savedId = sessionStorage.getItem('selected_address_id');
        var savedName = sessionStorage.getItem('selected_address_name');
        if (savedId && savedName) {
            var locationSpan = document.getElementById('headerUserLocation');
            if (locationSpan) {
                locationSpan.textContent = savedName;
            }
        }
    },

    /**
     * Bayi componentlerini yukle
     */
    async loadBayiComponents() {
        await Promise.all([
            this.load('bayi-header', './components/bayi-header.html'),
            this.load('bayi-mobile-sidebar', './components/bayi-mobile-sidebar.html')
        ]);

        // Componentler yuklendikten sonra event'leri bagla
        this.initializeBayiComponents();
    },

    /**
     * Bayi component event'lerini bagla
     */
    initializeBayiComponents() {
        var $sidebar = document.getElementById('mobile-sidebar');
        var $overlay = document.getElementById('menu-overlay');
        var $hamburger = document.getElementById('hamburger-btn');
        var $closeBtn = document.getElementById('mobile-sidebar-close');

        // Hamburger click - sidebar ac
        if ($hamburger && $sidebar && $overlay) {
            $hamburger.addEventListener('click', function() {
                $sidebar.classList.add('active');
                $overlay.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        }

        // Close button ve overlay click - sidebar kapat
        function closeSidebar() {
            if ($sidebar) $sidebar.classList.remove('active');
            if ($overlay) $overlay.classList.remove('active');
            document.body.style.overflow = '';
        }

        if ($closeBtn) {
            $closeBtn.addEventListener('click', closeSidebar);
        }
        if ($overlay) {
            $overlay.addEventListener('click', closeSidebar);
        }

        // Dinamik tarih guncelle
        this.updateBayiDate();

        // Aktif menu item'i isaretlemesi icin sayfa yolu kontrol et
        this.markActiveMenuItem();
    },

    /**
     * Bayi header ve sidebar'da tarihi guncelle
     */
    updateBayiDate() {
        var now = new Date();
        var days = ['Pazar', 'Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi'];
        var months = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'];

        var dayNum = now.getDate();
        var monthName = months[now.getMonth()];
        var weekday = days[now.getDay()];

        // Header date
        var headerDay = document.getElementById('header-date-day');
        var headerWeekday = document.getElementById('header-date-weekday');
        if (headerDay) headerDay.textContent = dayNum + ' ' + monthName;
        if (headerWeekday) headerWeekday.textContent = weekday;

        // Sidebar date
        var sidebarDate = document.getElementById('sidebar-date-text');
        if (sidebarDate) sidebarDate.textContent = dayNum + ' ' + monthName + ', ' + weekday;
    },

    /**
     * Aktif menu item'i isaretlemesi
     */
    markActiveMenuItem() {
        var currentPage = window.location.pathname.split('/').pop();
        var menuItems = document.querySelectorAll('.mobile-sidebar-menu li');

        menuItems.forEach(function(item) {
            var link = item.querySelector('a');
            if (link) {
                var href = link.getAttribute('href');
                if (href && href === currentPage) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            }
        });
    }
};

// Adres Modal Global Degiskenleri
var selectedAddressId = sessionStorage.getItem('selected_address_id') || null;
var selectedAddressName = sessionStorage.getItem('selected_address_name') || null;

// Adres Modal Ac
window.openAddressModal = async function() {
    var customerId = sessionStorage.getItem('isyerim_customer_id');
    if (!customerId) {
        window.location.href = 'isyerim-musteri-login.html';
        return;
    }

    var overlay = document.getElementById('addressModalOverlay');
    if (!overlay) {
        console.error('Address modal overlay bulunamadi');
        return;
    }

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    var listContainer = document.getElementById('addressModalList');
    if (listContainer) {
        listContainer.innerHTML = '<div class="address-empty">Yukleniyor...</div>';
    }

    // AddressesService kontrolu
    if (typeof AddressesService === 'undefined') {
        if (listContainer) {
            listContainer.innerHTML = '<div class="address-empty">Adres servisi yuklenemedi</div>';
        }
        return;
    }

    var result = await AddressesService.getByCustomerId(customerId);

    if (result.error) {
        if (listContainer) {
            listContainer.innerHTML = '<div class="address-empty">Adresler yuklenemedi</div>';
        }
        return;
    }

    var addresses = result.data || [];

    if (addresses.length === 0) {
        if (listContainer) {
            listContainer.innerHTML = '<div class="address-empty">Henuz kayitli adresiniz yok.<br><a href="isyerim-musteri-adreslerim.html">Adres eklemek icin tiklayin</a></div>';
        }
        return;
    }

    var html = '';
    addresses.forEach(function(addr) {
        var isSelected = addr.id === selectedAddressId || (addr.is_default && !selectedAddressId);
        var escapedName = addr.address_name.replace(/'/g, "\\'");
        html += '<div class="address-modal-item' + (isSelected ? ' selected' : '') + '" data-id="' + addr.id + '" data-name="' + escapedName + '">';
        html += '<div class="address-radio"><div class="address-radio-inner"></div></div>';
        html += '<div class="address-modal-info">';
        html += '<div class="address-modal-name">' + addr.address_name + '</div>';
        html += '<div class="address-modal-full">' + (addr.full_address || addr.district + ', ' + addr.city) + '</div>';
        html += '</div></div>';

        if (isSelected) {
            selectedAddressId = addr.id;
            selectedAddressName = addr.address_name;
        }
    });

    if (listContainer) {
        listContainer.innerHTML = html;

        // Her adres item'a click event ekle
        var items = listContainer.querySelectorAll('.address-modal-item');
        items.forEach(function(item) {
            item.addEventListener('click', function() {
                window.selectModalAddress(this.dataset.id, this.dataset.name);
            });
        });
    }

    var continueBtn = document.getElementById('addressContinueBtn');
    if (continueBtn) {
        continueBtn.disabled = !selectedAddressId;
    }
};

// Adres Modal Kapat
window.closeAddressModal = function(event) {
    if (event && event.target !== event.currentTarget) return;
    var overlay = document.getElementById('addressModalOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
    document.body.style.overflow = '';
};

// Adres Sec
window.selectModalAddress = function(addressId, addressName) {
    selectedAddressId = addressId;
    selectedAddressName = addressName;

    var items = document.querySelectorAll('.address-modal-item');
    items.forEach(function(item) {
        item.classList.remove('selected');
        if (item.dataset.id === addressId) {
            item.classList.add('selected');
        }
    });

    var continueBtn = document.getElementById('addressContinueBtn');
    if (continueBtn) {
        continueBtn.disabled = false;
    }
};

// Adres Secimini Onayla
window.confirmAddressSelection = function() {
    if (!selectedAddressId || !selectedAddressName) return;

    sessionStorage.setItem('selected_address_id', selectedAddressId);
    sessionStorage.setItem('selected_address_name', selectedAddressName);

    var locationSpan = document.getElementById('headerUserLocation');
    if (locationSpan) {
        locationSpan.textContent = selectedAddressName;
    }

    window.closeAddressModal();
};

// Global erisim
window.ComponentLoader = ComponentLoader;
