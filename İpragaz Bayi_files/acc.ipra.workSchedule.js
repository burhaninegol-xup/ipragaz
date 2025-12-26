ACC.ipraWorkSchedule = {
    changeWorkSchedule: function () {

        $(".workSchedule-page .js-day-switch").click(function () {
            var currentElem = $(this);
            var isOpen = null;
            var day = currentElem.data().day;
            if ($(this).parent().hasClass("active")) {
                isOpen = false;
            } else {
                isOpen = true;
            }

            if (isOpen != null) {
                changeDay(day, isOpen, currentElem,ACC.config.siteName);
            }

            $(this).parent().toggleClass("active");
            if (!isOpen) {
                $(this).closest("." + day).find('.second__list .js-time-switch').closest('.switch__button').removeClass("active");
            }
            if (day === "SUNDAY" && isOpen) {
                $(this).closest("." + day).find('.second__list .js-time-switch').closest('.switch__button').addClass("active");
            }
        });

        $(".workSchedule-page .js-time-switch").click(function () {
            var currentElem = $(this);
            var isOpen = null;
            var day = currentElem.data().day;
            var time = currentElem.data().time;

            if ($(this).parent().hasClass("active")) {
                isOpen = false;
            } else {
                isOpen = true;
            }
            if (isOpen != null) {
                changeTime(day, time, isOpen, currentElem,ACC.config.siteName);
            }

            $(this).parent().toggleClass("active");
        });

        function changeDay(day, isOpen, element,siteName) {
            var params = {"weekDay": day, "isOpen": isOpen, "siteName": siteName, "CSRFToken": ACC.config.CSRFToken};
            ACC.ipraApiservice.post("/bayi/b2b/closeDeliverySlot", params).promise().done(function (res) {
                showChangedMessage(params, element);
            })
        }

        function changeTime(day, time, isOpen, element,siteName) {
            var closestDay = $(element).closest("." + day).find('.select__wrapper .switch__button');
            var params = {"weekDay": day, "deliverySlotCode": time, "isOpen": isOpen,  "siteName": siteName,"CSRFToken": ACC.config.CSRFToken};
            ACC.ipraApiservice.post("/bayi/b2b/closeDeliverySlotTimes", params).promise().done(function (res) {
                if (res.allDay === true) {
                    closestDay.addClass("active")
                } else {
                    closestDay.removeClass("active")
                }
                showChangedMessage(params, element);
            })
        }

        function showChangedMessage(params, element) {
            var showMessage;
            var isOpenedText = params.isOpen ? ACC.messages.workSchedule.opened : ACC.messages.workSchedule.closed;
            if (ACC.ipraValidator.isNullOrEmpty(params.deliverySlotCode)) {
                showMessage = ACC.messages.workSchedule.days[params.weekDay] + ' ' + isOpenedText;
            } else {
                var hour = element.closest('li').find('.select__hours').text();
                showMessage = ACC.messages.workSchedule.days[params.weekDay] + ',' + hour + ' ' + isOpenedText;
            }
            ACC.ipraMisc.successMessage.globalMessage("success", showMessage)
        }
    }
};

$(document).ready(function () {
    with (ACC.ipraWorkSchedule) {
        changeWorkSchedule();
    }
});