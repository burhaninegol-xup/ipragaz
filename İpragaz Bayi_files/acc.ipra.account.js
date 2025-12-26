ACC.ipraAccount = {
    _autoload: [
        'onLoad'
    ],
    onLoad: function () {
        with (ACC.ipraAccount) {
            orderHistory.reOrder();
            orderHistory.sortOrder();
            orderHistory.cancelOrder();
            contactUs.sentInformation();
        }
    },
    orderHistory: {
        reOrder: function () {
            $(".accountOrderHistoryPage-page  .reOrder").click(function (e) {
                var orderCode = $(this).data().code;
                var data = {CSRFToken: ACC.config.CSRFToken};
                ACC.ipraApiservice.postResponse(null, "/checkout/summary/reorder/?orderCode=" + orderCode, data, false).promise().done(function (res) {
                    if (res.success === true) {
                        console.log(res);
                        $("div[redirect-cart-url] a")[0].click();
                        // window.location.href = "/cart";
                    }
                });

            });
        },
        sortOrder: function () {
            $('.filter').change(function () {
                var sortValue = $(this).val();
                var href = window.location.pathname;
                window.location = href + "?sort=" + sortValue;
            });
        },
        cancelOrder: function () {
            $(".accountOrderHistoryPage-page .cancel-order").click(function (e) {
                var orderCode = $(this).attr("data-value");
                var data = {CSRFToken: ACC.config.CSRFToken};
                ACC.ipraApiservice.postResponse(null, "/my-account/order/cancel/" + orderCode, data, true).promise().done(function (res) {

                });
            });
        }
    },
    contactUs: {
        sentInformation: function () {
            $(".page-ipragazB2cContactPage .sent-message").click(function (e) {
                e.preventDefault();
                var currentElement = $(this);
                var form = currentElement.closest("form");
                var formClass = "form#ipragazContactUsForm";
                ACC.ipraApiservice.postResponse(formClass, "/contact-us", form.serialize(), true).promise().done(function (res) {
                });
            });
        }
    }
};