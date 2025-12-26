ACC.ipraEducation = {
    el: {
        page: '.page-ipragazB2BEducationPage',
        filterTabBtn: 'button[data-target]',
        mediaCart: '.medias .medias-item',
        playVideoBtn: '.play-button'
    },
    init: function () {
        this.events.filterTable();
        this.events.playVideo();
        this.events.watchVideo();
    },
    events: {
        filterTable: function () {
            var _edu = ACC.ipraEducation;
            $(_edu.el.filterTabBtn, _edu.el.page).click(function () {
                var _t = $(this);
                var tabTarget = _t.data('target');
                if (tabTarget == undefined) {
                    return;
                }

                _t.closest('.medias__nav').find('li.active').removeClass('active');
                _t.closest('li').addClass('active');

                if (tabTarget == 'all') {
                    $(_edu.el.mediaCart).show();
                    return;
                }

                var tabTargetSplit = tabTarget.split('|');
                if (tabTargetSplit.length > 0) {
                    console.log(tabTargetSplit)
                }

                var target = _t.data('target') + '-content';
                $('.medias .medias-item').hide();
                $(_edu.el.mediaCart + '[data-target*=' + target + ']').show();
            })
        },
        playVideo: function () {
            var _edu = ACC.ipraEducation;
            $(_edu.el.playVideoBtn, _edu.el.page).magnificPopup({
                disableOn: 700,
                type: 'iframe',
                mainClass: 'mfp-fade',
                removalDelay: 160,
                preloader: false,
                fixedContentPos: false
            });
        },
        watchVideo: function () {
            var _edu = ACC.ipraEducation;
            var popupPageType = $("#home-page-eduVideo");
            var _pathName = window.location.pathname.replaceAll('/','');
            var _userFlag = ACC.config.userFlag;

            if(_userFlag === 'false' && (_pathName === 'bayitr' || _pathName === 'bayien')){
                $.magnificPopup.open({
                    type: 'inline',
                    closeOnBgClick: false,
                    enableEscapeKey: false,
                    items: {
                        src: popupPageType
                    },
                    callbacks: {
                        open: function () {
                            $('.watch-education').click(function () {
                               window.location.href = window.location.pathname + 'b2b/education';
                            });
                        },
                        close: function () {

                        }
                    }
                });
            }

            $(_edu.el.playVideoBtn).click(function (e) {
               e.preventDefault();
               var _url = window.location.pathname;
               var _params = {videoFlag: true, CSRFToken: ACC.config.CSRFToken};
               ACC.ipraApiservice.post(_url, _params);
            });

        }
    }
};

$(document).ready(function () {
    with (ACC.ipraEducation) {
        init();
    }
})