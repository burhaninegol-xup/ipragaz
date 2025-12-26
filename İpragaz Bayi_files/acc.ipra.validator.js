ACC.ipraValidator = {
    isNullOrEmpty: function (value) {
        if ($.isNumeric(value)) {
            return false;
        }
        if (value !== null && typeof value === "object") {
            return false;
        }
        if (value === false || value === true) {
            return false;
        }
        if (value === null || value === undefined || value.trim() === "" || JSON.stringify(value).trim() === "") {
            return true;
        }
        return false;
    },
    phoneValidator: function (phoneNumber) {
        var isValid = (new RegExp(ACC.ipraRegex.phoneNumber).test(phoneNumber));
        return isValid;
    }
};