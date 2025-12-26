ACC.ipraProductList = {
    addToCart: function () {
        $(".productListPage-page").on("click", ".product__basket button#addToCartButton", function (e) {
            e.preventDefault();
            var $this = $(this);
            $this.prop("disabled", true);
            var form = $(this).closest("form");
            var qty = form.find("[name=qty]");
            var headerMiniCart = $(".header__cart-wrapper");

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
        });
    },
    filterProduct: function () {
        var productList = undefined;
        $(".productListPage-page .product__filter [data-filter-target-key]").click(function (e) {
            e.preventDefault();
            var key = "";
            var keys = [];
            $(".productListPage-page .product__filter .product__filter-list ul li.active").each(function () {
                var currentElem = $(this);
                key = currentElem.data().filterTargetKey;
                keys.push(key);
            });

            var productListBox = $(".productListPage-page .product__listing");
            if (productList === undefined) {
                productList = productListBox.find('.product__list--item');
            }

            productListBox.find('.product__list--item').remove();

            if (!keys.length > 0) {
                productListBox.append(productList);
                return;
            }

            $.each(productList, function (index, item) {
                $.each(ACC.ipraProductList.getAllPermutations(keys), function (i, key) {
                    if ($(item).hasClass(key.toString().replace(",", ' '))) {
                        productListBox.append(item);
                    }
                });

            });

            $(".product__item").css('visibility', 'visible')
        })
    },

    getAllPermutations: function (keys) {
        var resultsMarka = [];
        var resultsHacim = [];
        var results = [];
        var kg = "kg";

        $.each(keys, function (index, key) {
            if (key.indexOf(kg) == -1) {
                resultsMarka.push(key);
            }
            if (key.indexOf(kg) != -1) {
                resultsHacim.push(key);
            }
        });
        if (resultsMarka.length > 0 && resultsHacim.length > 0) {
            for (var i = 0; i < resultsMarka.length; i++) {
                for (var j = 0; j < resultsHacim.length; j++) {
                    results.push([resultsMarka[i]].concat(resultsHacim[j]));
                }
            }
        }
        if (resultsMarka.length > 0 && !resultsHacim.length > 0) {
            results = resultsMarka;
        }

        if (!resultsMarka.length > 0 && resultsHacim.length > 0) {
            results = resultsHacim;
        }

        return results;
    },
    sortProducts: function () {
        $("select.sortProductList").change(function (e) {
            var filterPriceList = $("[data-filter-price]");
            if (filterPriceList.length == 0)
                return;
            var priceList = [];
            $.each(filterPriceList, function (index, item) {
                priceList.push({price: parseInt($(item).val()), product: $(item)});
            });
            var value = $(this).val();
            if (value == 'price-asc') {
                console.log(priceList.sort(sortNumber));
            }
            if (value == 'price-desc') {
                console.log(priceList.sort(reverseNumber));
            }
            setProductSortNumber(priceList);
        });

        function sortNumber(a, b) {
            return a.price - b.price;
        }

        function reverseNumber(a, b) {
            return b.price - a.price;
        }

        function setProductSortNumber(priceList) {
            $.each(priceList, function (index, item) {
                $(item.product).closest("div.product__item").attr('data-sort', index);
            });

            var sortProductList = $('div[data-sort]').sort(function (a, b) {

                var contentA = parseInt($(a).attr('data-sort'));
                var contentB = parseInt($(b).attr('data-sort'));
                return (contentA < contentB) ? -1 : (contentA > contentB) ? 1 : 0;
            });

            $(".product__listing.product__list.product__wrapper").empty();
            $(".product__listing.product__list.product__wrapper").append(sortProductList);
        }
    }
};

$(document).ready(function () {
    with (ACC.ipraProductList) {
        addToCart();
        filterProduct();
        sortProducts();
    }
});