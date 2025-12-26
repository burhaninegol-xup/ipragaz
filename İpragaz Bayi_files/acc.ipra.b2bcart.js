ACC.b2bcart = {
    onLoad: function () {

        $(document).on('change', ".cartPage-page .b2bCartSelection-tag .startSimulation:not(.response)", function (e) {
            var currentElement = $(this);
            var form = currentElement.closest('form');

            if (document.getElementById("isConsignment") != null && document.getElementById("isConsignment") != undefined) {
                var isConsignment = document.getElementById("isConsignment").checked;
                var input = document.createElement("input");
                input.type = "hidden";
                input.name = "isConsignment";
                input.value = isConsignment;
                form.append(input);
            }

            form.submit();
            $(".lds-css").show();
            //document.location.reload(true);
        });

        $(document).on('change', ".cartPage-page .b2bCartSelection-tag #isConsignment", function (e) {
            var currentElement = $(this);
            var isConsignment = $(".cartPage-page .b2bCartSelection-tag #isConsignment").checked;

            var input = document.createElement("input");
            input.type = "hidden";
            input.name = "isConsignment";
            input.value = isConsignment;

            var form = currentElement.closest('form');
            form.append(input);

            form.submit();
            $(".lds-css").show();
            document.location.reload(true);
        });


        $(document).on('change', ".cartPage-page .b2bCartSelection-tag .startSimulation.response", function (e) {
            var currentElement = $(this);

            if (document.getElementById("isConsignment") != null && document.getElementById("isConsignment") != undefined) {
                var isConsignment = document.getElementById("isConsignment").checked;
                var input = document.createElement("input");
                input.type = "hidden";
                input.name = "isConsignment";
                input.value = isConsignment;
                form.append(input);
            }

            var form = currentElement.closest('form');
            ACC.ipraApiservice.post('/bayi/cart/b2bcart-form-non-simulation', form.serialize());
        });

        $(document).on('click', ".cartPage-page .summary__promotion .remove-basket", function (e) {
            var currentElement = $(this);
            $(".lds-css").show();
            ACC.ipraApiservice.get("/bayi/cart/remove-all").promise().done(function (res) {
                document.location.reload(true);
            });
        });

    },
};

$(document).ready(function () {
    with (ACC.b2bcart) {
        onLoad();
    }
});

function removeGlobalMessages() {
    $(".global-alerts .message").hide()
}