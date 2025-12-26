ACC.ipraCheckout = {
    _autoload: [
        'onLoad',
        'delivery',
        'formPostDisableEnter'
    ],
    onLoad: function () {
        $(".checkoutSummaryPage-page .checkoutOrderDetails-tag .js-multi-checkout-step-control-button").click(function (e) {
            var currentElem = $(this);
            if (currentElem.hasClass("orderConfirmation")) {
                e.preventDefault();
                if (currentElem.hasClass('ipragaz-loading-button')){
                    return;
                }
                ACC.ipraMisc.loadingButton.start(currentElem);
                var form = $(".checkoutSummaryPage-page form#orderConfirmationForm");
                form.submit();
            }
        });

        $(".addEditDeliveryAddressPage-page .checkoutOrderDetails-tag .js-multi-checkout-step-control-button").click(function (e) {
            var currentElem = $(this);
            if (currentElem.hasClass("paymentMethod")) {
                e.preventDefault();
                var paymentForm = $(".addEditDeliveryAddressPage-page form#paymentMethodFom");
                ACC.ipraApiservice.postResponse(".addEditDeliveryAddressPage-page form#paymentMethodFom", paymentForm.attr("action"), paymentForm.serialize(), false).promise().done(function (res) {
                    if (res.success === true) {
                        window.location = res.redirectUrl;
                        return;
                    }
                });
            }
        });

        var form = $(".checkoutSummaryPage-page #orderConfirmationForm");
        if (form.length > 0) {
            var agreement = form.find('#preOrderAgreement');
            var terms = form.find('#termsCheck');
            $(".checkoutSummaryPage-page .checkoutOrderDetails-tag .summary__agreement input[name='fakeTerms']").change(function (e) {
                agreement.val($(this)[0].checked);

            });
            $(".checkoutSummaryPage-page .checkoutOrderDetails-tag .summary__agreement input[name='fakeAgreement']").change(function (e) {
                terms.val($(this)[0].checked);
            });
        }
    },
    delivery: function () {
        var supplierWeek = $(".addEditDeliveryAddressPage-page select[name='supplierWeek']");
        if (supplierWeek.length > 0 && !ACC.ipraValidator.isNullOrEmpty(supplierWeek.data().selectedValue)) {
            supplierWeek.trigger('change');
        }
    },
    formPostDisableEnter: function () {
        $('#paymentMethodFom').on('keyup keypress', function(e) {
            var keyCode = e.keyCode || e.which;
            if (keyCode === 13) {
                e.preventDefault();
                return false;
            }
        });
    }
};

$(document).ready(function () {
    with (ACC.ipraCheckout){
        onLoad();
        delivery();
        formPostDisableEnter();
    }
});