ACC.ipraHome = {
    selectRange: function () {
        $(document).on('change', '.total__sales__select  .form-control .select2', function (e) {
            var rangeValue = $(this).val();
            var href = window.location.pathname;
            window.location = href + "?range=" + rangeValue;
        });
    },
    webPlayerIdPush: function () {
        OneSignal.getUserId(function (userId) {
            var data = {webPlayerId: userId, CSRFToken: ACC.config.CSRFToken};
            ACC.ipraApiservice.post("/bayi/tr/login/oneSignalPlayerIdSave", data).promise().done(function (res) {
            });
        });
    }
};

$(document).ready(function () {
    with (ACC.ipraHome) {
        selectRange();
        if ($(".total__sales").length !== 0) {
            webPlayerIdPush();
        }
    }
});