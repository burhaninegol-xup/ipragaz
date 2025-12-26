ACC.ipraDealerLogin = {
    el: {
        dealerLoginBtn: '.js-dealer-btn-login',
        dealerLoginVerifyBtn: '.js-login-otp-verify'
    },
    init: function () {
        var _dealerLogin = ACC.ipraDealerLogin;
        _dealerLogin.events.login()
    },
    events: {
        login: function () {

            document.getElementById('j_otp').addEventListener('keydown', function (event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                }
            });
            var _dealerLogin = ACC.ipraDealerLogin;
            $(_dealerLogin.el.dealerLoginBtn).on('click', function () {
                var _t = $(this);
                $(".lds-css").css({ background: 'black', opacity: '0.5' }).show();
                var _userName = _t.closest('#loginForm').find('[name="j_username"]').val();
                var _pass = _t.closest('#loginForm').find('[name="j_password"]').val();
                var _url = "/bayi/login/user-check?username=" + _userName + "&pass=" + _pass;
                var _params = {"CSRFToken": ACC.config.CSRFToken};
                ACC.ipraApiservice.postResponse("#loginForm", _url, _params, false).promise().done(function (res) {
                    if (res.success) {
                        if (res.firstPwd === true) {
                            $('#loginForm').submit();
                        } else {
                            $(".lds-css").hide();
                            $('.portal__card.login-section').addClass('display-none');
                            $('.portal__card.login-section-otp').removeClass('display-none');
                            $(_dealerLogin.el.dealerLoginVerifyBtn).on('click', function () {
                                var _otp = $(this).closest('#loginOtpForm').find('[name="j_otp"]').val();
                                var _otpUrl = "/bayi/login/check-otp?username=" + _userName + "&pass=" + _pass + "&otp=" + _otp + '&isMobile=false';
                                ACC.ipraApiservice.postResponse("#loginOtpForm", _otpUrl, _params, false).promise().done(function (res) {
                                    if (res.success) {
                                        if (!ACC.ipraValidator.isNullOrEmpty(res.redirectUrl)) {
                                            setTimeout(function () {
                                                window.location.href = res.redirectUrl;
                                            }, 3000);
                                        }else {
                                            window.location.href = "/bayi";
                                        }
                                    } else {
                                        if (!ACC.ipraValidator.isNullOrEmpty(res.redirectUrl)) {
                                            setTimeout(function () {
                                                window.location.href = res.redirectUrl;
                                            }, 3000);
                                        }
                                    }
                                });
                            });
                        }

                    }else{
                        $(".lds-css").hide();
                    }
                });
            });
        }
    }
};

$(document).ready(function () {
    with (ACC.ipraDealerLogin) {
        init();
    }
});