ACC.cartAddress = {
    _autoload: ['addFirstAddress'],
    addFirstAddress: function () {
        $(".addEditDeliveryAddressPage-page .checkoutOrderDetails-tag .js-multi-checkout-step-control-button").click(function (e) {
            var currentElem = $(this);
            if (currentElem.hasClass('addNewAddress')) {
                e.preventDefault();
                var form = $(".ipragazAddressFormSelector-tag #ipragazAddressForm");
                ACC.ipraApiservice.postResponse(".ipragazAddressFormSelector-tag #ipragazAddressForm", form.attr("action"), form.serialize()).promise().done(function (res) {
                   if (res.success === true) {
                        window.location = res.redirectUrl;
                        return;
                    }
                });
            }
            if (currentElem.hasClass("orderConfirmation")) {
                e.preventDefault();
                var form = $(".checkoutSummaryPage-page form#orderConfirmationForm");
                form.submit();
            }
        })

        $(".addEditDeliveryAddressPage-page .ipragazAddressFormSelector-tag a.selectOtherAddress").click(function (e) {
            e.preventDefault();

            var addressId = $(this).closest("li").data().addressCode;
            if (addressId){
                var data = {CSRFToken: ACC.config.CSRFToken};
                $.post("/checkout/multi/delivery-address/select/" + addressId, data, function (res) {
                    if (res == true) {
                        window.location.reload();
                    }
                });
            }

        })
    }
};