ACC.ipraForgettenPassword = {
    sendMail: function () {
        $(".forgotPassword-page .js-forgotPassword").click(function (e) {
            e.preventDefault();
            var form = $(this).closest('form');
            ACC.ipraApiservice.postResponse(".forgotPassword-page form.forgottenPasswordForm", form.attr('action'), form.serialize(), false).promise().done(function (res) {
            });
        })
    }
};
$(document).ready(function () {
    with (ACC.ipraForgettenPassword) {
        sendMail();
    }
});