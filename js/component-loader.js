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
                // Notification dropdown'i kapat
                const notificationDropdown = document.getElementById('notificationDropdown');
                if (notificationDropdown) notificationDropdown.classList.remove('active');
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

        // Notification dropdown toggle
        const notificationBtn = document.getElementById('notificationBtn');
        const notificationDropdown = document.getElementById('notificationDropdown');

        if (notificationBtn && notificationDropdown) {
            notificationBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                notificationDropdown.classList.toggle('active');
                // Profile dropdown'i kapat
                if (profileDropdown) profileDropdown.classList.remove('active');
            });

            document.addEventListener('click', function(e) {
                if (!notificationDropdown.contains(e.target) && !notificationBtn.contains(e.target)) {
                    notificationDropdown.classList.remove('active');
                }
            });

            // ESC tusu ile kapat
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    notificationDropdown.classList.remove('active');
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

        // Bildirim sistemini baslat
        this.initNotifications();
    },

    /**
     * Bildirim sistemini baslat
     */
    initNotifications() {
        const customerId = sessionStorage.getItem('isyerim_customer_id');
        if (!customerId) return;

        // NotificationsService ve supabaseClient hazir mi kontrol et
        if (typeof NotificationsService === 'undefined' || typeof supabaseClient === 'undefined') {
            setTimeout(() => this.initNotifications(), 200);
            return;
        }

        this.loadNotifications(customerId);
        this.subscribeToNotifications(customerId);

        // "Tumunu Okundu Isaretle" butonu
        const markAllBtn = document.getElementById('markAllReadBtn');
        if (markAllBtn) {
            markAllBtn.addEventListener('click', async () => {
                await NotificationsService.markAllAsRead(customerId, 'customer');
                await this.loadNotifications(customerId);
            });
        }
    },

    /**
     * Bildirimleri yukle
     */
    async loadNotifications(customerId) {
        try {
            const { data, error } = await NotificationsService.getAll(customerId, 'customer', { limit: 20 });
            if (error) {
                console.error('Bildirim yukleme hatasi:', error);
                return;
            }
            this.renderNotifications(data);
            this.updateNotificationBadge(data);
        } catch (err) {
            console.error('Bildirim yukleme hatasi:', err);
        }
    },

    /**
     * Bildirimleri render et
     */
    renderNotifications(notifications) {
        const list = document.getElementById('notificationList');
        if (!list) return;

        if (!notifications || notifications.length === 0) {
            list.innerHTML = `
                <div class="notification-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                    <p>Hic okunmamis mesajiniz yok</p>
                </div>
            `;
            return;
        }

        // Notifications'i sakla
        this.currentNotifications = notifications;

        list.innerHTML = notifications.map(n => this.renderNotificationItem(n)).join('');

        // Click handler'lari ekle
        list.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                const offerId = item.dataset.offerId;
                // Notification objesini bul
                const notification = this.currentNotifications.find(n => n.id === id);
                this.handleNotificationClick(id, offerId, notification);
            });
        });
    },

    // Mevcut bildirimler
    currentNotifications: [],

    /**
     * Tek bildirim item'i render et
     */
    renderNotificationItem(notification) {
        const timeAgo = this.getTimeAgo(notification.created_at);
        const iconClass = notification.action || 'default';
        const unreadClass = notification.is_read ? '' : 'unread';

        return `
            <div class="notification-item ${unreadClass}" data-id="${notification.id}" data-offer-id="${notification.offer_id || ''}">
                <div class="notification-icon ${iconClass}">
                    ${this.getNotificationIcon(notification.action)}
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${timeAgo}</div>
                </div>
            </div>
        `;
    },

    /**
     * Bildirim ikonu getir
     */
    getNotificationIcon(action) {
        const icons = {
            accepted: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
            rejected: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
            pending: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
            price_updated: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
            cancelled: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            created: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>',
            requested: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>',
            message: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
            activated: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
            passived: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>'
        };
        return icons[action] || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
    },

    /**
     * Zaman farki hesapla
     */
    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'Az once';
        if (seconds < 3600) return Math.floor(seconds / 60) + ' dk once';
        if (seconds < 86400) return Math.floor(seconds / 3600) + ' saat once';
        if (seconds < 604800) return Math.floor(seconds / 86400) + ' gun once';
        return date.toLocaleDateString('tr-TR');
    },

    /**
     * Badge'i guncelle
     */
    updateNotificationBadge(notifications) {
        const badge = document.getElementById('notificationBadge');
        if (!badge) return;

        const unreadCount = notifications ? notifications.filter(n => !n.is_read).length : 0;
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
    },

    /**
     * Bildirime tiklaninca - Modal ac
     */
    async handleNotificationClick(notificationId, offerId, notification) {
        // Notification dropdown'i kapat
        const dropdown = document.getElementById('notificationDropdown');
        if (dropdown) dropdown.classList.remove('active');

        // Modal'i ac
        this.openNotificationModal(notification);

        // 2 saniye sonra okundu isaretle
        this.notificationReadTimeout = setTimeout(async () => {
            await NotificationsService.markAsRead(notificationId);
            const customerId = sessionStorage.getItem('isyerim_customer_id');
            if (customerId) {
                await this.loadNotifications(customerId);
            }
        }, 2000);
    },

    // Aktif modal bilgisi
    currentModalNotification: null,
    currentModalOfferId: null,
    notificationReadTimeout: null,

    /**
     * Notification Modal ac
     */
    async openNotificationModal(notification) {
        this.currentModalNotification = notification;
        this.currentModalOfferId = notification.offer_id;

        const overlay = document.getElementById('notificationModalOverlay');
        if (!overlay) return;

        // Status badge guncelle
        const statusEl = document.getElementById('notificationModalStatus');
        const statusTextEl = document.getElementById('notificationModalStatusText');
        const timeEl = document.getElementById('notificationModalTime');

        if (statusEl) {
            statusEl.className = 'notification-modal-status ' + (notification.action || 'default');
            statusEl.innerHTML = this.getNotificationIcon(notification.action) + '<span>' + notification.title + '</span>';
        }
        if (timeEl) {
            timeEl.textContent = this.getTimeAgo(notification.created_at);
        }

        // Body'de sadece bildirim mesajini goster
        const body = document.getElementById('notificationModalBody');
        if (body) {
            body.innerHTML = `
                <div class="notification-modal-info">
                    <div class="notification-modal-message">
                        <p>${notification.message || 'Bildirim detayi'}</p>
                    </div>
                </div>
            `;
        }

        // Modal'i goster
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        // ESC tusu ile kapatma
        this.modalEscHandler = (e) => {
            if (e.key === 'Escape') this.closeNotificationModal();
        };
        document.addEventListener('keydown', this.modalEscHandler);
    },

    /**
     * Teklif detaylarini yukle
     */
    async loadOfferDetails(offerId) {
        const body = document.getElementById('notificationModalBody');
        if (!body) return;

        try {
            // Offer bilgilerini cek
            const { data: offer, error: offerError } = await supabaseClient
                .from('offers')
                .select('*')
                .eq('id', offerId)
                .single();

            if (offerError || !offer) {
                body.innerHTML = '<div class="notification-modal-loading">Teklif detaylari yuklenemedi</div>';
                return;
            }

            // Offer details cek (products ile birlikte)
            const { data: details } = await supabaseClient
                .from('offer_details')
                .select('*, products(name, sku)')
                .eq('offer_id', offerId);

            // Dealer bilgisi cek
            let dealerName = 'Bilinmiyor';
            if (offer.dealer_id) {
                const { data: dealer } = await supabaseClient
                    .from('dealers')
                    .select('name')
                    .eq('id', offer.dealer_id)
                    .single();
                if (dealer) dealerName = dealer.name;
            }

            // Customer bilgisi cek
            let customerName = 'Bilinmiyor';
            if (offer.customer_id) {
                const { data: customer } = await supabaseClient
                    .from('customers')
                    .select('name, company_name')
                    .eq('id', offer.customer_id)
                    .single();
                if (customer) customerName = customer.company_name || customer.name;
            }

            // Detaylari render et
            offer.dealers = { name: dealerName };
            offer.customers = { name: customerName };
            offer.offer_details = details || [];
            this.renderOfferDetails(offer);
        } catch (err) {
            console.error('Teklif yukleme hatasi:', err);
            body.innerHTML = '<div class="notification-modal-loading">Bir hata olustu</div>';
        }
    },

    /**
     * Teklif detaylarini render et
     */
    renderOfferDetails(offer) {
        const body = document.getElementById('notificationModalBody');
        if (!body) return;

        const customerName = offer.customers?.company_name || offer.customers?.name || 'Bilinmiyor';
        const dealerName = offer.dealers?.name || 'Bilinmiyor';
        const details = offer.offer_details || [];

        // Toplam tutar hesapla
        let totalAmount = 0;
        details.forEach(d => {
            const qty = d.commitment_quantity || 0;
            const price = d.unit_price || 0;
            totalAmount += qty * price;
        });

        // Urunleri listele
        let productsHtml = '';
        details.forEach(d => {
            const productName = d.products?.name || 'Bilinmeyen Urun';
            const qty = d.commitment_quantity || 0;
            const unitPrice = d.unit_price || 0;
            const lineTotal = qty * unitPrice;
            productsHtml += `
                <div class="notification-modal-row">
                    <div class="notification-modal-row-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                        </svg>
                    </div>
                    <div class="notification-modal-row-content">
                        <div class="notification-modal-row-label">${productName}</div>
                        <div class="notification-modal-row-value">${qty} Adet x ${unitPrice.toFixed(2)} TL = ${lineTotal.toFixed(2)} TL</div>
                    </div>
                </div>
            `;
        });

        body.innerHTML = `
            <div class="notification-modal-info">
                <div class="notification-modal-row">
                    <div class="notification-modal-row-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
                    </div>
                    <div class="notification-modal-row-content">
                        <div class="notification-modal-row-label">Bayi</div>
                        <div class="notification-modal-row-value">${dealerName}</div>
                    </div>
                </div>

                ${productsHtml}

                <div class="notification-modal-row">
                    <div class="notification-modal-row-icon" style="background: #fee2e2;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#e31e24" stroke-width="2">
                            <line x1="12" y1="1" x2="12" y2="23"/>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        </svg>
                    </div>
                    <div class="notification-modal-row-content">
                        <div class="notification-modal-row-label">Toplam Tutar</div>
                        <div class="notification-modal-row-value price">${totalAmount.toFixed(2)} TL</div>
                    </div>
                </div>

                ${offer.notes ? `
                    <div class="notification-modal-message">
                        <div class="notification-modal-message-label">Not</div>
                        <div class="notification-modal-message-text">${offer.notes}</div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    /**
     * Sadece bildirim mesaji goster (teklif ID yoksa)
     */
    renderNotificationOnlyModal(notification) {
        const body = document.getElementById('notificationModalBody');
        if (!body) return;

        body.innerHTML = `
            <div class="notification-modal-info">
                <div class="notification-modal-message">
                    <div class="notification-modal-message-label">Bildirim</div>
                    <div class="notification-modal-message-text">${notification.message}</div>
                </div>
            </div>
        `;

        // Teklifi goruntule butonunu gizle
        const viewBtn = document.getElementById('notificationModalViewBtn');
        if (viewBtn) viewBtn.style.display = 'none';
    },

    /**
     * Notification Modal kapat
     */
    closeNotificationModal(event) {
        if (event && event.target !== event.currentTarget) return;

        const overlay = document.getElementById('notificationModalOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
        document.body.style.overflow = '';

        // ESC handler'i kaldir
        if (this.modalEscHandler) {
            document.removeEventListener('keydown', this.modalEscHandler);
        }

        // Timeout'u temizle
        if (this.notificationReadTimeout) {
            clearTimeout(this.notificationReadTimeout);
        }

        // Teklifi goruntule butonunu tekrar goster
        const viewBtn = document.getElementById('notificationModalViewBtn');
        if (viewBtn) viewBtn.style.display = '';

        this.currentModalNotification = null;
        this.currentModalOfferId = null;
    },

    /**
     * Teklif sayfasina git
     */
    goToOffer() {
        // Her zaman teklif iste sayfasina git (son teklif orada gorunuyor)
        window.location.href = 'isyerim-musteri-teklif-iste.html';
    },

    /**
     * Realtime subscription baslat
     */
    subscribeToNotifications(customerId) {
        NotificationsService.subscribe(customerId, (notification) => {
            // Toast goster
            this.showNotificationToast(notification);

            // Bell shake
            const btn = document.getElementById('notificationBtn');
            if (btn) {
                btn.classList.add('shake');
                setTimeout(() => btn.classList.remove('shake'), 500);
            }

            // Badge pulse
            const badge = document.getElementById('notificationBadge');
            if (badge) {
                badge.classList.add('pulse');
                setTimeout(() => badge.classList.remove('pulse'), 500);
            }

            // Listeyi yenile
            this.loadNotifications(customerId);
        });
    },

    /**
     * Toast bildirimi goster
     */
    showNotificationToast(notification) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <div class="toast-progress"></div>
            <div class="toast-header">
                <div class="toast-icon ${notification.action || 'default'}">
                    ${this.getNotificationIcon(notification.action)}
                </div>
                <span class="toast-title">${notification.title}</span>
                <button class="toast-close" onclick="this.closest('.toast').remove()">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="toast-message">${notification.message}</div>
            ${notification.offer_id ? `
                <button class="toast-action" onclick="window.location.href='isyerim-musteri-bayi-fiyatlari.html?offer_id=${notification.offer_id}'">
                    Teklifi Goruntule
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
                    </svg>
                </button>
            ` : ''}
        `;

        container.appendChild(toast);

        // 5 saniye sonra kaldir
        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
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

        // Bayi bildirim sistemini baslat
        this.initBayiNotifications();
    },

    /**
     * Bayi bildirim sistemini baslat
     */
    initBayiNotifications() {
        const dealerId = sessionStorage.getItem('bayi_dealer_id');
        if (!dealerId) return;

        // NotificationsService ve supabaseClient hazir mi kontrol et
        if (typeof NotificationsService === 'undefined' || typeof supabaseClient === 'undefined') {
            setTimeout(() => this.initBayiNotifications(), 200);
            return;
        }

        // Desktop notification dropdown toggle
        const notificationBtn = document.getElementById('notificationBtn');
        const notificationDropdown = document.getElementById('notificationDropdown');

        if (notificationBtn && notificationDropdown) {
            notificationBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                notificationDropdown.classList.toggle('active');
                // Mobile dropdown'i kapat
                const mobileDropdown = document.getElementById('mobileNotificationDropdown');
                if (mobileDropdown) mobileDropdown.classList.remove('active');
            });
        }

        // Mobile notification dropdown toggle
        const mobileNotificationContainer = document.getElementById('mobileNotificationContainer');
        const mobileNotificationDropdown = document.getElementById('mobileNotificationDropdown');

        if (mobileNotificationContainer && mobileNotificationDropdown) {
            mobileNotificationContainer.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                mobileNotificationDropdown.classList.toggle('active');
                // Desktop dropdown'i kapat
                if (notificationDropdown) notificationDropdown.classList.remove('active');
            });
        }

        // Close dropdowns on outside click
        document.addEventListener('click', (e) => {
            // Desktop dropdown
            if (notificationDropdown) {
                const isDesktopBtn = notificationBtn && notificationBtn.contains(e.target);
                const isDesktopDropdown = notificationDropdown.contains(e.target);
                if (!isDesktopBtn && !isDesktopDropdown) {
                    notificationDropdown.classList.remove('active');
                }
            }

            // Mobile dropdown
            if (mobileNotificationDropdown) {
                const isMobileContainer = mobileNotificationContainer && mobileNotificationContainer.contains(e.target);
                if (!isMobileContainer) {
                    mobileNotificationDropdown.classList.remove('active');
                }
            }
        });

        // ESC ile dropdownlari kapat
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (notificationDropdown) notificationDropdown.classList.remove('active');
                if (mobileNotificationDropdown) mobileNotificationDropdown.classList.remove('active');
            }
        });

        // Desktop "Tumunu Okundu Isaretle" butonu
        const markAllBtn = document.getElementById('markAllReadBtn');
        if (markAllBtn) {
            markAllBtn.addEventListener('click', async () => {
                await NotificationsService.markAllAsRead(dealerId, 'dealer');
                await this.loadBayiNotifications(dealerId);
            });
        }

        // Mobile "Tumunu Okundu Isaretle" butonu
        const mobileMarkAllBtn = document.getElementById('mobileMarkAllReadBtn');
        if (mobileMarkAllBtn) {
            mobileMarkAllBtn.addEventListener('click', async () => {
                await NotificationsService.markAllAsRead(dealerId, 'dealer');
                await this.loadBayiNotifications(dealerId);
            });
        }

        // Bildirimleri yukle
        this.loadBayiNotifications(dealerId);

        // Realtime subscription baslat
        this.subscribeToBayiNotifications(dealerId);
    },

    /**
     * Bayi bildirimlerini yukle
     */
    async loadBayiNotifications(dealerId) {
        try {
            const { data, error } = await NotificationsService.getAll(dealerId, 'dealer', { limit: 20 });
            if (error) {
                console.error('Bayi bildirim yukleme hatasi:', error);
                return;
            }
            this.renderBayiNotifications(data);
            this.updateBayiNotificationBadge(data);
        } catch (err) {
            console.error('Bayi bildirim yukleme hatasi:', err);
        }
    },

    /**
     * Bayi bildirimlerini render et (desktop ve mobile)
     */
    renderBayiNotifications(notifications) {
        // Desktop list
        const desktopList = document.getElementById('notificationList');
        // Mobile list
        const mobileList = document.getElementById('mobileNotificationList');

        const emptyHtml = `
            <div class="notification-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <p>Bildirim bulunmuyor</p>
            </div>
        `;

        if (!notifications || notifications.length === 0) {
            if (desktopList) desktopList.innerHTML = emptyHtml;
            if (mobileList) mobileList.innerHTML = emptyHtml;
            return;
        }

        // Notifications'i sakla
        this.bayiNotifications = notifications;

        const notificationsHtml = notifications.map(n => this.renderBayiNotificationItem(n)).join('');

        // Her iki listeyi de guncelle
        if (desktopList) desktopList.innerHTML = notificationsHtml;
        if (mobileList) mobileList.innerHTML = notificationsHtml;

        // Click handler'lari ekle (her iki liste icin)
        const self = this;
        const addClickHandlers = (list) => {
            if (!list) return;
            list.querySelectorAll('.notification-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const id = item.dataset.id;
                    const offerId = item.dataset.offerId;
                    const dealerId = sessionStorage.getItem('bayi_dealer_id');

                    // Dropdownlari kapat
                    document.getElementById('notificationDropdown')?.classList.remove('active');
                    document.getElementById('mobileNotificationDropdown')?.classList.remove('active');

                    // Okundu isaretle
                    await NotificationsService.markAsRead(id);
                    await self.loadBayiNotifications(dealerId);

                    // Teklif sayfasina git
                    if (offerId) {
                        window.location.href = 'bayi-musteri-listesi.html';
                    }
                });
            });
        };

        addClickHandlers(desktopList);
        addClickHandlers(mobileList);
    },

    // Bayi bildirimleri
    bayiNotifications: [],

    /**
     * Bayi bildirim item'i render et
     */
    renderBayiNotificationItem(notification) {
        const timeAgo = this.getTimeAgo(notification.created_at);
        const iconClass = notification.action || 'default';
        const unreadClass = notification.is_read ? '' : 'unread';

        return `
            <div class="notification-item ${unreadClass}" data-id="${notification.id}" data-offer-id="${notification.offer_id || ''}">
                <div class="notification-icon ${iconClass}">
                    ${this.getNotificationIcon(notification.action)}
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${timeAgo}</div>
                </div>
            </div>
        `;
    },

    /**
     * Bayi badge'i guncelle (desktop ve mobile)
     * Badge her zaman gorunur - 0 olsa bile
     */
    updateBayiNotificationBadge(notifications) {
        const unreadCount = notifications ? notifications.filter(n => !n.is_read).length : 0;
        const badgeText = unreadCount > 99 ? '99+' : unreadCount.toString();

        // Desktop badge - her zaman gorunur
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            badge.textContent = badgeText;
            badge.classList.remove('hidden');
        }

        // Mobile badge - her zaman gorunur
        const mobileBadge = document.getElementById('mobileNotificationBadge');
        if (mobileBadge) {
            mobileBadge.textContent = badgeText;
            mobileBadge.classList.remove('hidden');
        }
    },

    /**
     * Bayi realtime subscription
     */
    subscribeToBayiNotifications(dealerId) {
        NotificationsService.subscribe(dealerId, (notification) => {
            // Toast goster
            this.showBayiNotificationToast(notification);

            // Bell shake
            const btn = document.getElementById('notificationBtn');
            if (btn) {
                btn.classList.add('shake');
                setTimeout(() => btn.classList.remove('shake'), 500);
            }

            // Badge pulse
            const badge = document.getElementById('notificationBadge');
            if (badge) {
                badge.classList.add('pulse');
                setTimeout(() => badge.classList.remove('pulse'), 500);
            }

            // Listeyi yenile
            this.loadBayiNotifications(dealerId);
        });
    },

    /**
     * Bayi toast bildirimi goster
     */
    showBayiNotificationToast(notification) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <div class="toast-progress"></div>
            <div class="toast-header">
                <div class="toast-icon ${notification.action || 'default'}">
                    ${this.getNotificationIcon(notification.action)}
                </div>
                <span class="toast-title">${notification.title}</span>
                <button class="toast-close" onclick="this.closest('.toast').remove()">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="toast-message">${notification.message}</div>
            ${notification.offer_id ? `
                <button class="toast-action" onclick="window.location.href='bayi-musteri-listesi.html'">
                    Musterilere Git
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
                    </svg>
                </button>
            ` : ''}
        `;

        container.appendChild(toast);

        // 5 saniye sonra kaldir
        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
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

// Sayfa yuklendiginde otomatik olarak componentleri yukle
document.addEventListener('DOMContentLoaded', function() {
    // isyerim sayfasi mi kontrol et
    if (document.getElementById('isyerim-header') || document.getElementById('isyerim-top-bar')) {
        ComponentLoader.loadAll();
    }
    // bayi sayfasi mi kontrol et
    else if (document.getElementById('bayi-header')) {
        ComponentLoader.loadBayiComponents();
    }
});

/**
 * Bayi Auth Kontrol - Giris yapilmamissa login sayfasina yonlendir
 */
window.bayiAuthCheck = function() {
    var dealerId = sessionStorage.getItem('bayi_dealer_id');
    if (!dealerId) {
        window.location.href = 'bayi-login.html';
        return false;
    }
    return true;
};

/**
 * Bayi Logout - Session'i temizle ve login sayfasina yonlendir
 */
window.bayiLogout = function() {
    sessionStorage.removeItem('bayi_dealer_id');
    sessionStorage.removeItem('bayi_dealer_name');
    sessionStorage.removeItem('bayi_dealer_code');
    window.location.href = 'bayi-login.html';
};
