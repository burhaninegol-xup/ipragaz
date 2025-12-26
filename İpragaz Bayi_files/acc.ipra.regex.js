ACC.ipraRegex = {
    number: '/[0-9]/',
    phoneNumber: '^\\d{3}\\s{1}\\d{3}\\s{1}\\d{4}$',
    replaceSpace: function (text) {
        return text.replace(/ /g, "");
    }
};