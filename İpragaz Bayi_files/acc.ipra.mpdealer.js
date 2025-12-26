ACC.mpDealer = {
    el: {
        dealerCity: '.mp-dealer-address select[name=\'city\']',
        dealerCounty: '.mp-dealer-address select[name=\'county\']',
        dealerNeighborhood: '.mp-dealer-address select[name=\'neighborhood\']'
    },
    onLoad: function () {
        this.mpDealerOptions();
        this.mpDealerChange();
    },
    mpDealerOptions: function () {
        var mpDealer = ACC.mpDealer;
        var dealerCity = $(mpDealer.el.dealerCity);
        var dealerCounty = $(mpDealer.el.dealerCounty);
        var dealerNeighborhood = $(mpDealer.el.dealerNeighborhood);

        $('.bring-mp-dealer .btn').click(function () {
            var _cityUrl = '/bayi/b2b/mp-data?city=' + dealerCity.val();
            var _countyUrl = '/bayi/b2b/mp-data?city=' + dealerCity.val() + '&county=' + dealerCounty.val();
            var _neighborhoodUrl = '/bayi/b2b/mp-data?city=' + dealerCity.val() + '&county=' + dealerCounty.val() + '&neighborhood=' + dealerNeighborhood.val();

            if ($(mpDealer.el.dealerCity).val() != null && $(mpDealer.el.dealerCounty).val() === null && $(mpDealer.el.dealerNeighborhood).val() === null) {
                ACC.ipraApiservice.get(_cityUrl).promise().done(function (res) {
                    mpDealer.mpDealerList(res);
                });
            } else if ($(mpDealer.el.dealerCity).val() != null && $(mpDealer.el.dealerCounty).val() != null && $(mpDealer.el.dealerNeighborhood).val() === null) {
                ACC.ipraApiservice.get(_countyUrl).promise().done(function (res) {
                    mpDealer.mpDealerList(res);
                });
            } else if ($(mpDealer.el.dealerCity).val() != null && $(mpDealer.el.dealerCounty).val() != null && $(mpDealer.el.dealerNeighborhood).val() != null) {
                ACC.ipraApiservice.get(_neighborhoodUrl).promise().done(function (res) {
                    mpDealer.mpDealerList(res);
                });
            }

        });
    },
    mpDealerChange: function () {
        var _mpDealer = ACC.mpDealer;
        var _url = "/bayi/b2b/mp-activate";

        $('.mp-dealer-list').on('change', '[type="checkbox"]', function (e) {
            var _t = $(this);
            _t.prop("disabled", true);
            var params = {
                code: e.target.name,
                isNeighbor: e.target.dataset.neighbor == 'true' ? true : false,
                activate: e.target.value == 'true' ? false : true,
                "CSRFToken": ACC.config.CSRFToken
            };
            ACC.ipraApiservice.post(_url, params).promise().done(function (res) {
                if (res.success) {
                    if (!_t.is(':checked')) {
                        _t.closest('div').appendTo('.not-selected-options');
                        _t.val(_t.is(":checked"))
                    } else {
                        _t.closest('div').appendTo('.selected-options');
                        _t.val(_t.is(":checked"))
                    }
                }
            });
            setTimeout(function () {
                _t.prop("disabled", false);
            },3000)

        })
    },
    mpDealerList: function (res) {
        $('.mp-dealer-list .selected-options').empty();
        $('.mp-dealer-list .not-selected-options').empty();
        $('.mp-dealer-list .selected-options').append(ACC.config.activeDealer);
        $('.mp-dealer-list .not-selected-options').append(ACC.config.notActiveDealer);
        res.mpList.forEach(function (i) {
            if (i.active === true) {
                var parentDiv = $(document.createElement('div')).addClass('input-container');
                $('.mp-dealer-list .selected-options').append(parentDiv);
                parentDiv.append(
                    $(document.createElement('input')).prop({
                        id: i.name,
                        name: i.code,
                        value: i.active,
                        type: 'checkbox',
                        checked: i.active == true ? 'checked' : ''
                    }).attr("data-neighbor", i.isNeighbor)
                );
                parentDiv.append(
                    $(document.createElement('label')).prop({
                        for: i.name
                    }).html(i.name)
                );
            } else {
                var parentDiv = $(document.createElement('div')).addClass('input-container');
                $('.mp-dealer-list .not-selected-options').append(parentDiv);
                parentDiv.append(
                    $(document.createElement('input')).prop({
                        id: i.name,
                        name: i.code,
                        value: i.active,
                        type: 'checkbox',
                        checked: i.active == true ? 'checked' : ''
                    }).attr("data-neighbor", i.isNeighbor)
                );
                parentDiv.append(
                    $(document.createElement('label')).prop({
                        for: i.name
                    }).html(i.name)
                );
            }
        });
    }
};

$(document).ready(function () {
    with (ACC.mpDealer) {
        onLoad();
    }
});