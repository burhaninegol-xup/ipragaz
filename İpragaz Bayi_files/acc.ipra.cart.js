ACC.ipraCart = {
    defaultSetMobileBasketQuantity: function () {
        var miniBaskeQuantity = $(".miniCartSlot .badge").html();
        $(".header__nav .header__user-panel .mobile-panel .badge").html(miniBaskeQuantity);
    },
    changeQuantity: function () {
        $(".cart__page .piece__group button.increase").on('click', function (e) {
            e.preventDefault();
            var $this = $(this);

            var val = parseInt($this.prev().val());
            if ((val + 1) > 1) {
                $this.closest(".piece__group").find(".decrease.js-qty-selector-minus").prop("disabled", true);
            }

            $this.prev().val(val + 1);
            var vals = parseInt($this.prev().val());

            if (vals > 1) {
                $this.closest(".product__select").find(".add__button").addClass("price-content");
            }
            var form = $this.closest("tr").find(".productRowForm form.cartProductRowForm");
            ACC.ipraCart.quantityFormSubmit(form, val + 1);
            $(".lds-css").show();
        });

        $(".cart__page .piece__group button.decrease").on('click', function (e) {
            e.preventDefault();
            var $this = $(this);
            var val = parseInt($this.next().val());
            if ((val - 1) < 2) {
                $this.prop("disabled", true);
            }
            $this.next().val(val > 0 ? val - 1 : val);
            var vals = parseInt($this.next().val());
            if (vals < 2) {
                $this.closest(".product__select").find(".add__button").removeClass("price-content");
            }
            var form = $this.closest("tr").find(".productRowForm form.cartProductRowForm");
            ACC.ipraCart.quantityFormSubmit(form, val - 1);
            $(".lds-css").show();
        });

        $(".cart__page .piece__group input.piece__group__value__input").on("blur", function (e) {
            e.preventDefault();
            var $this = $(this);
            var form = $this.closest("tr").find(".productRowForm form.cartProductRowForm");
            ACC.ipraCart.quantityFormSubmit(form, $this.val());
            $(".lds-css").show();
        });

    },
    quantityFormSubmit: function (form, quantity) {
        form.find("[name=quantity]").val(quantity);
        form.submit();
        $(".lds-css").show();
        document.location.reload(true);
    },

    getDeliverySlot: function () {
        var weebSelect = $("select[name='supplierWeek']");
        var timeSelect = $("select[name='timeselect']");

        $(".ipragazDeliveryAddress-tag select[name='supplier']").change(function (e) {
            e.preventDefault();
            ACC.ipraMisc.selectBoxSetDefault(timeSelect);
            timeSelect.prop('disabled', true);
            weebSelect.val('');
            weebSelect.trigger('change', 'onLoad');
        });

        $(".ipragazDeliveryAddress-tag select[name='supplierWeek']").change(function (e, data) {
            e.preventDefault();
            if (!ACC.ipraValidator.isNullOrEmpty(data)) {
                return;
            }

            $(".ipragazDeliveryAddress-tag select[name='timeselect']").empty();
            ACC.ipraMisc.selectBoxSetDefault(timeSelect);
            timeSelect.prop('disabled', true);

            var params = {posId: $(".ipragazDeliveryAddress-tag select[name='supplier']").val(), weekDay: weebSelect.val(), CSRFToken: ACC.config.CSRFToken};
            $.post("/checkout/multi/payment-method/choose-deliverySlot", params, function (res) {
                console.log(res);
                var options = ACC.ipraMisc.createOption(res, "code", "intervalDisplay");
                timeSelect.append(options);
                timeSelect.prop('disabled', false);
            });
        });
    },

    bindPostEntryType: function () {
        $(document).on('change', ".page-cartPage #entryType", function (e) {
            var entryType = $(this).closest('tr').find('#entryType :selected').val();
            var entryNumber = $(this).closest('tr').find('#entryNumber').val();
            var params = {entryNumber: entryNumber, entryType: entryType, "CSRFToken": ACC.config.CSRFToken};
            $(".lds-css").show();
            return ACC.ipraApiservice.post("/bayi/cart/update-entry-type", params).promise().done(function (res) {
                document.location.reload(true);
            })
        });
    },
};

$(document).ready(function () {
    with(ACC.ipraCart){
        changeQuantity();
        getDeliverySlot();
        defaultSetMobileBasketQuantity();
        bindPostEntryType();
    }
});