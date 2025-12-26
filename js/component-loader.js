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
    }
};

// Sayfa yuklendiginde componentleri yukle
document.addEventListener('DOMContentLoaded', function() {
    ComponentLoader.loadAll();
});

// Global erisim
window.ComponentLoader = ComponentLoader;
