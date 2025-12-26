ACC.ipraDealerAgreement = {
    el: {
        page:'.page-dashboardb2bContentPage',
        dealerPopup: '#popup-delaer',
        dealerPopupHead: '#popup-delaer .dealer-head',
        dealerPopupInfo: '.popup__content .dealer-info',
        dealerPopupVerify: '#popup-delaer .popup__verify #dealer-verify',
        dealerPopupCloseBtn: '#popup-delaer .mfp-close'

    },
    init: function () {
        this.events.dealerAgreement();
    },
    events: {
        dealerAgreement: function () {
            var _ipraDealer = ACC.ipraDealerAgreement;
            var _ipraDealerControl = ACC.config.dealerAgreement;
            var _isInc = ACC.config.isInc;

            $(_ipraDealer.el.dealerPopupHead).on('click', function () {
                var _dealerBtn = $(this).data('dealerBtn');
                $(_ipraDealer.el.dealerPopupInfo).each(function (index, item) {
                    var _this = $(item);
                    var _dealerInfo = _this.data('dealerInfo');
                    if (_dealerBtn === _dealerInfo) {
                        _this.show();
                    } else {
                        _this.hide();
                    }
                })
            });

            if ($(_ipraDealer.el.page) && _ipraDealerControl === 'false' && _isInc === 'true') {
                var popupPageType = $(_ipraDealer.el.dealerPopup);
                $.magnificPopup.open({
                    type: 'inline',
                    closeOnBgClick: false,
                    enableEscapeKey: false,
                    items: {
                        src: popupPageType
                    },
                    callbacks: {
                        open: function () {
                            $(_ipraDealer.el.dealerPopupCloseBtn).remove()
                        },
                        close: function () {}
                    }
                });
            }

            $(_ipraDealer.el.dealerPopupVerify).on('change', function () {
                if ($(this).is(':checked')) {
                    var params = {CSRFToken: ACC.config.CSRFToken};
                    ACC.ipraApiservice.post('/bayi/b2b/inc-dealer-agreement-apply', params).promise().done(function (res) {
                        if (res) {
                            $.magnificPopup.close();
                        }
                    });
                }
            });
        }
    }
};

$(document).ready(function () {
    with (ACC.ipraDealerAgreement) {
        init();
    }
});