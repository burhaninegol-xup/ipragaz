var app = {};

$(window).on('load', function () {
    setTimeout(function () {
        $(".lds-css").hide();
    }, 100)


});

$(function () {

    //Internet explorer object fit

    var $someImages = $("img.some-image");

    objectFitImages($someImages);

    // IE Detection

    var isIE = /*@cc_on!@*/ false || !!document.documentMode;

    if (isIE) {
        $("body").addClass("ie");
    }

    if (/Edge/.test(navigator.userAgent)) {
        $("body").addClass("ie");
    }

    // Wow.js init
    new WOW().init();


    // $(".read-more").click(function(e){
    //     setTimeout(function () {
    //         $(".privacy-policy").parent().css("height","100%")
    //     }, 50)
    //
    // })

    $("body").append('<div class="menu-overlay"></div>');

    //Mobile menu action
    // $(".header__mobile").on('click', function (e) {
    //     e.preventDefault();
    //
    //     if ($(this).hasClass("opened")) {
    //         $(this).removeClass("opened");
    //         $(".header__nav, .menu-overlay").removeClass("opened");
    //         $("body").css("overflow", "auto");
    //     } else {
    //         $(this).addClass("opened");
    //         $(".header__nav, .menu-overlay").addClass("opened");
    //         $("body").css("overflow", "hidden");
    //
    //     }
    // });

    // Sticky Header
    var header = $("header.header");
    var carousel = $(".main__carousel");
    var carouselHeight = carousel.height();

    $(window).on('scroll', function (e) {
        e.preventDefault();
        if ($(this).scrollTop() >= (carouselHeight + header.height())) {
            header.addClass("fixed");
        } else {
            header.removeClass("fixed");
        }

        $(".main__carousel").css("margin-top", -$(this).scrollTop() / 7);
    })

    // Input focus
    $(".form-control input").focusin(function () {
        $(this).parent().addClass("focused");
    })

    $(".form-control input").focusout(function () {
        $(this).parent().removeClass("focused");
    })

    // Header User Login
    $("#user-auth").on("click", function (e) {
        e.preventDefault();

        if ($(this).parent().find(".header__user-wrapper").hasClass("opened")) {
            $(this).parent().find(".header__user-wrapper").removeClass("opened");
            $(this).find("img").attr("src", "/_ui/responsive/common/images/user.svg")

        } else {
            $(this).parent().find(".header__user-wrapper").addClass("opened");
            $(this).find("img").attr("src", "/_ui/responsive/common/images/user-blue.svg");
            // $(".header__user-profile, .header__cart-wrapper").removeClass("opened");


            if ($(".header__cart-wrapper").hasClass("opened")) {
                $("#header-cart").click();
            }

            if ($(".header__user-profile").hasClass("opened")) {
                $("#user-profile").click();
            }
        }
    });

    // Header Cart
    $(document).on("click", "#header-cart", function (e) {
        e.preventDefault();

        if ($(this).parent().find(".header__cart-wrapper").hasClass("opened")) {
            $(this).parent().find(".header__cart-wrapper").removeClass("opened");
            $(this).find("img").attr("src", "/_ui/responsive/common/images/basket.svg")

        } else {
            $(this).parent().find(".header__cart-wrapper").addClass("opened");
            $(this).find("img").attr("src", "/_ui/responsive/common/images/basket-blue.svg")

            if ($(".header__user-wrapper").hasClass("opened")) {
                $("#user-auth").click();
            }

            if ($(".header__user-profile").hasClass("opened")) {
                $("#user-profile").click();
            }
        }
    })

    // Header Profile
    $("#user-profile").on("click", function (e) {
        e.preventDefault();

        if ($(this).parent().find(".header__user-profile").hasClass("opened")) {
            $(this).parent().find(".header__user-profile").removeClass("opened");
            $(this).find("img").attr("src", "/_ui/responsive/common/images/user.svg")

        } else {
            $(this).parent().find(".header__user-profile").addClass("opened");
            $(this).find("img").attr("src", "/_ui/responsive/common/images/user-blue.svg");

            if ($(".header__user-wrapper").hasClass("opened")) {
                $("#user-auth").click();
            }

            if ($(".header__cart-wrapper").hasClass("opened")) {
                $("#header-cart").click();
            }
        }


    })

    // Alert


    $(".removeItem").on("click", function () {
        app.alert("success", "Ürün sepetinizden silinmiştir.");
    })

    // app.alert = function (alert, text) {
    //     $(".alert").addClass(`alert--${alert} opened`);
    //     $(".alert .alert-text").html(text);
    //     $(".alert .alert-icon img").attr("src", `/_ui/responsive/common/images/alert-${alert}.svg`)
    //
    //     setTimeout(function () {
    //         $(".alert").removeClass(`alert--${alert} opened`);
    //     }, 3000)
    // };

    // Owl Carousel
    app.mainSlider = function () {
        if ($('.carousel__wrapper').length == 0)
            return;
        $('.carousel__wrapper').owlCarousel({
            loop: true,
            margin: 0,
            nav: true,
            items: 1,
            smartSpeed: 2000,
            autoplay: false,
            autoplayTimeout: 5000,
            autoplayHoverPause: true
        })
    };

    // Maps

    // app.Maps = function () {
    //     if ($("#dealer-map").length) {
    //         function initialize() {
    //
    //
    //             var mapSelector = document.getElementById("dealer-map"),
    //                 mapTypeId = "customMap",
    //                 mapOptions = {
    //                     zoom: 16,
    //                     mapTypeId: mapTypeId,
    //                     scrollwheel: false,
    //                     navigationControl: false,
    //                     mapTypeControl: false,
    //                     scaleControl: false,
    //                     draggable: true
    //                 },
    //                 map = new google.maps.Map(mapSelector, mapOptions),
    //                 featureOpts = [
    //                 ],
    //                 customMapType = new google.maps.StyledMapType(featureOpts);
    //             var imgs = "/_ui/responsive/common/images/marker.svg";
    //
    //
    //             infoWindow = new google.maps.InfoWindow;
    //
    //             if (navigator.geolocation) {
    //                 navigator.geolocation.getCurrentPosition(function (position) {
    //                     var pos = {
    //                         lat: position.coords.latitude,
    //                         lng: position.coords.longitude
    //                     };
    //
    //                     // infoWindow.setPosition(pos);
    //                     // infoWindow.setContent('Location found.');
    //                     // infoWindow.open(map);
    //                     map.setCenter(pos);
    //
    //                     var icon = {
    //                         url: imgs, // url
    //                         scaledSize: new google.maps.Size(50, 50), // scaled size
    //                         origin: new google.maps.Point(0, 0), // origin
    //                         anchor: new google.maps.Point(0, 0) // anchor
    //                     }
    //
    //                     var marker = new google.maps.Marker({
    //                         position: pos,
    //                         title: "Hey buradasın!",
    //                         animation: google.maps.Animation.DROP,
    //                         icon: icon
    //                     });
    //                     map.mapTypes.set(mapTypeId, customMapType);
    //                     marker.setMap(map);
    //
    //                 }, function () {
    //                     handleLocationError(true, infoWindow, map.getCenter());
    //                 });
    //             } else {
    //                 // Browser doesn't support Geolocation
    //                 handleLocationError(false, infoWindow, map.getCenter());
    //             }
    //
    //             function handleLocationError(browserHasGeolocation, infoWindow, pos) {
    //                 infoWindow.setPosition(pos);
    //                 infoWindow.setContent(browserHasGeolocation ?
    //                     'Error: The Geolocation service failed.' :
    //                     'Error: Your browser doesn\'t support geolocation.');
    //                 infoWindow.open(map);
    //             }
    //         }
    //         google.maps.event.addDomListener(window, "load", initialize);
    //
    //
    //     }
    //
    //
    // }

    app.Search = function () {
        $(document).on('click', "#search-control", function (e) {
            e.preventDefault();

            $(".header__search").addClass("opened");
            setTimeout(function () {
                $("#header-search").focus();
            }, 100)

            $("#user-auth").parent().find(".header__user-wrapper").removeClass("opened");
            $("#user-auth").find("img").attr("src", "/_ui/responsive/common/images/user.svg");

            $("#user-profile").parent().find(".header__user-profile").removeClass("opened");
            $("#user-profile").find("img").attr("src", "/_ui/responsive/common/images/user.svg");

            $("#header-cart").parent().find(".header__cart-wrapper").removeClass("opened");
            $("#header-cart").find("img").attr("src", "/_ui/responsive/common/images/basket.svg")
        })

        $(".header__search-close-js").on('click', function () {
            $(".header__search").removeClass("opened");
        })
    }

    app.LocationSelector = function () {
        $("#location-select").on('click', function (e) {
            e.preventDefault();

            if ($(this).hasClass("active")) {
                $(this).removeClass("active");

                $(".current__city-selection").show();
                $("img#location").show();

                $(".current__city-select").parent().removeClass("opened");
                $("img#close").hide();

            } else {
                $(this).addClass("active");

                $(".current__city-selection").hide();
                $("img#location").hide();

                $(".current__city-select").parent().addClass("opened");
                $("img#close").show();
            }
        })
    }

    app.ProductFilter = function () {
        $(".product__filter-list li").on('click', function (e) {
            e.preventDefault();
            var $this = $(this);
            if ($this.hasClass("active")) {
                $this.removeClass("active");
            }else{
                $this.addClass("active");
            }
            // var id = $this.attr("id")

            // if (id === "all") {
            //     $(`.product__item`).show();
            // } else {
            //     $(`.product__item`).hide();
            //     $(`.product__item.${id}`).show();
            // }
        })
    }

    app.ProductGallery = function () {
        if ($('.magnific-item').length == 0)
            return;

        $('.magnific-item').magnificPopup({
            type: "image",
            mainClass: 'mfp-fade'
        });

        // Gallery Changer
        var gItemSelector = $(".product__detail .product__image");

        gItemSelector.find(".other__images ul li").on('click', function (e) {
            e.preventDefault();

            var $this = $(this);
            if ($this.hasClass("active")) {
                return;
            }
            var activeImage = $this.find("img").attr("data-product-url");

            gItemSelector.find(".other__images ul li").removeClass("active");
            $this.addClass("active");

            gItemSelector.find(".main__image img").attr("src", activeImage)
            gItemSelector.find(".main__image a").attr("href", activeImage)
        })

        // $(".piece__group button.increase").on('click', function (e) {
        //     e.preventDefault();
        //     let $this = $(this);
        //
        //     let val = parseInt($this.prev().val());
        //
        //     $this.prev().val(val + 1);
        //
        //     let vals = parseInt($this.prev().val());
        //
        //     app.alert("success", "Sepetiniz güncellenmiştir.");
        //
        //     if (vals > 1) {
        //         $this.closest(".product__select").find(".add__button").addClass("price-content");
        //     }
        // })

        // $(".piece__group button.decrease").on('click', function (e) {
        //     e.preventDefault();
        //     let $this = $(this);
        //
        //     let val = parseInt($this.next().val());
        //
        //     $this.next().val(val > 0 ? val - 1 : val);
        //
        //     let vals = parseInt($this.next().val());
        //
        //     app.alert("danger", "Sepetiniz güncellenirken bir hata oluştu.");
        //
        //     if (vals < 2) {
        //         $this.closest(".product__select").find(".add__button").removeClass("price-content");
        //     }
        // })

        // Add Cart
        // $(".add__button button").on('click', function (e) {
        //     e.preventDefault();
        //     let $this = $(this);
        //     $this.parent().addClass("added__button");
        //     $this.append('<div class="added__text"><img src="/_ui/responsive/common/images/tik-white.svg" alt=""/><span>Sepete Eklendi</span></div>');
        //
        //     $(".header__cart-wrapper").addClass("opened");
        //
        //     setTimeout(function () {
        //         $this.parent().removeClass("added__button");
        //         $(".added__text").remove();
        //         $(".header__cart-wrapper").removeClass("opened");
        //
        //     }, 4000);
        // })

    }

    app.Select = function () {
        if ($('.select2').length == 0)
            return;
        $('.select2').select2({minimumResultsForSearch: -1});
    }

    app.PurchasePage = function () {

        // Billing select
        var deliveryAddress = $("#deliveryAddress");
        var faturatype = $("input[type='radio'][name=faturatype]");

        deliveryAddress.change(function () {
            if ($(this).is(":checked")) {
                $(".individual__section-billing").hide();
                $(".corporate__section-billing").hide();
            } else {
                $(".individual__section-billing").show();
                $(".corporate__section-billing").show();
            }
        })

        faturatype.change(function (e) {
            var val = $("input[type='radio'][name=faturatype]:checked").val();

            if (val == 1) {
                $(".individual__section").show();
                $(".corporate__section").hide();
            } else {
                $(".individual__section").hide();
                $(".corporate__section").show();
            }
        })

        $(".address__selector-js").on('click', function (e) {
            e.preventDefault();
            var $this = $(this);

            if ($this.hasClass("active")) {
                $this.removeClass("active");
                $this.parent().find(".address__other-select").removeClass("opened");
            } else {
                $this.addClass("active");
                $this.parent().find(".address__other-select").addClass("opened");
            }
        })

        // $('.open-popup-link').magnificPopup({
        //     type: 'inline',
        //     midClick: true,
        //     mainClass: "mfp-fade"
        // });

        $(".modal-close").on('click', function (e) {
            e.preventDefault();
            $.magnificPopup.close();
        });


        $(".promotion__button-js").on('click', function (e) {
            e.preventDefault();

            if ($(this).hasClass("active")) {
                $(this).removeClass("active");
                $(this).find("img").css("transform", "rotate(0deg)")
                $(this).next().hide();


            } else {
                $(this).addClass("active");
                $(this).find("img").css("transform", "rotate(180deg)")
                $(this).next().show();
            }
        })

        $(".order-form__groups-js .group-item").on('click', function (e) {
            var $this = $(this);

            if ($this.hasClass("active")) {
                $this.removeClass("active")
            } else {
                $(".order-form__groups-js .group-item").removeClass("active");
                $this.addClass("active");
            }
        })
    }

    app.MyOrder = function () {
        var wrapper = $("#myOrder");

        wrapper.find(".order-item__header").on("click", function (e) {
            e.preventDefault();
            var $this = $(this);

            if ($this.parent().hasClass("active")) {
                $this.parent().addClass("active");
            } else {
                wrapper.find(".order-item").removeClass("active");
                $this.parent().removeClass("active");


            }
        });
    };

    app.confirmButton = function () {
        var button = $(".btn-loader")
        var text = $(".btn-loader").text()
        $(button).click(function (e) {
            $(this).parent().addClass("active")

            setTimeout(function () {
                $(this).parent().removeClass("active")
            }, 2000)

        })
    }


    // app.hideCookie  = function ( ) {
    //     let button = $(".cookie__btn").find("button")
    //
    //     $(button).click(function(){
    //         $(".cookie").fadeOut(300)
    //     })
    // }

    // app.alertPosition= function (){
    //
    // }

    app.mainSlider();
    // app.Maps();
    app.Search();
    app.LocationSelector();
    app.ProductFilter();
    app.ProductGallery();
    app.Select();
    app.PurchasePage();
    app.MyOrder();
    app.confirmButton();
    // app.hideCookie();
    // app.alertPosition();
})