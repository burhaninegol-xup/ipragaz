ACC.ipraCookie = {
    _autoload: [
        "confirmationCookie", "readMode"
    ],
    confirmationCookie: function () {
        $(".cookienotification-page button.confirmation").click(function () {
            $.cookie('cookie-notification', "ACCEPTED", {path: '/'});
            $(this).closest(".cookienotification-page").remove();
        });
    },
    readMode: function () {
        $('.cookienotification-page a.read-more').magnificPopup({
            type: 'inline',
            midClick: true,
            mainClass: "mfp-fade",
            callbacks: {
                open: function () {
                    $("#privaciyPolicy.privacy-policy").parent().css("height", "100%")
                }
            }
        });
    }
};