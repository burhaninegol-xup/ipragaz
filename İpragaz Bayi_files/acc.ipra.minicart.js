ACC.ipraMiniCart = {
    _autoload: ['removeEntry'],
    removeEntry: function () {
        $(document).on("click",".miniCartSlot .js-mini-cart-remove-entry",function (e) {
            e.preventDefault();
            var currentElem = $(this);
            var form = currentElem.closest("form");
            $.post(form.attr("action"), form.serialize(), function (res) {
                window.location.reload();
            }).fail(function (err) {
                console.log(err);
            })
        });
    }
};