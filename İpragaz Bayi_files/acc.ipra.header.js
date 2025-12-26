ACC.ipraHeader = {
    searchBox: function () {
        $("header.header #header-search").keypress(function (e) {
            var form = $(this).closest('form');
            if (e.which == 13) {
                window.location = form.data('submitUrl') + $(this).val();
            }
        })
    }
};

$(document).ready(function () {
    with (ACC.ipraHeader) {
        searchBox();
    }
});