ACC.ipraOrders = {
    // _autoload: ['getCouriers'],
    filter: function () {

        var b2bmyordersDate = $('#b2bmyordersdatetimes').val();
        if(b2bmyordersDate){
            var baseOrigin = window.location.origin;
            var basePath = window.location.pathname;
            var baseUrl = baseOrigin + basePath;
            window.location.href =baseUrl + "?date=" + b2bmyordersDate;
        }else{
            var selectedDate = $(".order-page [name='datetimes']").val();
            if ($(".orders__nav ul li.active a").length === 0){
                var pageTitle = $('.report-page').data('pageTitle');
                var selectedDate = $(".report-page [name='datetimes']").val().split('-');
                var startDate = selectedDate[0];
                var endDate = selectedDate[1];
                if(pageTitle.indexOf('CourierSales ') >= 0){
                    $('.employee-sales-list tbody').empty();
                    var _url = $('.courier-sales').data('url');
                    var params1 = {startDate: startDate.trim().replaceAll('/','-'), endDate: endDate.trim().replaceAll('/','-'), CSRFToken: ACC.config.CSRFToken};
                    ACC.ipraApiservice.post(_url, params1).promise().done(function (res) {
                        $('.employee-sales-list thead').removeClass('display-none');
                        res.map(function (item) {
                            var code = '<tr>\n' +
                                '<td>' + item.name + '</td>\n' +
                                '<td>' + item.phone + '</td>\n' +
                                '<td>' + item.orderCount + '</td>\n' +
                                '</tr>';

                            $('.employee-sales-list tbody').append(code)
                        })

                    });
                }
                if(pageTitle.indexOf('Online Payment Sales') >= 0 || pageTitle.indexOf('Online Ödeme Satış') >= 0){
                    $('.online-transaction-list tbody').empty();
                    var _url2 = $('.online-transaction').data('url');
                    var params2 = {startDate: startDate.trim().replaceAll('/','-'), endDate: endDate.trim().replaceAll('/','-'), CSRFToken: ACC.config.CSRFToken};
                    ACC.ipraApiservice.post(_url2,params2).promise().done(function (res) {
                        $('.online-transaction-list thead').removeClass('display-none');
                        res.map(function (item) {
                            var code = '<tr>\n' +
                                '<td>' + item.orderDate + '</td>\n' +
                                '<td>' + item.orderNumber + '</td>\n' +
                                '<td>' + item.status + '</td>\n' +
                                '<td>' + item.phoneNumber + '</td>\n' +
                                '<td>' + item.name + '</td>\n' +
                                '<td>' + item.cardFamily + '</td>\n' +
                                '<td>' + item.installment + '</td>\n' +
                                '<td>' + item.paymentStatus + '</td>\n' +
                                '<td>' + item.paidPrice + '</td>\n' +
                                '<td>' + item.commissionAmount + '</td>\n' +
                                '<td>' + item.commissionFee + '</td>\n' +
                                '</tr>';

                            $('.online-transaction-list tbody').append(code)
                        })
                    })
                }

            }else{
                window.location.href = $(".orders__nav ul li.active a").attr("href") + "?date=" + selectedDate;
            }
        }


    },
    filterOnLoad: function () {
        $('.order-page select[name="selectBoxOrderStatus"]').change(function (e) {
            e.preventDefault();
            var currentElem = $(this);
            var selectedOption = currentElem.find('option:selected');
            window.location = $(selectedOption).data('href');
        })
    },
    returnProcess: function(){

        $('.return-process-step').closest('.delivery__button').css('justify-content','end');

        $(".order-page .js-return-process").magnificPopup({
            removalDelay: 500,
            callbacks: {
                beforeOpen: function () {
                    this.st.mainClass = this.st.el.attr("data-effect");
                },
                open: function () {
                    var currentElem = $(this.currItem.el[0]);
                }
            },
            midClick: true
        });

        $(".js-confirm-return").click(function () {

            $(this).css({"cursor" : "no-drop", "opacity" : "0.5" });
            $(this).prop('disabled', true);

            var form = $("#return-process form#return-process-popup-form");
            form.find('[type="hidden"][name="code"]').val($('.js-return-process').data('orderCode'));
            ACC.ipraApiservice.postResponse(form, form.attr('action'), form.serialize()).promise().done(function (res) {
            });

        });
    },
    getCouriers: function () {


        $(".order-page .js-assign-courier").magnificPopup({
            removalDelay: 500,
            callbacks: {
                beforeOpen: function () {
                    $("#courier-popup form ul").remove();
                    this.st.mainClass = this.st.el.attr("data-effect");
                },
                open: function () {
                    if ($(".delivery__button").is('[disabled=disabled]')) {
                        this.close();
                    }
                    var currentElem = $(this.currItem.el[0]);

                    ACC.ipraApiservice.get("/bayi/tr/b2b/staff-response").promise().done(function (res) {
                        $("#courier-popup form").prepend(res);
                        $("#courier-popup form .js-assign-courier-btn").attr('data-order-code', currentElem.data().orderCode);

                    });
                },
                close: function () {
                    $("#courier-popup button.js-assign-courier-btn").prop('disabled', true);
                }
            },
            midClick: true
        });
    },
    selectCourier: function () {
        $(document).on('change', '#courier-popup ul input[type=radio]', function (e) {
            $("#courier-popup button.js-assign-courier-btn").prop('disabled', false);
        });
    },
    assignCourier: function () {
        $(document).on('click', '.courier-popup #courier-popup-form button.js-assign-courier-btn', function (e) {
            e.preventDefault();
            if (!$(".delivery__button").is('[disabled=disabled]')) {
                var form = $("#courier-popup form#courier-popup-form");

                var code = form.find('input[name="code"][type="hidden"]');
                var uid = form.find('input[name="uid"][type="hidden"]');

                var staffInfo = form.find("input:checked").closest('li').data().value;
                var orderCode = $(this).data().orderCode;

                code.val(orderCode);
                uid.val(staffInfo.uid);
                $(".delivery__button").attr('disabled', true);
                ACC.ipraApiservice.postResponse(".courier-popup form#courier-popup-form", form.attr('action'), form.serialize()).promise().done(function (res) {
                    if (res.success === false) {
                        $(".delivery__button").attr('disabled', false);
                    }
                });



                $(".modal-close").on('click', function (e) {
                    e.preventDefault();

                    $('.open-popup-link').magnificPopup('close');
                })
            }


        });
        $(document).on('click', '.courier-popup #courier-popup-form button.cancel', function (e) {
            e.preventDefault();
            return;

        });
    },
    changeStatus: function () {

        $(".order-page .js-change-status[data-type='UNDELIVERED']").magnificPopup({
            removalDelay: 500,
            callbacks: {
                beforeOpen: function () {

                    this.st.mainClass = this.st.el.attr("data-effect");
                },
                open: function (e) {
                    if ($(".delivery__button").is('[disabled=disabled]')) {
                        this.close();
                    }
                    var currentButton = $(this.currItem.el[0]);
                    $(document).on('click', '.ipragazB2BChangeOrderStatusFormBox button.js-change-status-btn', function (e) {
                        e.preventDefault();
                        if (!$(".delivery__button").is('[disabled=disabled]')) {
                            var form = $(".ipragazB2BChangeOrderStatusFormBox form#ipragazB2BChangeOrderStatusForm");
                            form.find('[type="hidden"][name="code"]').val(currentButton.data().orderCode);
                            form.find('[type="hidden"][name="status"]').val(currentButton.data().type);
                            $(".delivery__button").attr('disabled', true);
                            ACC.ipraApiservice.postResponse(".ipragazB2BChangeOrderStatusFormBox form#ipragazB2BChangeOrderStatusForm", form.attr('action'), form.serialize()).promise().done(function (res) {

                                if (res.success === false) {
                                    $(".delivery__button").attr('disabled', false);
                                }

                                if(res.errors[0].field == "status"){
                                    $.magnificPopup.close();
                                    ACC.ipraMisc.successMessage.globalMessage("success" , res.errors[0].code)
                                    setTimeout(function () {
                                        window.location.reload();
                                    }, 3500);
                                }
                            });

                        }

                    });
                },
                close: function () {
                    $(document).off('click', '.ipragazB2BChangeOrderStatusFormBox button.js-change-status-btn');
                }
            },
            midClick: true
        });

        $(".order-page .js-change-status-btn[data-type='DELIVERED']").click(function (e) {
            e.preventDefault();
            if (!$(".delivery__button").is('[disabled=disabled]')) {
                var currentElem = $(this);
                var brand = currentElem.closest('.order-item__container').find('.brand[name="brand"]');
                var form = $("form#ipragazB2BChangeOrderStatusForm");
                var brandSelected = ACC.brandError;
                form.find('[type="hidden"][name="code"]').val(currentElem.data().orderCode);
                form.find('[type="hidden"][name="status"]').val(currentElem.data().type);
                form.find('[type="hidden"][name="brand"]').val(brand.val());
                $(".delivery__button").attr('disabled', true);
                ACC.ipraApiservice.postResponse(".ipragazB2BChangeOrderStatusFormBox form#ipragazB2BChangeOrderStatusForm", form.attr('action'), form.serialize()).promise().done(function (res) {
                    if (res.success === false) {
                        //ACC.ipraMisc.errorMessage.createCustomMessage(brand, res.message);
                        if(brand.val(brandSelected)) {
                            brand.closest('.form-control').addClass("error");
                            $(".delivery__button").attr('disabled', false);
                        }
                    } else {
                        brand.closest('.form-control').removeClass("error");
                    }

                    if(res.errors[0].field == "status"){
                        brand.closest('.form-control').removeClass("error");
                        ACC.ipraMisc.successMessage.globalMessage("success" , res.errors[0].code)
                        setTimeout(function () {
                            window.location.reload();
                        }, 2500);
                    }
                });

            }

        });
    },
    changeStatusCreditCard: function(){
        $(".order-page .js_inc_question_aggrement").change(function () {
            var _t = $(this);
            var _b = _t.closest('.order-item__container').find('.js-change-status-btn-credit-card');
            var _s = _t.closest('.order-item__container').find("select[name='brand']");
            _b.attr('disabled', !(_t.is(":checked") && _s.val() != ''));
        });

        $(".order-page select[name='brand']").change(function () {

            var _t = $(this);
            var _b = _t.closest('.order-item__container').find('.js-change-status-btn-credit-card');
            if(_t.val() != ''){

                if(_t.closest('.order-item__container').find('.js_inc_question_aggrement').length > 0 && !_t.closest('.order-item__container').find('.js_inc_question_aggrement').prop('disabled')){
                    _b.attr('disabled', !(_t.closest('.order-item__container').find('.js_inc_question_aggrement').is(":checked") && _t.val() != ''));
                }else{
                    _b.removeAttr('disabled');
                }

                $(".order-page .js-change-status-btn-credit-card[data-type='DELIVERED']").magnificPopup({
                    removalDelay: 500,
                    callbacks: {
                        beforeOpen: function () {
                            this.st.mainClass = this.st.el.attr("data-effect");
                        },
                        open: function () {

                            $('#credit-card-popup .verify').off('keyup input');
                            $('.js-credit-card-approve').off('click');
                            $('.js-credit-card-send-again').off('click');

                            var currentElem = $(this.currItem.el[0]);

                            $('#credit-card-popup .verify').on('keyup input', function(){
                                var _t = $(this);
                                if (_t.val().length > 3) {
                                    $('.js-credit-card-approve').attr('disabled', false);
                                } else {
                                    $('.js-credit-card-approve').attr('disabled', true);
                                }
                            });


                            $('.js-credit-card-approve').click(function () {

                                $(this).attr('disabled', true);
                                var inputVerify = $('#credit-card-popup .verify');
                                var orderCode = currentElem.data('orderCode');
                                var form = $("#credit-card-popup form#credit-card-popup-form");
                                form.find('[type="hidden"][name="deliveryVerificationCode"]').val(inputVerify.val());
                                form.find('[type="hidden"][name="orderCode"]').val(orderCode);

                                var formChange = $("form#ipragazB2BChangeOrderStatusForm");
                                formChange.find('[type="hidden"][name="code"]').val(currentElem.data().orderCode);
                                formChange.find('[type="hidden"][name="status"]').val(currentElem.data().type);
                                formChange.find('[type="hidden"][name="brand"]').val(_t.val());

                                ACC.ipraApiservice.postResponse('form#credit-card-popup-form', form.attr('action'), form.serialize()).promise().done(function (res) {
                                    if(res.success){
                                        ACC.ipraApiservice.postResponse(".ipragazB2BChangeOrderStatusFormBox form#ipragazB2BChangeOrderStatusForm", formChange.attr('action'), formChange.serialize()).promise().done(function (res) {
                                            $(this).attr('disabled', false)
                                        });
                                    }else{
                                        $('#credit-card-popup .verify').val('');
                                        $(this).attr('disabled', false)
                                    }
                                });
                            });

                            $('.js-credit-card-send-again').click(function () {

                                var form = $("#credit-card-popup form#credit-card-send-again-popup-form");
                                form.find('[type="hidden"][name="orderCode"]').val($('.js-change-status-btn-credit-card').data('orderCode'));

                                ACC.ipraApiservice.postResponse(form, form.attr('action'), form.serialize()).promise().done(function (res) {

                                });
                                $('#credit-card-popup').magnificPopup('close')
                            });


                        },
                        close: function () {
                            $('#credit-card-popup .verify').val('');
                        }
                    },
                    midClick: true
                });


            }
            else{
                $('#credit-card-popup').magnificPopup('close');
                _b.attr('disabled','disabled');
            }

        });

    },
    deliveredStatus: function () {
        $(".order-page .delivered-status").click(function (e) {
            var url = $(this).attr("data-value");
            var data = {CSRFToken: ACC.config.CSRFToken};
            ACC.ipraApiservice.postResponse(null, url, data, true).promise().done(function (res) {
                console.log(res)
            });
        });
    },
    filterSearch: function () {
        $(document).on('click', ".search .search-text", function () {
            search();
        });
        $(document).on('keypress', ".search .text", function (e) {
            var keycode = (e.keyCode ? e.keyCode : e.which);
            if(keycode == 13) {
                search();
            }
        });

        function search() {
            var searchTextVal = $(".search .text").val();
            if (searchTextVal != null) {
                window.location.href = $(".orders__nav ul li.active a").attr("href") + "?search-text=" + searchTextVal;;
            }
        }
    }
};

$(document).ready(function () {
    with (ACC.ipraOrders) {
        getCouriers();
        selectCourier();
        assignCourier();
        changeStatus();
        deliveredStatus();
        filterOnLoad();
        filterSearch();
        changeStatusCreditCard();
        returnProcess();
    }
});