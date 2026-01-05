// Mevcut backoffice-raporlar.html dosyasına eklenecek JavaScript kodu

class ReportFiltersManager {
    constructor() {
        this.filters = {
            startDate: null,
            endDate: null,
            dealerId: null,
            productCategory: null,
            reportType: null
        };
        this.debounceTimeout = null;
        this.isLoading = false;
        this.init();
    }

    init() {
        this.bindFilterEvents();
        this.loadInitialReports();
    }

    bindFilterEvents() {
        // Tarih filtreleri
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (startDateInput) {
            startDateInput.addEventListener('change', (e) => {
                this.filters.startDate = e.target.value;
                this.debouncedUpdate();
            });
        }

        if (endDateInput) {
            endDateInput.addEventListener('change', (e) => {
                this.filters.endDate = e.target.value;
                this.debouncedUpdate();
            });
        }

        // Bayi seçimi
        const dealerSelect = document.getElementById('dealerSelect');
        if (dealerSelect) {
            dealerSelect.addEventListener('change', (e) => {
                this.filters.dealerId = e.target.value || null;
                this.debouncedUpdate();
            });
        }

        // Ürün kategorisi
        const categorySelect = document.getElementById('categorySelect');
        if (categorySelect) {
            categorySelect.addEventListener('change', (e) => {
                this.filters.productCategory = e.target.value || null;
                this.debouncedUpdate();
            });
        }

        // Rapor tipi
        const reportTypeSelect = document.getElementById('reportType');
        if (reportTypeSelect) {
            reportTypeSelect.addEventListener('change', (e) => {
                this.filters.reportType = e.target.value || null;
                this.debouncedUpdate();
            });
        }
    }

    debouncedUpdate() {
        // Rapid değişikliklerde API çağrılarını throttle et
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }

        this.debounceTimeout = setTimeout(() => {
            this.updateReports();
        }, 300); // 300ms debounce
    }

    async updateReports() {
        if (this.isLoading) {
            return; // Concurrent çağrıları engelle
        }

        this.isLoading = true;
        this.showLoadingStates();

        try {
            // Tüm widget'ları paralel olarak güncelle
            const promises = [
                this.updateSalesTonnageWidget(),
                this.updateProductSalesWidget(),
                this.updateOrderCountsWidget(),
                this.updateRecurringOrdersWidget(),
                this.updateDealerLocationWidget()
            ];

            await Promise.allSettled(promises);
            
        } catch (error) {
            console.error('Rapor güncelleme hatası:', error);
            this.showErrorState();
        } finally {
            this.isLoading = false;
            this.hideLoadingStates();
        }
    }

    async updateSalesTonnageWidget() {
        try {
            const { data, error } = await window.ReportsService.getSalesTonnage(
                this.filters.startDate,
                this.filters.endDate,
                this.filters.dealerId
            );

            if (error) throw error;

            this.renderSalesTonnageChart(data);
        } catch (error) {
            console.error('Satış tonaj raporu hatası:', error);
            this.showWidgetError('salesTonnage');
        }
    }

    async updateProductSalesWidget() {
        try {
            const { data, error } = await window.ReportsService.getProductSales(
                this.filters.startDate,
                this.filters.endDate,
                this.filters.productCategory,
                this.filters.dealerId
            );

            if (error) throw error;

            this.renderProductSalesChart(data);
        } catch (error) {
            console.error('Ürün satış raporu hatası:', error);
            this.showWidgetError('productSales');
        }
    }

    async updateOrderCountsWidget() {
        try {
            const { data, error } = await window.ReportsService.getOrderCounts(
                this.filters.startDate,
                this.filters.endDate,
                this.filters.dealerId
            );

            if (error) throw error;

            this.renderOrderCountsChart(data);
        } catch (error) {
            console.error('Sipariş sayısı raporu hatası:', error);
            this.showWidgetError('orderCounts');
        }
    }

    async updateRecurringOrdersWidget() {
        try {
            const { data, error } = await window.ReportsService.getRecurringOrderCounts(
                this.filters.startDate,
                this.filters.endDate,
                this.filters.dealerId
            );

            if (error) throw error;

            this.renderRecurringOrdersChart(data);
        } catch (error) {
            console.error('Düzenli sipariş raporu hatası:', error);
            this.showWidgetError('recurringOrders');
        }
    }

    async updateDealerLocationWidget() {
        try {
            const { data, error } = await window.ReportsService.getDealersByLocation();

            if (error) throw error;

            this.renderDealerLocationChart(data);
        } catch (error) {
            console.error('Bayi lokasyon raporu hatası:', error);
            this.showWidgetError('dealerLocation');
        }
    }

    showLoadingStates() {
        const widgets = [
            'salesTonnage',
            'productSales', 
            'orderCounts',
            'recurringOrders',
            'dealerLocation'
        ];

        widgets.forEach(widgetId => {
            const widget = document.getElementById(`${widgetId}Widget`);
            if (widget) {
                widget.classList.add('loading');
                const loadingEl = widget.querySelector('.loading-spinner');
                if (loadingEl) {
                    loadingEl.style.display = 'block';
                }
            }
        });
    }

    hideLoadingStates() {
        const widgets = [
            'salesTonnage',
            'productSales',
            'orderCounts', 
            'recurringOrders',
            'dealerLocation'
        ];

        widgets.forEach(widgetId => {
            const widget = document.getElementById(`${widgetId}Widget`);
            if (widget) {
                widget.classList.remove('loading');
                const loadingEl = widget.querySelector('.loading-spinner');
                if (loadingEl) {
                    loadingEl.style.display = 'none';
                }
            }
        });
    }

    showWidgetError(widgetId) {
        const widget = document.getElementById(`${widgetId}Widget`);
        if (widget) {
            widget.classList.add('error');
            const errorEl = widget.querySelector('.error-message');
            if (errorEl) {
                errorEl.textContent = 'Veri yüklenirken hata oluştu';
                errorEl.style.display = 'block';
            }
        }
    }

    showErrorState() {
        // Genel hata durumu için notification göster
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.textContent = 'Raporlar güncellenirken hata oluştu. Lütfen tekrar deneyin.';
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    async loadInitialReports() {
        // Sayfa yüklendiğinde varsayılan raporları getir
        const today = new Date();
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        
        this.filters.startDate = lastMonth.toISOString().split('T')[0];
        this.filters.endDate = today.toISOString().split('T')[0];

        // Form elemanlarını da güncelle
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (startDateInput) startDateInput.value = this.filters.startDate;
        if (endDateInput) endDateInput.value = this.filters.endDate;

        await this.updateReports();
    }

    // Chart render metodları - mevcut implementasyonu kullan
    renderSalesTonnageChart(data) {
        // Mevcut chart render kodunu kullan
        if (window.renderSalesTonnageChart) {
            window.renderSalesTonnageChart(data);
        }
    }

    renderProductSalesChart(data) {
        if (window.renderProductSalesChart) {
            window.renderProductSalesChart(data);
        }
    }

    renderOrderCountsChart(data) {
        if (window.renderOrderCountsChart) {
            window.renderOrderCountsChart(data);
        }
    }

    renderRecurringOrdersChart(data) {
        if (window.renderRecurringOrdersChart) {
            window.renderRecurringOrdersChart(data);
        }
    }

    renderDealerLocationChart(data) {
        if (window.renderDealerLocationChart) {
            window.renderDealerLocationChart(data);
        }
    }
}

// Sayfa yüklendiğinde başlat
if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', () => {
        window.reportFiltersManager = new ReportFiltersManager();
    });
}

// Test ortamı için export (ES module)
export { ReportFiltersManager };