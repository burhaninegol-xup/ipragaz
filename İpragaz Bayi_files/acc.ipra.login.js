ACC.ipraLogin = {
    _autoload: [
        "loadEvents",
        "bindDealerLogin"
    ],
    loadEvents: function () {
        $(".accountLoginPage-page .siteLogin-tag .sendCodeButton, .header__user-wrapper #ipragazLoginForm.miniLogin .sendCodeButton,.checkoutReturningCustomerLogin-page .login.form-box .js-login").click(function (e) {
            e.preventDefault();

            var currentElement = $(this);
            var form = currentElement.closest("form");
            var formClass = "form#" + form.attr("id") + "." + form[0].className.replace(/ /g, '.');
            var phone = form.find("input[name='j_phone']");

            var code = form.find("input[name='j_code']");
            ACC.ipraMisc.errorMessage.removeErrorMessagesForForm(form);
            var phoneNumberIsValid = ACC.ipraValidator.phoneValidator(phone.val());
            if (!phoneNumberIsValid) {
                ACC.ipraMisc.errorMessage.createErrorMessageForForm(phone);
                return;
            }

            ACC.ipraMisc.disabled.addDisabledFormInput(phone);
            if (currentElement.hasClass("verificationOtpCode")) {
                var data = {
                    j_phone: ACC.ipraRegex.replaceSpace(phone.val()),
                    j_code: code.val(),
                    CSRFToken: ACC.config.CSRFToken
                };
                ACC.ipraApiservice.postResponse(formClass, "/login/check-otp", data, false).promise().done(function (res) {
                    console.log(res);
                    if (res.success === true) {
                        ACC.ipraMisc.disabled.addDisabledFormInput(code);
                        phone.val(ACC.ipraRegex.replaceSpace(phone.val()));
                        phone.prop('disabled', false);
                        form.submit();
                        return;
                    } else {
                        return;
                    }
                });
            }
            if (!currentElement.hasClass("verificationOtpCode")) {
                currentElement.prop('disabled', true);

                var data = {phone: ACC.ipraRegex.replaceSpace(phone.val()), CSRFToken: ACC.config.CSRFToken};

                ACC.ipraApiservice.postResponse(".siteLogin-tag form#ipragazLoginForm", "/login/genereateCode", data, false).promise().done(function (res) {
                    console.log(res);
                    if (res.success === true) {
                        ACC.ipraLoginTimer.loginTimer.startTimer(formClass, 3, true);
                        currentElement.closest("form").find(".otpCodeInputBox").removeClass("display-none");
                        currentElement.html(ACC.messages.VerifyCode);
                        currentElement.addClass("verificationOtpCode");
                        currentElement.prop('disabled', false);
                    } else {
                        currentElement.prop('disabled', false);
                        ACC.ipraMisc.disabled.removeDisabledFormInput(phone);
                    }
                });
            }
        });

        $(".accountLoginPage-page .siteRegister-tag .createUserButton,.checkoutReturningCustomerLogin-page .register.form-box .js-register").click(function (e) {
            e.preventDefault();
            var currentElement = $(this);

            var form = currentElement.closest("form");
            var formClass = "form#" + form.attr("id") + "." + form[0].className.replace(/ /g, '.');
            var name = form.find("input[name='name']");
            var phone = form.find("input[name='j_phone']");
            var savePersonalData = form.find("input[name='savePersonalData']").is(":checked");
            var wantSms = form.find("input[name='wantSms']").is(":checked");
            var j_code = form.find("input[name='j_code']");
            if (currentElement.hasClass("verificationOtpCode")) {
                var data = {
                    name: name.val(),
                    j_phone: ACC.ipraRegex.replaceSpace(phone.val()),
                    savePersonalData: savePersonalData,
                    wantSms: wantSms,
                    j_code: j_code.val(),
                    CSRFToken: ACC.config.CSRFToken
                };
                ACC.ipraApiservice.postResponse(formClass, "/register/new-customer", data, false).promise().done(function (res) {
                    console.log(res);
                    if (res.success === true) {
                        phone.val(ACC.ipraRegex.replaceSpace(phone.val()));
                        name.prop('disabled', false);
                        phone.prop('disabled', false);
                        form.submit();
                        return;
                    } else {
                        return;
                    }
                });
            }
            if (!currentElement.hasClass("verificationOtpCode")) {
                ACC.ipraMisc.disabled.addDisabledFormInput(phone);
                ACC.ipraMisc.disabled.addDisabledFormInput(name);
                var data = {
                    name: name.val(),
                    phone: ACC.ipraRegex.replaceSpace(phone.val()),
                    CSRFToken: ACC.config.CSRFToken
                };
                ACC.ipraApiservice.postResponse(formClass, "/login/register", data, false).promise().done(function (res) {
                    console.log(res);
                    if (res.success === true) {
                        phone.prop('disabled', true);
                        name.prop('disabled', true);
                        form.find("input[name='j_code']").val("");

                        ACC.ipraLoginTimer.loginTimer.startTimer(formClass, 3, false);
                        currentElement.closest("form").find(".otpCodeInputBox").removeClass("display-none");
                        currentElement.addClass("verificationOtpCode");
                        form.find("input[name='j_code']").val("");
                    } else {
                        ACC.ipraMisc.disabled.removeDisabledFormInput(phone);
                        ACC.ipraMisc.disabled.removeDisabledFormInput(name);
                    }
                });
            }
        });

        $(".js-guest-login").click(function (e) {
            e.preventDefault();
            var currentElement = $(this);
            var form = currentElement.closest("form");
            var formClass = "form#" + form.attr("id") + "." + form[0].className.replace(/ /g, '.');
            ACC.ipraApiservice.postResponse(formClass, "/login/checkout/guest/control", form.serialize(), false).promise().done(function (res) {
                console.log(res);
                if (res.success === true) {
                    form.submit();
                    return;
                } else {
                    return;
                }
            });
        });
    },

    bindDealerLogin: function(){
        $('.js-dealer-login-form-container form').find('input[name="pwd"],input[name="checkPwd"]').attr('placeholder',' ');
        $('.open-popup-link').magnificPopup({
            type: 'inline',
            midClick: true,
            mainClass: 'mfp-fade',
        });

    },

    bindDealerFormValidation: function(){
        $('input.isNumeric').bind('keyup paste', function () {
            this.value = this.value.replace(/[^0-9]/g, '')
        });

        $(document).on("click","#dealerAgreement .btn",function(e){
            e.preventDefault();
            $('input[name=dealerTerm]').prop("checked",true);
            $.magnificPopup.close();
        });

        $('#ipragazB2BUpdatePwdForm #checkPassword, #ipragazB2BUpdatePwdForm #password').on('input',function(){
            $(this).closest('.input-group').find('.form-control').removeClass('error');
            $(this).closest('.input-group').find('.helper-text').remove();
            if($('#ipragazB2BUpdatePwdForm #password').val() == $('#ipragazB2BUpdatePwdForm #checkPassword').val()){
                $('.input-group').find('.helper-text').remove();
                $('.input-group').find('.form-control').removeClass('error');
            }
        });

        $('#ipragazB2BUpdatePwdForm #checkPassword').on('input',function(){
            if($('#ipragazB2BUpdatePwdForm #password').val() != $('#ipragazB2BUpdatePwdForm #checkPassword').val()){
                    $('#ipragazB2BUpdatePwdForm #checkPassword').closest('.input-group').find('.helper-text').remove();
                    $('#ipragazB2BUpdatePwdForm #checkPassword').closest('.form-control').addClass('error').after('<span class="helper-text error">Şifreler uyuşmamaktadır</span>');
            }
        });

        $('input[name=dealerTerm]').on('change',function(){
            if($(this).prop('checked')){
                $('input[name=dealerTerm]').closest('.checkox-group').find('.helper-text').remove();
            }
        });

        $('.phone-checkox-group input[type=checkbox]').on('change',function(){
            if($(this).prop('checked')){
                $(this).closest('.phone-checkox-group').find('.helper-text').remove();
            }
        });
    },

    dealerSubmitLogin: function(){
        var _return = true;
        if($('#ipragazB2BUpdatePwdForm #password').val() != $('#ipragazB2BUpdatePwdForm #checkPassword').val()){
            $('#ipragazB2BUpdatePwdForm #checkPassword').closest('.input-group').find('.helper-text').remove();
            $('#ipragazB2BUpdatePwdForm #checkPassword').closest('.form-control').addClass('error').after('<span class="helper-text error">Şifreler uyuşmamaktadır</span>');
            _return = false;
        }
        if ($('input[name=dealerTerm]').length > 0){
            if(!$('input[name=dealerTerm]').prop("checked")){
                $('input[name=dealerTerm]').closest('.checkox-group').find('.helper-text').remove();
                $('input[name=dealerTerm]').closest('.checkbox-control').after('<span style="margin-top:10px;" class="helper-text error">Bayilik sözleşmesini onaylamanız gerekmektedir.</span>');
                _return = false;
            }
        }

        if($('.phone-checkox-group input[type=checkbox]').length > 0){
            $('.phone-checkox-group input[type=checkbox]').each(function(){
                if(!$(this).prop("checked")){
                    $(this).closest('.phone-checkox-group').find('.helper-text').remove();
                    $(this).closest('.phone-checkox-group').append('<span style="margin-top:25px;" class="helper-text error">Telefon numarasının size ait olduğunu onaylamanız gerekmektedir.</span>')
                    _return = false;
                }
            });
        }

        return _return;
    }

};


$(document).ready(function () {
    if($('.js-dealer-login-form-container').length>0){
        ACC.ipraLogin.bindDealerLogin();
        ACC.ipraLogin.bindDealerFormValidation();
    }
})
