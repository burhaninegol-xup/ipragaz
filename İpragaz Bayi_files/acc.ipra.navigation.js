ACC.ipraNavigation = {
    _autoload: ['nearestStoreFocusMap'],
    nearestStoreFocusMap: function () {
        if (window.location.href.indexOf('#focusMap') != -1) {
            ACC.ipraMisc.animateFocusElement(".dealer-map__wrapper");
        }
        $(".NearestStoreCategoryLink a").click(function (e) {
            e.preventDefault();
            if ($("body").hasClass("page-homepage")) {
                var mobileMenu = $(this).closest('.header__nav.opened');
                if (mobileMenu.length > 0) {
                    $(".header__mobile.opened").removeClass("opened");
                    mobileMenu.removeClass('opened');
                    $(".menu-overlay").removeClass("opened");
                }
                $(this).closest('.header__nav.opened').len;
                ACC.ipraMisc.animateFocusElement(".dealer-map__wrapper");
            } else {
                window.location = "/#focusMap";
            }
        })
    }
};