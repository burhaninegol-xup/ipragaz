ACC.ipraGlobal = {
    checkUrlList: [
        '/bayi',
        '/bayi/tr',
        '/bayi/tr/',
        '/bayi/en',
        '/bayi/en/',

        '/bayi/b2b/order/CREATED',
        '/bayi/tr/b2b/order/CREATED',
        '/bayi/en/b2b/order/CREATED',
    ],
    init: function () {
        this.events.checkCreatedPage();
        this.events.newOrderCheck();
    },
    events: {
        checkCreatedPage: function () {
            var _g = ACC.ipraGlobal;
            _g.checkUrlList.forEach(function (url) {
                if (window.location.pathname == url) {
                    _g.methods.checkCreatedPage();
                }
            })
        },
        newOrderCheck: function () {
            localStorage.setItem('title', $('title').text());
            var _notificationLogo = $('.header__logo').find('img').attr('src');
            var notificationSound = new Audio('/_ui/responsive/common/images/new-order-alert.mp3');

            setInterval(function () {
                var _url = "/bayi/b2b/check-orderSummaryStatus";
                var _params = {CSRFToken: ACC.config.CSRFToken};
                ACC.ipraApiservice.post(_url, _params).promise().done(function (res) {
                    $('.header__nav .js-b2b-order svg').remove();
                    if (res.incOrderDiff > 0 || res.ipappOrderDiff > 0) {
                        $('title').text(ACC.config.dealerNewOrderText);
                        Notification.requestPermission().then(function (permission) {
                            if (permission === 'granted') {
                                var notification = new Notification(ACC.config.dealerNewOrderText, {
                                    icon: _notificationLogo
                                });
                                notification.onclick = function (ev) {
                                    window.open('/bayi/b2b/order', '_blank');
                                };
                                notificationSound.play().catch(function (e) {
                                    console.warn("Ses çalınamadı:", e);
                                });
                            }
                        });
                        var _totalOrderCount = res.incOrderDiff + res.ipappOrderDiff;
                        var _iconHtml = '<svg class="icon icon-notifications js-b2b-not-icon">' +
                            '<use xlink:href="/_ui/responsive/common/images/sprite-map.svg#notifications"></use>' +
                            '</svg>' + '<span class="js-b2b-not-count">' + _totalOrderCount + '</span>';
                        $('.header__nav .js-b2b-order').find('.js-b2b-not-icon, .js-b2b-not-count').remove();
                        $('.header__nav .js-b2b-order').append(_iconHtml);
                        if (res.incOrderDiff > 0) {
                            $('.icon-inc-not').text("(" + res.incOrderDiff + ")");
                            $('.icon-inc-not').show();
                        } else {
                            $('.icon-ipapp-not').text("(" + res.ipappOrderDiff + ")");
                            $('.icon-ipapp-not').show();
                        }
                    } else {
                        $('title').text(localStorage.getItem('title'));
                        $('.icon-ipapp-not').hide();
                        $('.icon-inc-not').hide();
                        $('.header__nav .js-b2b-order').find('.js-b2b-not-icon, .js-b2b-not-count').remove();
                    }
                });
            }, ACC.config.createOrderCheckIntervalTime);
        }
    },
    methods: {
        checkCreatedPage: function () {
            if (ACC.ipraValidator.isNullOrEmpty(ACC.config.createReportRefreshIntervalTime)) {
                return
            }
            setTimeout(function () {
                window.location.reload();
            }, ACC.config.createReportRefreshIntervalTime)
        }
    }
}

$(document).ready(function () {
    with (ACC.ipraGlobal) {
        init();
    }
})