ACC.ipraProductDetail = {
    onLoad: function () {
        $(".product__detail #addToCartButton").prop("disabled", false);
    },
    addToCart: function () {
        $(".product__detail #addToCartButton").click(function (e) {
            e.preventDefault();
            var $this = $(this);

            // if ($this.hasClass("noSelectedCity")) {
            //     ACC.ipraMisc.successMessage.globalMessage("danger", ACC.messages.AddToBasketNotSelectedCity);
            //     return;
            // }

            $this.prop("disabled", true);
            var form = $(this).closest("form");
            var qty = form.find("[name=qty]");
            var headerMiniCart = $(".header__cart-wrapper");

            qty.val($(".product__detail #pdpAddtoCartInput").val());

            $.post(form.attr("action"), form.serialize(), function (res) {
                if (res.indexOf('productErrorMessage') != -1) {
                    ACC.ipraMisc.successMessage.globalMessage('danger', $(res).html());
                    $this.prop("disabled", false);
                    return;
                }
                headerMiniCart.empty().append(res);

                var totalItems = headerMiniCart.find("input[name='productCount']").val();
                $("header.header .badge").html(totalItems);

                $this.parent().addClass("added__button");
                $this.append('<div class="added__text">' +
                    '<img src="/_ui/responsive/common/images/tik-white.svg" alt=""/>' +
                    '<span>' +
                    ACC.messages.AddedToBasket +
                    '</span>' +
                    '</div>');

                headerMiniCart.addClass("opened");

                setTimeout(function () {
                    $this.prop("disabled", false);
                    $this.parent().removeClass("added__button");
                    $(".added__text").remove();
                    $(".header__cart-wrapper").removeClass("opened");
                }, 3000);
            })
        })
    },
    changeQuantity: function () {
        $(".product__detail .piece__group button.increase").on('click', function (e) {
            e.preventDefault();
            var $this = $(this);

            var val = parseInt($this.prev().val());
            if ((val + 1) > 1) {
                $(".decrease.js-qty-selector-minus").prop("disabled", false);
            }

            $this.prev().val(val + 1);
            var vals = parseInt($this.prev().val());

            if (vals > 1) {
                var price = $(".product__detail .product__price").attr("data-price");
                $(".product__detail .total__price").html(ACC.messages.Total + " " + parseInt(price) * vals + " ₺");
            }
        });

        $(".product__detail .piece__group button.decrease").on('click', function (e) {
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
            } else {
                var price = $(".product__detail .product__price").attr("data-price");
                $(".product__detail .total__price").html(ACC.messages.Total + " " + parseInt(price) * vals + " ₺");
            }
        })
    }
};

$(document).ready(function () {
    with (ACC.ipraProductDetail) {
        onLoad();
        addToCart();
        changeQuantity();
    }
});