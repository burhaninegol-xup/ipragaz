var app = {};


$(window).on('load', function () {
    setTimeout(function () {
        $(".lds-css").hide();
    }, 100)


})

$(function () {
    // Wow.js init (eğer kütüphane yüklüyse)
    if (typeof WOW !== 'undefined') {
        new WOW().init();
    }

    $("body").append('<div class="menu-overlay"></div>');

    // Select2 init (eğer kütüphane yüklüyse)
    if (typeof $.fn.select2 !== 'undefined') {
        $(".select2").select2({minimumResultsForSearch: -1});
    }

    // Mobile menu action - devre dışı bırakıldı, yeni sidebar kullanılıyor
    // Eski kod kaldırıldı - baremli-fiyat-tanimla.html'deki yeni mobile-sidebar kullanılıyor

    // Sticky Header
    var header = $("header.header");
    var carousel = $(".main__carousel");
    var carouselHeight = carousel.height();

    // Input focus
    $(".form-control input").focusin(function () {
        $(this)
            .parent()
            .addClass("focused");
    });

    $(".form-control input").focusout(function () {
        $(this)
            .parent()
            .removeClass("focused");
    });

    app.switchButton = function () {
        $(".switch__button .controller").click(function () {
            $(this)
                .parent()
                .toggleClass("active");
        });
    };

    app.carouselInıt = function () {
        if (typeof $.fn.owlCarousel !== 'undefined') {
            $(".dashboard__slider").owlCarousel({
                navigation: true, // Show next and prev buttons
                slideSpeed: 300,
                paginationSpeed: 400,
                singleItem: true,
                items: 1,
                nav: false,
                navText: ["<img class=' nav-button left' src='/ipragazb2bstorefront/_ui/responsive/common/images/chevron-left.svg'>", "<img class='nav-button right' src='/ipragazb2bstorefront/_ui/responsive/common/images/chevron-right.svg'>"]
            });
        }
    };

    app.magnificInit = function () {
        if (typeof $.fn.magnificPopup !== 'undefined') {
            $("#inline-popups").magnificPopup({
                removalDelay: 500,
                callbacks: {
                    beforeOpen: function () {
                        this.st.mainClass = this.st.el.attr("data-effect");
                    }
                },
                midClick: true
            });
            $(".popup_link").magnificPopup({
                removalDelay: 500,
                callbacks: {
                    beforeOpen: function () {
                        this.st.mainClass = this.st.el.attr("data-effect");
                    }
                },
                midClick: true
            });
        }
    };

    app.courierSelect = function () {
        var input = $("#courier-popup input");
        var disabledButton = $(".form__buttons button:disabled");
        var courierSelectButton = $("#select-complete");
        var wrapper = $("#myOrder");

        $(input).on("click", function (e) {
            $("input:checked").length;
            $(disabledButton).prop("disabled", false);
        });

        $(courierSelectButton).click(function (e) {
            e.preventDefault();
            $.magnificPopup.close();

            $(".message")
                .find("p")
                .html("Siparişe kurye başarı ile atandı!");
            setTimeout(function () {
                $(".message").addClass("success");
            }, 200);
            setTimeout(function () {
                $(".message").removeClass("success");
            }, 3000);
        });
    };

    app.hoursSelect = function () {
        var select = $(".select__wrapper");
        var listWrapper = $(".first__list");
        // var switchButton = $(".switch__button span");
        var disabledButton = $(".buttons__wrapper button:disabled");
        // accordion

        var _this = $(this);
        $("html").on("click", function (event) {
            var target = $(event.target);
            if (target.is(".select__wrapper")) {
                if (
                    $(target)
                        .parent()
                        .hasClass("active")
                ) {
                    $(target)
                        .parent()
                        .removeClass("active");
                } else {
                    $(select)
                        .parent()
                        .removeClass("active");
                    $(target)
                        .parent()
                        .addClass("active");
                }
                return;
            } else if (target.is(".select__wrapper img")) {
                if (
                    $(target)
                        .parent()
                        .parent()
                        .hasClass("active")
                ) {
                    $(target)
                        .parent()
                        .parent()
                        .removeClass("active");
                } else {
                    $(select)
                        .parent()
                        .removeClass("active");
                    $(target)
                        .parent()
                        .parent()
                        .addClass("active");
                }
            }
        });

        // $(switchButton).on("click", function () {
        //     $(disabledButton).prop("disabled", false);
        //
        //     $("#saved-button").click(function (e) {
        //         $(this).prop("disabled", true);
        //     });
        // });
    };

    app.staffEdit = function () {
        var link = $(".staff__list");
        var list = $(".staff__card ul");

        $(".new__staff").click(function (e) {
            $("#new-staff input").on("keyup", function (e) {
                var disabledButton = $("#new-staff button:disabled");
                $(disabledButton).prop("disabled", false);

                var nameVal = $("#staff-popups input[name=name-surname]").val();
                var phoneVal = $("#staff-popups input[name=phone]").val();
                var plageVal = $("#staff-popups input[name=plage]").val();
                var locationVal = $("#staff-popups input[name=location]").val();
            });
        });
        $(link).click(function (e) {
            var name = $(this)
                .find(".staff__name")
                .html();
            var location = $(this)
                .find(".staff__location")
                .html();
            var phone = $(this)
                .find(".staff__phone")
                .html();
            var plage = $(this)
                .find(".staff__plage")
                .html();
            var id = $(this).data("id");

            var inputName = $("#staff-popups input[name=name-surname]").val(name);
            var inputPhone = $("#staff-popups input[name=phone]").val(phone);
            var inputPlage = $("#staff-popups input[name=plage]").val(plage);
            var inputLocation = $("#staff-popups input[name=location]").val(location);

            // Personel sil
            $("#staff-delete").on("click", function (e) {
                e.preventDefault();
                $.map($(link), function (val, i) {
                    if (id === i) {
                        // val.remove();
                        $(val).addClass("passive");
                        $.magnificPopup.close();
                    }
                });
            });

            // Personel Güncelle
            $("#staff-popups input").on("keyup", function (e) {
                var disabledButton = $("#staff-popups button:disabled");
                $(disabledButton).prop("disabled", false);
            });
        });
    };

    app.orderDelivery = function () {
        var button = $("#btn-delivered");
        $(".order__detail").click(function (e) {
            var id = $(this)
                .parent()
                .parent()
                .data("id");

            $(button).click(function (e) {
                e.preventDefault();
                $.map($(".order tr"), function (val, i) {
                    if (id === i) {
                        $(val).addClass("active");

                        $.magnificPopup.close();
                        $(".table__message").addClass("active");

                        setTimeout(function () {
                            $(".table__message").removeClass("active");
                        }, 3000);
                    }
                });

                $.magnificPopup.close();
                $(".table__message")
                    .find("p")
                    .html("Sipariş durumu başarı ile güncellendi!");

                $(".table__message").addClass("active");
                setTimeout(function () {
                    $(".table__message").removeClass("active");
                }, 3000);
            });
        });
    };

    app.ordersNav = function (e) {
        var navButton = $(".orders__nav a");
        var smallNavButton = $(".orders__nav li");
        var width = $(window).width();

        resizerFunc = function (e) {
            if (e <= 1250) {
                $(smallNavButton).click(function (e) {
                    $(this)
                        .parent()
                        .toggleClass("active");
                    if ($(this).index() !== 0) {
                        $(".orders__nav li:first a").html(
                            $(this)
                                .find("a")
                                .html()
                        );
                        $(".orders__nav li").show();
                        $(this).hide();
                    }
                });
            } else {
                $(smallNavButton).click(function (e) {
                    if ($(this).hasClass("active")) {
                        $(this).removeClass("active");
                        $(smallNavButton).removeClass("active");
                    } else {
                        $(smallNavButton).removeClass("active");
                        $(smallNavButton).removeClass("active");
                        $(this).addClass("active");
                    }
                });
            }
        };
        var windowWidth = $(window).width();
        resizerFunc(windowWidth);

        $(window).on("resize", function () {
            var windowWidth = $(window).width();

            resizerFunc(windowWidth);
        });
    };

    app.loginDashboard = function () {
        var loginButton = $("#btn-loginButton");
        var staffLogin = $("#btn-staffLogin");
        $(loginButton).click(function (e) {
            e.preventDefault();
            window.location.href = window.location.origin + "/" + "dashboard.html";
        });
        $(staffLogin).click(function (e) {
            e.preventDefault();
            window.location.href = window.location.origin + "/" + "staff-dashboard.html";
        });
    };

    app.momentInit = function () {
        var nowDate = moment().format("YYYY-MMMM-DD");
    };

    app.dateRangePickerInt = function () {
        moment.defineLocale("tr", {
            months: "Ocak_Şubat_Mart_Nisan_Mayıs_Haziran_Temmuz_Ağustos_Eylül_Ekim_Kasım_Aralık".split("_"),
            monthsShort: "Oca_Şub_Mar_Nis_May_Haz_Tem_Ağu_Eyl_Eki_Kas_Ara".split("_"),
            weekdays: "Pazar_Pazartesi_Salı_Çarşamba_Perşembe_Cuma_Cumartesi".split("_"),
            weekdaysShort: "Paz_Pts_Sal_Çar_Per_Cum_Cts".split("_"),
            weekdaysMin: "Pz_Pt_Sa_Ça_Pe_Cu_Ct".split("_"),
            longDateFormat: {
                LT: "HH:mm",
                LTS: "HH:mm:ss",
                L: "DD.MM.YYYY",
                LL: "D MMMM YYYY",
                LLL: "D MMMM YYYY HH:mm",
                LLLL: "dddd, D MMMM YYYY HH:mm"
            },
            calendar: {
                sameDay: "[bugün saat] LT",
                nextDay: "[yarın saat] LT",
                nextWeek: "[gelecek] dddd [saat] LT",
                lastDay: "[dün] LT",
                lastWeek: "[geçen] dddd [saat] LT",
                sameElse: "L"
            },
            relativeTime: {
                future: "%s sonra",
                past: "%s önce",
                s: "birkaç saniye",
                ss: "%d saniye",
                m: "bir dakika",
                mm: "%d dakika",
                h: "bir saat",
                hh: "%d saat",
                d: "bir gün",
                dd: "%d gün",
                M: "bir ay",
                MM: "%d ay",
                y: "bir yıl",
                yy: "%d yıl"
            },
            ordinal: function (number, period) {
                switch (period) {
                    case "d":
                    case "D":
                    case "Do":
                    case "DD":
                        return number;
                    default:
                        if (number === 0) {
                            // special case for zero
                            return number + "'ıncı";
                        }
                        var a = number % 10,
                            b = (number % 100) - a,
                            c = number >= 100 ? 100 : null;
                        return number + (suffixes$4[a] || suffixes$4[b] || suffixes$4[c]);
                }
            },
            week: {
                dow: 1, // Monday is the first day of the week.
                doy: 7 // The week that contains Jan 7th is the first week of the year.
            }
        });
        if ($('input[name="datetimes"]').length == 0)
            return;
        var splitDate = $('input[name="datetimes"]').val().split('-');
        var minusDays = $('#minDate').val();
        var minDates = 0;
        if(minusDays!=0){
            minDates = new Date(minusDays);
        }
        if (typeof $.fn.daterangepicker === 'undefined') return;
        $('input[name="datetimes"]').daterangepicker({
            timePicker24Hour: true,
            timePicker: false,
            startDate: splitDate[0],
            endDate: splitDate[1],
            dateLimit: window.location.pathname.indexOf('/reports') > 0 ? { days: 29 } : '',
            ranges: {
                Bugün: [moment(), moment()],
                Dün: [moment().subtract(1, "days"), moment().subtract(1, "days")],
                "Son 7 gün": [moment().subtract(6, "days"), moment()],
                "Son 30 gün": [moment().subtract(29, "days"), moment()],
                "Bu ay": [moment().startOf("month"), moment().endOf("month")],
                "Geçen ay": [
                    moment()
                        .subtract(1, "month")
                        .startOf("month"),
                    moment()
                        .subtract(1, "month")
                        .endOf("month")
                ]
            },
            locale: {
                format: "DD/MM/YYYY",
                separator: " - ",
                applyLabel: "Uygula",
                cancelLabel: "Vazgeç",
                customRangeLabel: "Seç",
                // daysOfWeek: ["Pt", "Sl", "Çr", "Pr", "Cm", "Ct", "Pz"],
                monthNames: ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"],
                firstDay: 1
            }
        });
    };
    app.browserDetected = function () {
        var isIE =
            /*@cc_on!@*/
            false || !!document.documentMode;
        if (isIE === true) {
            $("body").addClass("ie");
        } else {
        }
    };

    app.forgotPassword = function () {
        $("#btn-forgotPassword").click(function (e) {
            e.preventDefault();

            $(".message")
                .find("p")
                .html("Şifre yenileme bağlantısı e-posta adresinize gönderildi.");
            setTimeout(function () {
                $(".message").addClass("success");
            }, 200);
            setTimeout(function () {
                $(".message").removeClass("success");
            }, 200);
        });
    };

    app.MyOrder = function () {
        var wrapper = $("#myOrder");

        wrapper.find(".order-item__header").on("click", function (e) {
            e.preventDefault();
            var $this = $(this);

            if ($this.parent().hasClass("active")) {
                $this.parent().removeClass("active");
            } else {
                wrapper.find(".order-item").removeClass("active");
                $this.parent().addClass("active");
            }
        });
    };

    app.Select = function () {
        if (typeof $.fn.select2 !== 'undefined') {
            $(".select2").select2({minimumResultsForSearch: -1});
        }
    };

    // app.switchButton();
    app.carouselInıt();
    app.magnificInit();
    app.courierSelect();
    app.hoursSelect();
    app.staffEdit();
    app.orderDelivery();
    app.ordersNav();
    app.loginDashboard();
    app.dateRangePickerInt();
    app.browserDetected();
    app.forgotPassword();
    app.MyOrder();
    app.Select();
    app.momentInit();
});