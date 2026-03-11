/**
 * Feedback Toolbar Controller
 * Sayfa uzerinde alan secimi, yorum yazma ve geri bildirim yonetimi
 */

var FeedbackToolbar = (function () {
    var isAnnotating = false;
    var isDrawing = false;
    var startX = 0, startY = 0;
    var rectData = { x: 0, y: 0, width: 0, height: 0 };
    var currentTab = 'open';
    var currentPageFilter = 'current';
    var currentDetailItem = null;
    var isInitialized = false;

    // ===== INIT =====
    function init() {
        if (isInitialized) return;
        isInitialized = true;

        // Body padding ekle (toolbar yuksekligi kadar)
        var currentPadding = parseInt(getComputedStyle(document.body).paddingTop) || 0;
        document.body.style.paddingTop = (currentPadding + 40) + 'px';

        bindEvents();
        updateFeedbackCount();
    }

    function bindEvents() {
        // Toolbar butonlari
        var annotateBtn = document.getElementById('feedbackAnnotateBtn');
        var viewBtn = document.getElementById('feedbackViewBtn');
        if (annotateBtn) annotateBtn.addEventListener('click', startAnnotation);
        if (viewBtn) viewBtn.addEventListener('click', openFeedbackList);

        // Annotation overlay - mouse
        var overlay = document.getElementById('feedbackAnnotationOverlay');
        if (overlay) {
            overlay.addEventListener('mousedown', handleMouseDown);
            overlay.addEventListener('mousemove', handleMouseMove);
            overlay.addEventListener('mouseup', handleMouseUp);
            // Touch
            overlay.addEventListener('touchstart', handleTouchStart, { passive: false });
            overlay.addEventListener('touchmove', handleTouchMove, { passive: false });
            overlay.addEventListener('touchend', handleTouchEnd);
        }

        // Comment box
        var cancelBtn = document.getElementById('feedbackCancelBtn');
        var submitBtn = document.getElementById('feedbackSubmitBtn');
        if (cancelBtn) cancelBtn.addEventListener('click', cancelAnnotation);
        if (submitBtn) submitBtn.addEventListener('click', submitFeedback);

        // List panel
        var listCloseBtn = document.getElementById('feedbackListCloseBtn');
        var listOverlay = document.getElementById('feedbackListOverlay');
        if (listCloseBtn) listCloseBtn.addEventListener('click', closeFeedbackList);
        if (listOverlay) listOverlay.addEventListener('click', closeFeedbackList);

        // Sayfa filtre
        var pageFilterBtns = document.querySelectorAll('.feedback-page-filter-btn');
        pageFilterBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                pageFilterBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                currentPageFilter = btn.getAttribute('data-page-filter');
                loadFeedbackList();
            });
        });

        // Tabs
        var tabs = document.querySelectorAll('.feedback-list-tab');
        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                tabs.forEach(function (t) { t.classList.remove('active'); });
                tab.classList.add('active');
                currentTab = tab.getAttribute('data-status');
                loadFeedbackList();
            });
        });

        // Detail popover
        var detailCloseBtn = document.getElementById('feedbackDetailCloseBtn');
        if (detailCloseBtn) detailCloseBtn.addEventListener('click', closeDetail);

        var resolveBtn = document.getElementById('feedbackResolveBtn');
        if (resolveBtn) resolveBtn.addEventListener('click', resolveFeedback);

        var deleteBtn = document.getElementById('feedbackDeleteBtn');
        if (deleteBtn) deleteBtn.addEventListener('click', function () {
            if (currentDetailItem) deleteFeedback(currentDetailItem.id);
        });

        // ESC key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                if (isAnnotating) cancelAnnotation();
                closeDetail();
            }
        });
    }

    // ===== ANNOTATION MODE =====
    function startAnnotation() {
        isAnnotating = true;
        var overlay = document.getElementById('feedbackAnnotationOverlay');
        var btn = document.getElementById('feedbackAnnotateBtn');
        if (overlay) overlay.classList.add('active');
        if (btn) btn.classList.add('active');
    }

    function cancelAnnotation() {
        isAnnotating = false;
        isDrawing = false;
        var overlay = document.getElementById('feedbackAnnotationOverlay');
        var rect = document.getElementById('feedbackSelectionRect');
        var commentBox = document.getElementById('feedbackCommentBox');
        var btn = document.getElementById('feedbackAnnotateBtn');

        if (overlay) overlay.classList.remove('active');
        if (rect) rect.classList.remove('visible');
        if (commentBox) commentBox.classList.remove('visible');
        if (btn) btn.classList.remove('active');

        var textarea = document.getElementById('feedbackCommentText');
        if (textarea) textarea.value = '';
    }

    // ===== MOUSE EVENTS =====
    function handleMouseDown(e) {
        if (e.target.closest('.feedback-comment-box')) return;
        e.preventDefault();
        isDrawing = true;
        startX = e.clientX;
        startY = e.clientY;

        var rect = document.getElementById('feedbackSelectionRect');
        if (rect) {
            rect.style.left = startX + 'px';
            rect.style.top = startY + 'px';
            rect.style.width = '0px';
            rect.style.height = '0px';
            rect.classList.add('visible');
        }

        // Yorum kutusunu gizle (yeniden secim yaparken)
        var commentBox = document.getElementById('feedbackCommentBox');
        if (commentBox) commentBox.classList.remove('visible');
    }

    function handleMouseMove(e) {
        if (!isDrawing) return;
        e.preventDefault();
        updateSelectionRect(e.clientX, e.clientY);
    }

    function handleMouseUp(e) {
        if (!isDrawing) return;
        e.preventDefault();
        isDrawing = false;
        finalizeSelection(e.clientX, e.clientY);
    }

    // ===== TOUCH EVENTS =====
    function handleTouchStart(e) {
        if (e.target.closest('.feedback-comment-box')) return;
        e.preventDefault();
        var touch = e.touches[0];
        isDrawing = true;
        startX = touch.clientX;
        startY = touch.clientY;

        var rect = document.getElementById('feedbackSelectionRect');
        if (rect) {
            rect.style.left = startX + 'px';
            rect.style.top = startY + 'px';
            rect.style.width = '0px';
            rect.style.height = '0px';
            rect.classList.add('visible');
        }

        var commentBox = document.getElementById('feedbackCommentBox');
        if (commentBox) commentBox.classList.remove('visible');
    }

    function handleTouchMove(e) {
        if (!isDrawing) return;
        e.preventDefault();
        var touch = e.touches[0];
        updateSelectionRect(touch.clientX, touch.clientY);
    }

    function handleTouchEnd(e) {
        if (!isDrawing) return;
        isDrawing = false;
        var touch = e.changedTouches[0];
        finalizeSelection(touch.clientX, touch.clientY);
    }

    // ===== SELECTION RECT =====
    function updateSelectionRect(currentX, currentY) {
        var x = Math.min(startX, currentX);
        var y = Math.min(startY, currentY);
        var w = Math.abs(currentX - startX);
        var h = Math.abs(currentY - startY);

        var rect = document.getElementById('feedbackSelectionRect');
        if (rect) {
            rect.style.left = x + 'px';
            rect.style.top = y + 'px';
            rect.style.width = w + 'px';
            rect.style.height = h + 'px';
        }
    }

    function finalizeSelection(endX, endY) {
        var x = Math.min(startX, endX);
        var y = Math.min(startY, endY);
        var w = Math.abs(endX - startX);
        var h = Math.abs(endY - startY);

        // Minimum boyut kontrolu
        if (w < 20 || h < 20) {
            // Cok kucuk secim, iptal et
            var selRect = document.getElementById('feedbackSelectionRect');
            if (selRect) selRect.classList.remove('visible');
            return;
        }

        rectData = { x: x, y: y, width: w, height: h };
        positionCommentBox(rectData);
    }

    // ===== COMMENT BOX POSITIONING =====
    function positionCommentBox(rect) {
        var box = document.getElementById('feedbackCommentBox');
        if (!box) return;

        var boxWidth = 320;
        var boxHeight = 160;
        var margin = 12;

        // Varsayilan: dikdortgenin altinda
        var top = rect.y + rect.height + margin;
        var left = rect.x;

        // Altta yer yoksa, ustte goster
        if (top + boxHeight > window.innerHeight) {
            top = rect.y - boxHeight - margin;
        }

        // Ustte de yer yoksa, sagda goster
        if (top < 0) {
            top = rect.y;
            left = rect.x + rect.width + margin;
        }

        // Saga tasiyor mu?
        if (left + boxWidth > window.innerWidth) {
            left = window.innerWidth - boxWidth - margin;
        }

        // Sola tasiyor mu?
        if (left < margin) left = margin;

        // Ekranin altina tasiyor mu?
        if (top + boxHeight > window.innerHeight) {
            top = window.innerHeight - boxHeight - margin;
        }

        box.style.top = top + 'px';
        box.style.left = left + 'px';
        box.classList.add('visible');

        // Isim input'una sessionStorage'dan doldur
        var nameInput = document.getElementById('feedbackNameInput');
        var savedName = sessionStorage.getItem('feedback_user_name') || '';
        if (nameInput) {
            nameInput.value = savedName;
            if (!savedName) {
                nameInput.focus();
            } else {
                var textarea = document.getElementById('feedbackCommentText');
                if (textarea) textarea.focus();
            }
        }
    }

    // ===== SUBMIT =====
    async function submitFeedback() {
        var nameInput = document.getElementById('feedbackNameInput');
        var textarea = document.getElementById('feedbackCommentText');
        var submitBtn = document.getElementById('feedbackSubmitBtn');
        var userName = nameInput ? nameInput.value.trim() : '';
        var text = textarea ? textarea.value.trim() : '';

        if (!userName) {
            showToast('Lutfen adinizi yazin.');
            if (nameInput) nameInput.focus();
            return;
        }

        if (!text) {
            showToast('Lutfen bir yorum yazin.');
            return;
        }

        // Ismi oturum boyunca sakla
        sessionStorage.setItem('feedback_user_name', userName);

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Kaydediliyor...';
        }

        try {
            // Feedback UI elementlerini gizle (screenshot icin)
            var feedbackContainer = document.getElementById('feedback-toolbar-container');
            if (feedbackContainer) feedbackContainer.style.display = 'none';

            // html2canvas yukle
            console.log('[Feedback] html2canvas yukleniyor...');
            await loadHtml2Canvas();
            console.log('[Feedback] html2canvas yuklendi, screenshot aliniyor...');

            // Screenshot al - basit parametreler
            var canvas = await html2canvas(document.body, {
                useCORS: true,
                allowTaint: true,
                logging: true
            });
            console.log('[Feedback] Canvas olusturuldu:', canvas.width, 'x', canvas.height);

            // Secilen alani isaretleme (kirmizi cerceve)
            var ctx = canvas.getContext('2d');
            ctx.strokeStyle = '#e31e24';
            ctx.lineWidth = 6;
            ctx.setLineDash([8, 4]);
            ctx.strokeRect(
                rectData.x + window.scrollX,
                rectData.y + window.scrollY,
                rectData.width,
                rectData.height
            );

            // Feedback UI'yi geri goster
            if (feedbackContainer) feedbackContainer.style.display = '';

            // Canvas'i blob'a cevir (timeout ile)
            console.log('[Feedback] Canvas blob\'a cevriliyor...');
            var blob = await new Promise(function (resolve, reject) {
                var timeout = setTimeout(function () {
                    reject(new Error('toBlob timeout'));
                }, 10000);
                canvas.toBlob(function (b) {
                    clearTimeout(timeout);
                    resolve(b);
                }, 'image/jpeg', 0.75);
            });

            if (!blob) {
                console.error('[Feedback] toBlob null dondurdu, dataURL deneniyor...');
                // Fallback: dataURL -> blob
                var dataUrl = canvas.toDataURL('image/jpeg', 0.75);
                var byteString = atob(dataUrl.split(',')[1]);
                var arrayBuffer = new ArrayBuffer(byteString.length);
                var uint8Array = new Uint8Array(arrayBuffer);
                for (var i = 0; i < byteString.length; i++) {
                    uint8Array[i] = byteString.charCodeAt(i);
                }
                blob = new Blob([uint8Array], { type: 'image/jpeg' });
            }

            console.log('[Feedback] Blob olusturuldu, size=', blob.size);

            // Screenshot yukle
            var pageUrl = getCurrentPageUrl();
            var uploadResult = await FeedbackService.uploadScreenshot(blob, pageUrl);
            var screenshotUrl = uploadResult.data || null;

            if (uploadResult.error) {
                console.error('[Feedback] Screenshot upload hatasi:', uploadResult.error);
                showToast('Screenshot yuklenemedi: ' + uploadResult.error.message);
            }

            // Geri bildirim kaydet (screenshot basarisiz olsa bile metni kaydet)
            var result = await FeedbackService.create({
                page_url: pageUrl,
                feedback_text: text,
                screenshot_url: screenshotUrl,
                rect_x: Math.round(rectData.x),
                rect_y: Math.round(rectData.y),
                rect_width: Math.round(rectData.width),
                rect_height: Math.round(rectData.height),
                scroll_x: Math.round(window.scrollX),
                scroll_y: Math.round(window.scrollY),
                viewport_width: window.innerWidth,
                viewport_height: window.innerHeight,
                user_name: userName
            });

            if (result.error) {
                showToast('Hata: ' + result.error.message);
            } else {
                showToast(screenshotUrl ? 'Geri bildirim ve gorsel kaydedildi!' : 'Geri bildirim kaydedildi (gorsel yuklenemedi).');
                cancelAnnotation();
                updateFeedbackCount();
            }
        } catch (error) {
            console.error('[Feedback] Submit error:', error);
            showToast('Bir hata olustu: ' + error.message);

            // Hata durumunda elementleri geri goster
            var fc = document.getElementById('feedback-toolbar-container');
            if (fc) fc.style.display = '';
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Gonder';
            }
        }
    }

    // ===== HTML2CANVAS LAZY LOAD =====
    function loadHtml2Canvas() {
        return new Promise(function (resolve, reject) {
            if (window.html2canvas) {
                resolve();
                return;
            }
            var script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            script.onload = resolve;
            script.onerror = function () { reject(new Error('html2canvas yuklenemedi')); };
            document.head.appendChild(script);
        });
    }

    // ===== FEEDBACK LIST =====
    function openFeedbackList() {
        var panel = document.getElementById('feedbackListPanel');
        var backdrop = document.getElementById('feedbackListOverlay');
        if (panel) panel.classList.add('visible');
        if (backdrop) backdrop.classList.add('visible');
        loadFeedbackList();
    }

    function closeFeedbackList() {
        var panel = document.getElementById('feedbackListPanel');
        var backdrop = document.getElementById('feedbackListOverlay');
        if (panel) panel.classList.remove('visible');
        if (backdrop) backdrop.classList.remove('visible');
    }

    async function loadFeedbackList() {
        var content = document.getElementById('feedbackListContent');
        if (!content) return;

        content.innerHTML = '<div class="feedback-list-empty">Yukleniyor...</div>';

        var pageUrl = getCurrentPageUrl();
        var result;
        if (currentPageFilter === 'all') {
            result = await FeedbackService.getAll(currentTab || undefined);
        } else {
            result = await FeedbackService.getByPage(pageUrl, currentTab || undefined);
        }
        var items = result.data || [];

        if (items.length === 0) {
            content.innerHTML = '<div class="feedback-list-empty">Henuz geri bildirim yok.</div>';
            return;
        }

        var html = '';
        items.forEach(function (item) {
            var statusClass = item.status === 'resolved' ? 'resolved' : '';
            var statusBadge = item.status === 'resolved'
                ? '<span class="feedback-status-badge resolved">Cozuldu</span>'
                : '<span class="feedback-status-badge open">Acik</span>';
            var timeAgo = formatTimeAgo(item.created_at);
            var thumbSrc = item.screenshot_url || '';
            var thumbHtml = thumbSrc
                ? '<img class="feedback-list-item-thumb" src="' + thumbSrc + '" alt="Screenshot" />'
                : '<div class="feedback-list-item-thumb" style="display:flex;align-items:center;justify-content:center;color:#ccc;font-size:10px;">Gorsel yok</div>';

            var pageLabel = '';
            if (currentPageFilter === 'all' && item.page_url) {
                pageLabel = '<span class="feedback-list-item-page">' + escapeHtml(item.page_url.replace('.html', '')) + '</span>';
            }

            html += '<div class="feedback-list-item ' + statusClass + '" data-id="' + item.id + '">'
                + thumbHtml
                + '<div class="feedback-list-item-body">'
                + pageLabel
                + '<div class="feedback-list-item-text">' + escapeHtml(item.feedback_text) + '</div>'
                + '<div class="feedback-list-item-meta">'
                + statusBadge
                + '<span>' + (item.user_name || 'Anonim') + '</span>'
                + '<span>' + timeAgo + '</span>'
                + '</div></div>'
                + '<button class="feedback-list-item-delete" data-delete-id="' + item.id + '" title="Sil">&times;</button>'
                + '</div>';
        });

        content.innerHTML = html;

        // Item tiklamalari
        content.querySelectorAll('.feedback-list-item').forEach(function (el) {
            el.addEventListener('click', function (e) {
                if (e.target.closest('.feedback-list-item-delete')) return;
                var id = el.getAttribute('data-id');
                var item = items.find(function (i) { return i.id === id; });
                if (item) showDetail(item);
            });
        });

        // Silme butonlari
        content.querySelectorAll('.feedback-list-item-delete').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var id = btn.getAttribute('data-delete-id');
                deleteFeedback(id);
            });
        });
    }

    // ===== DETAIL POPOVER =====
    function showDetail(item) {
        currentDetailItem = item;
        var popover = document.getElementById('feedbackDetailPopover');
        var img = document.getElementById('feedbackDetailImage');
        var text = document.getElementById('feedbackDetailText');
        var user = document.getElementById('feedbackDetailUser');
        var date = document.getElementById('feedbackDetailDate');
        var status = document.getElementById('feedbackDetailStatus');
        var resolveBtn = document.getElementById('feedbackResolveBtn');

        if (img) {
            if (item.screenshot_url) {
                img.src = item.screenshot_url;
                img.style.display = 'block';
            } else {
                img.style.display = 'none';
            }
        }
        if (text) text.textContent = item.feedback_text;
        if (user) user.textContent = item.user_name || 'Anonim';
        if (date) date.textContent = formatDate(item.created_at);
        if (status) {
            status.innerHTML = item.status === 'resolved'
                ? '<span class="feedback-status-badge resolved">Cozuldu</span>'
                : '<span class="feedback-status-badge open">Acik</span>';
        }
        if (resolveBtn) {
            if (item.status === 'resolved') {
                resolveBtn.style.display = 'none';
            } else {
                resolveBtn.style.display = '';
            }
        }
        if (popover) popover.classList.add('visible');
    }

    function closeDetail() {
        var popover = document.getElementById('feedbackDetailPopover');
        if (popover) popover.classList.remove('visible');
        currentDetailItem = null;
    }

    async function resolveFeedback() {
        if (!currentDetailItem) return;
        var resolveBtn = document.getElementById('feedbackResolveBtn');
        if (resolveBtn) {
            resolveBtn.disabled = true;
            resolveBtn.textContent = 'Kaydediliyor...';
        }

        var user = getCurrentUser();
        var result = await FeedbackService.resolve(currentDetailItem.id, user.name);

        if (result.error) {
            showToast('Hata: ' + result.error.message);
        } else {
            showToast('Geri bildirim cozuldu olarak isaretlendi.');
            currentDetailItem.status = 'resolved';
            showDetail(currentDetailItem);
            loadFeedbackList();
            updateFeedbackCount();
        }

        if (resolveBtn) {
            resolveBtn.disabled = false;
            resolveBtn.textContent = 'Cozuldu Olarak Isaretle';
        }
    }

    // ===== DELETE =====
    async function deleteFeedback(id) {
        if (!confirm('Bu geri bildirimi silmek istediginize emin misiniz?')) return;

        var result = await FeedbackService.delete(id);
        if (result.error) {
            showToast('Hata: ' + result.error.message);
        } else {
            showToast('Geri bildirim silindi.');
            closeDetail();
            loadFeedbackList();
            updateFeedbackCount();
        }
    }

    // ===== HELPERS =====
    function getCurrentPageUrl() {
        var path = window.location.pathname;
        var page = path.split('/').pop();
        return page || 'index.html';
    }

    function getCurrentUser() {
        // Bayi
        var dealerId = sessionStorage.getItem('bayi_dealer_id');
        if (dealerId) {
            return {
                type: 'bayi',
                id: dealerId,
                name: sessionStorage.getItem('bayi_user_name') || sessionStorage.getItem('bayi_dealer_name') || 'Bayi'
            };
        }
        // Musteri
        var customerId = sessionStorage.getItem('isyerim_customer_id');
        if (customerId) {
            return {
                type: 'customer',
                id: customerId,
                name: sessionStorage.getItem('isyerim_user_name') || sessionStorage.getItem('isyerim_customer_name') || 'Musteri'
            };
        }
        // Backoffice
        var adminName = sessionStorage.getItem('backoffice_admin_name');
        if (adminName) {
            return { type: 'backoffice', id: null, name: adminName };
        }
        // Anonim
        return { type: 'anonymous', id: null, name: 'Anonim' };
    }

    async function updateFeedbackCount() {
        var badge = document.getElementById('feedbackCount');
        if (!badge) return;

        var pageUrl = getCurrentPageUrl();
        var result = await FeedbackService.getOpenCount(pageUrl);
        var count = result.data || 0;

        if (count > 0) {
            badge.textContent = count;
            badge.style.display = '';
        } else {
            badge.style.display = 'none';
        }
    }

    function showToast(message) {
        var toast = document.getElementById('feedbackToast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(function () {
            toast.classList.remove('show');
        }, 3000);
    }

    function formatTimeAgo(dateStr) {
        var now = new Date();
        var date = new Date(dateStr);
        var diff = Math.floor((now - date) / 1000);

        if (diff < 60) return 'Az once';
        if (diff < 3600) return Math.floor(diff / 60) + ' dk once';
        if (diff < 86400) return Math.floor(diff / 3600) + ' saat once';
        if (diff < 604800) return Math.floor(diff / 86400) + ' gun once';
        return formatDate(dateStr);
    }

    function formatDate(dateStr) {
        var d = new Date(dateStr);
        var day = d.getDate().toString().padStart(2, '0');
        var month = (d.getMonth() + 1).toString().padStart(2, '0');
        var year = d.getFullYear();
        var hours = d.getHours().toString().padStart(2, '0');
        var minutes = d.getMinutes().toString().padStart(2, '0');
        return day + '.' + month + '.' + year + ' ' + hours + ':' + minutes;
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    return {
        init: init
    };
})();

window.FeedbackToolbar = FeedbackToolbar;
