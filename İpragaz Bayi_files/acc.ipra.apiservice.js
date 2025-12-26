ACC.ipraApiservice = {
    get: function (url) {
        return $.get(url);
    },
    post: function (url, params) {
        return $.post(url, params);
    },
    postResponse: function (formIdOrClass, url, params, isPopup) {
        ACC.ipraMisc.errorMessage.removeErrorMessagesForForm(formIdOrClass);
        return $.post(url, params, function (res) {
            if (res.success === true) {
                $('.js-address-popup').magnificPopup('close');
                if (!ACC.ipraValidator.isNullOrEmpty(res.message)) {
                    ACC.ipraMisc.successMessage.globalMessage("success", res.message);
                }

                if (ACC.ipraValidator.isNullOrEmpty(isPopup))
                    isPopup = true;


                if (!ACC.ipraValidator.isNullOrEmpty(res.redirectUrl)) {
                    setTimeout(function () {
                        window.location = res.redirectUrl;
                    }, 2000);
                } else {
                    if (isPopup === true) {
                        setTimeout(function () {
                            window.location.reload();
                        }, 2000);
                    }
                }
            } else {
                ACC.ipraMisc.errorMessage.createResponseErrorMessages(formIdOrClass, res.errors);
                if (!ACC.ipraValidator.isNullOrEmpty(res.message)) {
                    ACC.ipraMisc.successMessage.globalMessage("danger", res.message)
                }
            }
        });
    },
    getGoogleMapAddress: function (lat, lng) {
        var url = "https://maps.googleapis.com/maps/api/geocode/json?latlng=" + lat + "," + lng + "&key=AIzaSyAkC1NPlg0ntwEoQNSlTPMWZicw6IZVIZ8";
        return $.get(url, function (res) {
            console.log(res.results[0].address_components);
            // console.log(res);
        })
    }
};