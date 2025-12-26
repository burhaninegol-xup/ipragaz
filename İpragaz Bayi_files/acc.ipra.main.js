ACC.ipraMain = {
    _autoload: ['addBasketForComponent', 'removeVoucher','paragraphComponentPopup'],

    addBasketForComponent: function () {

        $(".js-add-to-basket-component").click(function (e) {
            e.preventDefault();

            var currentElem = $(this);
            var headerMiniCart = $(".header__cart-wrapper");
            var form = currentElem.closest(".product__basket").find("form");
            if (form.length == 0) {
                var quantity = $("<input>").attr("type", "hidden").attr("name", "qty").val(1);
                var product = $("<input>").attr("type", "hidden").attr("name", "productCodePost").val(currentElem.data().productCode);
                var csrfToken = $("<input>").attr("type", "hidden").attr("name", "CSRFToken").val(ACC.config.CSRFToken);

                form = $("<form></form>");
                form.prop('action', '/cart/add');
                form.prop('method', 'post');
                form.append($(quantity));
                form.append($(product));
                form.append($(csrfToken));
                form.css("display", "none");
                currentElem.closest(".product__basket").prepend(form);
            }

            $.post(form.attr("action"), form.serialize(), function (res) {
                if (res.indexOf('productErrorMessage') != -1) {
                    ACC.ipraMisc.successMessage.globalMessage('danger', $(res).html());
                    return;
                }
                window.location = "/cart";

                // headerMiniCart.empty().append(res);
                //
                // var totalItems = headerMiniCart.find("input[name='productCount']").val();
                // $(".miniCartSlot .badge").html(totalItems);

                // currentElem.parent().addClass("added__button");
                // currentElem.append('<div class="added__text">' +
                //     '<img src="/_ui/responsive/common/images/tik-white.svg" alt=""/>' +
                //     '<span>' +
                //     ACC.messages.AddedToBasket +
                //     '</span>' +
                //     '</div>');

                // headerMiniCart.addClass("opened");
                //
                // setTimeout(function () {
                //     currentElem.prop("disabled", false);
                //     currentElem.parent().removeClass("added__button");
                //     $(".added__text").remove();
                //     $(".header__cart-wrapper").removeClass("opened");
                // }, 3000);
            })

        });


    },

    removeVoucher: function () {
        $(document).on("click", "#removeVoucher", function (e) {
            e.preventDefault();
            var currentElem = $(this);
            var form = currentElem.closest("form");
            $.post("/cart/voucher/remove", form.serialize(), function (res) {
                window.location.reload();
            }).fail(function (err) {
                console.log(err);
            })
        });
    },
    paragraphComponentPopup: function () {
        $('a.paragraphComponentPopup').magnificPopup({
            type: 'inline',
            midClick: true,
            mainClass: "mfp-fade"
        });
    }
};
