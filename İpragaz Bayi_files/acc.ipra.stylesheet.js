ACC.ipraStyleSheet = {
    workSchedule: function () {
        document.styleSheets[1].addRule('.switch__button::before', 'content: "' + ACC.ipraMessage.off + '";');
        document.styleSheets[1].addRule('.switch__button::after', 'content: "' + ACC.ipraMessage.on + '";');
    }
};
with (ACC.ipraStyleSheet) {
    workSchedule();
}
