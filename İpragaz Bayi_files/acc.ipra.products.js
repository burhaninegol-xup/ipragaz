ACC.ipraProducts = {
    changeActiveStatus: function () {
        $(".js-change-product-status-btn").on('click', function (e) {
            var _t = $(this);
            var _code = _t.data('code');
            var _url = "/bayi/b2b/products-activate";

            var _params = {
                code: _code,
                "CSRFToken": ACC.config.CSRFToken
            };
            ACC.ipraApiservice.post(_url, _params).promise().done(function (res) {
                if (res.success) {
                    window.location.reload();
                }
            });

        })
    }
};

$(document).ready(function () {
    with (ACC.ipraProducts) {
        changeActiveStatus();
    }
});