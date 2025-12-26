ACC.ipraMisc = {
    loadingButton: {
        start: function (button) {
            var button = $(button);
            if (!button.hasClass('ipragaz-loading-button')) {
                button.addClass('ipragaz-loading-button');
                button.attr('data-loading-before-text', button.text());
                button.text('');
                button.prop('disabled', true);
                button.append('<img src="/_ui/responsive/common/images/3dots.gif"/>');
            }
        },
        end: function (button) {
            var button = $(button);
            button.removeClass('ipragaz-loading-button');
            button.find('img').remove();
            button.text(button.data().loadingBeforeText);
            button.prop('disabled', false);
        }
    },
    findKeysForObject: function (obj) {
        var keys = [];
        for (var key in obj) {
            keys.push(key);
        }
        return keys;
    },
    setInputs: function (formIdOrClass, obj) {
        var keys = ACC.ipraMisc.findKeysForObject(obj);
        var form = $(formIdOrClass);
        $.each(keys, function (index, key) {
            var input = form.find('[name="' + key + '"]');
            input.val(obj[key]);
            var inputName = input.attr('name');
            if (inputName == 'phone' || inputName == 'uid') {
                input.trigger('input');
            }
        });
    },
    createOption: function (list, key, value) {
        var options = [];
        list.map(function (item) {
            options.push(new Option(item[value], item[key]));
        });
        return options;
    },
    selectBoxAppendOption: function (obj, optionlist, firstOption) {
        //obj is selectectBox Element
        //firstOtion is Element
        if (firstOption.length > 0)
            optionlist.unshift(firstOption);
        obj.append(optionlist);
    },
    selectBoxSetDefault: function (obj) {
        //obj is selectectBox Element
        var firstOption = obj.find('option').first();
        obj.find('option').remove();
        if (firstOption.length > 0)
            obj.append(firstOption);
        obj.val(null);
    },
    getCities: function (countryCode) {
        var url = '/misc/getCitiesByCountryCode?countryCode=' + countryCode;
        return ACC.ipraApiservice.get(url);
    },
    getCounties: function (cityCode) {
        var url = '/misc/getCountiesByCityCode?cityCode=' + cityCode;
        return ACC.ipraApiservice.get(url);
    },
    getNeighborhoods: function (countyCode) {
        var url = '/misc/getNeighborhoodsByCountyCode?countyCode=' + countyCode;
        return ACC.ipraApiservice.get(url);
    },
    getStreets: function (neighborhoodCode) {
        var url = '/misc/getStreetsByNeighborhoodCode?neighborhoodCode=' + neighborhoodCode;
        return ACC.ipraApiservice.get(url);
    },
    cookie: {
        setCookie: function (cname, cvalue, exdays) {
            var d = new Date();
            d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
            var expires = "expires=" + d.toUTCString();
            document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
        },
        getCookie: function (cname) {
            var name = cname + "=";
            var ca = document.cookie.split(';');
            for (var i = 0; i < ca.length; i++) {
                var c = ca[i];
                while (c.charAt(0) == ' ') {
                    c = c.substring(1);
                }
                if (c.indexOf(name) == 0) {
                    return c.substring(name.length, c.length);
                }
            }
            return "";
        }
    },
    successMessage: {
        clearMessInterval: undefined,
        //info,success,danger,warning
        globalMessage: function (messageType, message) {
            var alertBox = $(".ipragaz.alert");
            if ($.magnificPopup.instance.isOpen === true) {
                alertBox.css({'z-index': '9999999999999', 'top': $(window).scrollTop()});
            }
            if (this.clearMessInterval != undefined) {
                clearInterval(this.clearMessInterval)
            }

            alertBox.addClass('alert--' + messageType + ' opened');
            alertBox.find('.alert-text').html(message);
            alertBox.find('.alert-icon img').attr("src", '/_ui/responsive/common/images/alert-' + messageType + '.svg');
            this.clearMessInterval = setTimeout(function () {
                alertBox.removeClass('alert--' + messageType + ' opened');
                if ($.magnificPopup.instance.isOpen === true) {
                    alertBox.removeAttr('style');
                }
            }, 3000);
        }
    },
    errorMessage: {
        createCustomMessage: function (input, errorMessage) {
            var errorMessageHtml = '<span class="helper-text error">' + errorMessage + '</span>';
            $(input).after(errorMessageHtml);
        },
        removeErrorMessagesForForm: function (form) {
            $(form).find('span.helper-text').remove();
            $(form).find('.form-control.error').removeClass("error");
            $(form).find('.radio-control.error').removeClass("error");
            $(form).find('.checkbox-control.error').removeClass("error");
        },
        createErrorMessageForForm: function (input, errorMessage) {
            $(input).closest(".form-control").addClass("error");
            $(input).addClass("error");

            if (ACC.ipraValidator.isNullOrEmpty(errorMessage)) {
                errorMessage = ACC.messages.ValidationMessage;
            }
            $(input).closest(".form-control").after('<span class="helper-text error">' + errorMessage + '</span>');
        },
        createResponseErrorMessages: function (formIdOrClass, errors) {
            ACC.ipraMisc.errorMessage.removeErrorMessagesForForm(formIdOrClass);
            $(formIdOrClass + " .form-control.error").removeClass("error");
            $.each(errors, function (index, item) {
                var errorMessage = ACC.ipraValidator.isNullOrEmpty(item.code) ? item.defaultMessage : item.code;
                var input = $(formIdOrClass + " [name='" + item.field + "']");
                var errorMessageHtml = '<span class="helper-text error">' + errorMessage + '</span>';
                if (input.length > 1) {
                    $.each(input, function (inputIndex, inputItem) {
                        var inputItem = $(inputItem);
                        var formControl = inputItem.closest(".form-control");
                        if (formControl.length > 0) {
                            formControl.addClass("error");
                            formControl.after();
                            return;
                        }

                        var checkboxForm = input.closest(".checkbox-control");
                        if (checkboxForm.length > 0) {
                            checkboxForm.addClass("error");
                            checkboxForm.after(errorMessageHtml);
                            return;
                        }

                        var radioControl = inputItem.closest(".radio-control");
                        if (radioControl.length > 0) {
                            radioControl.addClass("error");
                            radioControl.after(errorMessageHtml);
                            return;
                        }

                        inputItem.after(errorMessageHtml);

                    });
                } else {
                    var formControl = input.closest(".form-control");
                    if (formControl.length > 0) {
                        formControl.addClass("error");
                        formControl.after(errorMessageHtml);
                        return;
                    }

                    var checkboxForm = input.closest(".checkbox-control");
                    if (checkboxForm.length > 0) {
                        checkboxForm.addClass("error");
                        checkboxForm.after(errorMessageHtml);
                        return;
                    }
                    input.after(errorMessageHtml);
                }
            });
        }
    },
    disabled: {
        removeDisabledFormInput: function (input) {
            $(input).closest(".form-control").removeClass("disabled");
            // $(input).prop('disabled', false);
        },
        addDisabledFormInput: function (input) {
            $(input).closest(".form-control").addClass("disabled");
            // $(input).prop('disabled', true);
        }
    },
    animateFocusElement: function (focusElementIdOrClass, speed) {
        if (ACC.ipraValidator.isNullOrEmpty(speed)) {
            speed = 1500;
        }
        $('html,body').animate({
            scrollTop: $(focusElementIdOrClass).offset().top - 50
        }, speed);
    }
};