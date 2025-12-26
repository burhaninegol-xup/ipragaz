ACC.ipraAddress = {
    _autoload: [
        'addOrEditAddressPopup',
        'setDefaultAddress',
        'deleteAddressPopup'
    ],
    addOrEditAddressPopup: function () {
        if ($('.js-address-popup').length > 0) {
            var addressForm = $(".ipragazAddressFormSelectorPopup-tag .modal__content form");
            var county = addressForm.find('[name="county"]');
            var neighborhood = addressForm.find('[name="neighborhood"]');
            var street = addressForm.find('[name="street"]');
            var addressIdHidden = addressForm.find('input[name="addressId"]');

            ACC.magnificPopup = $('.js-address-popup').magnificPopup({
                type: 'inline',
                midClick: true,
                mainClass: "mfp-fade",
                callbacks: {
                    open: function (e) {
                        var currentPopup = $(this.currItem.el[0]);
                        addressForm[0].reset();

                        ACC.ipraMisc.selectBoxSetDefault(county);
                        ACC.ipraMisc.disabled.addDisabledFormInput(county);
                        ACC.ipraMisc.selectBoxSetDefault(neighborhood);
                        ACC.ipraMisc.disabled.addDisabledFormInput(neighborhood);
                        ACC.ipraMisc.selectBoxSetDefault(street);
                        ACC.ipraMisc.disabled.addDisabledFormInput(street);

                        if (currentPopup.data().addressId !== undefined) {
                            addressIdHidden.val(currentPopup.data().addressId);
                            addressForm.attr('action', addressForm.data().editUrl);
                            var params = {addressCode: currentPopup.data().addressId, CSRFToken: ACC.config.CSRFToken};
                            ACC.ipraAddress.getAddressById(addressForm, params);
                        } else {
                            addressForm.find('select').trigger('change', 'onLoad');
                        }
                    },
                    close: function () {
                        addressIdHidden.val('');
                    }
                }
            });
            ACC.ipraAddress.addNewAddress(addressForm);
        }
    },
    deleteAddressPopup: function () {
        if ($('.js-address-delete-popup').length > 0) {
            ACC.magnificPopup = $('.js-address-delete-popup').magnificPopup({
                type: 'inline',
                midClick: true,
                mainClass: "mfp-fade",
                callbacks: {
                    open: function (e) {
                        var currentPopup = $(this.currItem.el[0]);
                        console.log(currentPopup);
                        $(".ipragazAddressFormSelectorPopup-tag.removeAddressModal .js-removeAddress").off();
                        $(".ipragazAddressFormSelectorPopup-tag.removeAddressModal .js-removeAddress").click(function () {
                            ACC.ipraAddress.removeAddress(currentPopup.data().addressId);
                        })
                    },
                    close: function () {
                    }
                }
            });
        }
    },
    getAddressById: function (addressForm, params) {
        $.get("/my-account/edit-address", params, function (res) {
            var address = {
                addressTitle: res.addressTitle,
                cityCode: res.city.isocode,
                countyCode: res.county.isocode,
                neighborhoodCode: res.neighborhood.isocode,
                streetCode: res.street.isocode,
                line1: res.line1 == null ? "" : res.line1,
                line2: res.line2 == null ? "" : res.line2
            };
            ACC.ipraAddress.addressTrigger(addressForm, address);
        });
    },
    addNewAddress: function (addressForm) {
        $(".ipragazAddressFormSelectorPopup-tag button.js-addOrEditAddress").click(function (e) {
            e.preventDefault();
            var currentElem = $(this);
            if (currentElem.hasClass('ipragaz-loading-button')){
                return;
            }
            ACC.ipraMisc.loadingButton.start(currentElem);
            ACC.ipraApiservice.postResponse(
                ".ipragazAddressFormSelectorPopup-tag .modal__content form",
                addressForm.attr("action"),
                addressForm.serialize()).promise().done(function (res) {
                ACC.ipraMisc.loadingButton.end(currentElem);
            });
        });
    },
    removeAddress: function (addressId) {
        var url = "/my-account/remove-address/" + addressId;
        var data = {CSRFToken: ACC.config.CSRFToken}
        ACC.ipraApiservice.postResponse(
            ".ipragazAddressFormSelectorPopup-tag",
            url, data).promise().done(function (res) {
            console.log(res);
        });
    },
    setDefaultAddress: function () {

        var county = $("select[name='county']");
        var neighborhood = $("select[name='neighborhood']");
        var street = $("select[name='street']");
        var address = $("input[name='line1']");

        $(document).on("change", "select[name='city']", function (e, data) {
            neighborhood.prop('disabled', true);
            street.prop('disabled', true);
            address.closest("div.form-control").addClass('disabled');
            address.prop('disabled', true);

            if (!ACC.ipraValidator.isNullOrEmpty(data)) {
                return;
            }

            ACC.ipraMisc.selectBoxSetDefault(county);
            ACC.ipraMisc.selectBoxSetDefault(neighborhood);
            ACC.ipraMisc.selectBoxSetDefault(street);

            var cityCode = $(this).val();
            ACC.ipraMisc.getCounties(cityCode).promise().done(function (res) {
                var options = ACC.ipraMisc.createOption(res, "isocode", "name");
                county.append(options);
                county.prop('disabled', false);
                ACC.ipraMisc.disabled.removeDisabledFormInput(county);
            });
        });

        $(document).on("change", "select[name='county']", function (e, data) {
            var currentElem = $(this);
            street.prop('disabled', true);

            if (!ACC.ipraValidator.isNullOrEmpty(data)) {
                return;
            }

            if (!ACC.ipraValidator.isNullOrEmpty(data) || neighborhood.length == 0) {
                if (!currentElem.hasClass("dontCallEvent")) {
                    ACC.ipraAddress.changeSession(county);
                }
                return;
            }

            ACC.ipraMisc.selectBoxSetDefault(neighborhood);
            ACC.ipraMisc.selectBoxSetDefault(street);

            ACC.ipraMisc.getNeighborhoods($(this).val()).promise().done(function (res) {
                var options = ACC.ipraMisc.createOption(res, "isocode", "name");
                neighborhood.append(options);
                neighborhood.prop('disabled', false);
                ACC.ipraMisc.disabled.removeDisabledFormInput(neighborhood);
            });
        });

        $(document).on("change", "select[name='neighborhood']", function (e, data) {
            if (!ACC.ipraValidator.isNullOrEmpty(data)) {
                return;
            }
            street.prop('disabled', false);

            ACC.ipraMisc.selectBoxSetDefault(street);
            ACC.ipraMisc.getStreets($(this).val()).promise().done(function (res) {
                var options = ACC.ipraMisc.createOption(res, "isocode", "name");
                street.append(options);
                ACC.ipraMisc.disabled.removeDisabledFormInput(street);
            });
        });

        if (address.length > 0) {
            $(document).on("change", "select[name='street']", function (e, data) {
                e.preventDefault();
                if (!ACC.ipraValidator.isNullOrEmpty(data)) {
                    return;
                }
                address.closest("div.form-control").removeClass('disabled');
                address.prop('disabled', false);
            });
        }

        // function changeSession() {
        //     var countyCode = county.val();
        //     if (ACC.config.clientInfo.address.countyCode == countyCode)
        //         return;
        //     var data = {countyCode: countyCode, CSRFToken: ACC.config.CSRFToken};
        //     $.post("/misc/updateLocation", data, function (res) {
        //         if (res === true) {
        //             alert('Konum guncellendi');
        //             window.location.reload();
        //         }
        //     });
        // }

        this.getDefaultAddressInfo();

    }, getDefaultAddressInfo: function () {
        var city = $("select[name='city']");
        var county = $("select[name='county']");
        var neighborhood = $("select[name='neighborhood']");
        var street = $("select[name='street']");

        if (city.length == 0) {
            return;
        }
        if (ACC.ipraValidator.isNullOrEmpty(ACC.config.clientInfo.address.cityCode)) {
            return;
        }

        var clientAddress = ACC.config.clientInfo.address;
        var cityCode = clientAddress.cityCode;
        if (ACC.ipraValidator.isNullOrEmpty(city.val()) && !ACC.ipraValidator.isNullOrEmpty(cityCode)) {
            city.val(cityCode);
            city.trigger("change", 'onLoad');
        }
        var countyCode = clientAddress.countyCode;
        ACC.ipraMisc.getCounties(cityCode).promise().done(function (res) {
            var options = ACC.ipraMisc.createOption(res, "isocode", "name");
            county.append(options);
            county.val(countyCode);
            county.trigger('change', 'onLoad');
            county.prop('disabled', false);
            ACC.ipraMisc.disabled.removeDisabledFormInput(county);
            neighborhood.prop('disabled', false);
            if (!ACC.ipraValidator.isNullOrEmpty(countyCode) && neighborhood.length > 0) {
                ACC.ipraMisc.getNeighborhoods(countyCode).promise().done(function (res) {
                    var options = ACC.ipraMisc.createOption(res, "isocode", "name");
                    neighborhood.append(options);
                    neighborhood.prop('disabled', false);
                    street.prop('disabled', false);
                    ACC.ipraMisc.disabled.removeDisabledFormInput(street);
                })
            }
        });
    }, addressTrigger: function (addressForm, address) {
        var addressTitle = addressForm.find('input[name="addressTitle"]');
        var city = addressForm.find('select[name="city"]');
        var county = addressForm.find('select[name="county"]');
        var neighborhood = addressForm.find('select[name="neighborhood"]');
        var street = addressForm.find('select[name="street"]');
        var addressLine1 = addressForm.find('input[name="line1"]');

        addressTitle.val(address.addressTitle);
        city.val('');
        county.val('');
        neighborhood.val('');
        street.val('');
        addressLine1.val('');

        city.val(address.cityCode);
        city.trigger('change', 'onLoad');

        ACC.ipraMisc.getCounties(address.cityCode).promise().done(function (res) {
            var options = ACC.ipraMisc.createOption(res, "isocode", "name");
            county.append(options);
            county.val(address.countyCode);
            county.trigger('change', 'onLoad');
            county.prop('disabled', false);
            ACC.ipraMisc.disabled.removeDisabledFormInput(county);
            if (!ACC.ipraValidator.isNullOrEmpty(address.countyCode) && address.neighborhoodCode !== undefined) {
                ACC.ipraMisc.getNeighborhoods(address.countyCode).promise().done(function (res) {
                    var options = ACC.ipraMisc.createOption(res, "isocode", "name");
                    neighborhood.append(options);
                    neighborhood.val(address.neighborhoodCode);
                    neighborhood.trigger('change', 'onLoad');
                    neighborhood.prop('disabled', false);
                    ACC.ipraMisc.disabled.removeDisabledFormInput(neighborhood);
                    ACC.ipraMisc.getStreets(address.neighborhoodCode).promise().done(function (res) {
                        var options = ACC.ipraMisc.createOption(res, "isocode", "name");
                        street.append(options);
                        street.val(address.streetCode);
                        street.trigger('change', 'onLoad');
                        street.prop('disabled', false);
                        addressLine1.val(address.line1 + address.line2);
                        addressLine1.closest("div.form-control").removeClass('disabled');
                        addressLine1.prop('disabled', false);
                        street.prop('disabled', false);
                        ACC.ipraMisc.disabled.removeDisabledFormInput(street);
                    })
                })
            }
        });
    },
    changeSession: function (countyObj) {
        var countyCode = countyObj.val();
        if (ACC.config.clientInfo.address.countyCode == countyCode)
            return;
        var data = {countyCode: countyCode, CSRFToken: ACC.config.CSRFToken};
        $.post("/misc/updateLocation", data, function (res) {
            if (res === true) {
                // alert('Konum guncellendi');
                window.location.reload();
            }
        });
    }
};