ACC.ipraStaff = {
    // _autoload: ['editStaff'],
    pageDefaultClass: ".main.white.staff",
    editStaff: function () {
        var editForm = $(".editStaff-tag form#editStaffForm");
        $(ACC.ipraStaff.pageDefaultClass + " .staff__list").magnificPopup({
            removalDelay: 500,
            callbacks: {
                beforeOpen: function () {
                    $('#staff-deactif-confirm').off('click', '.js-deactive-staff');
                    this.st.mainClass = this.st.el.attr("data-effect");
                },
                open: function () {
                    var currentElem = $(this.currItem.el[0]);
                    var staffInfo = currentElem.data().value;

                    var formActionUrl = editForm.data().formAction;
                    formActionUrl = formActionUrl.replace('{uid}', staffInfo.uid);
                    editForm.attr('action', formActionUrl);

                    var targetPopup = $(this.currItem.src);
                    targetPopup.find('form')[0].reset();

                    ACC.ipraMisc.setInputs(targetPopup, staffInfo);
                    $('#staff-popups').on('click', '.js-save-staff', function (e) {
                        ACC.ipraApiservice.postResponse("#editStaffForm.editStaffForm", formActionUrl, editForm.serialize()).promise().done(function (res) {
                            console.log(res)
                        })
                    });
                    $('#staff-deactif-confirm').on('click', '.js-deactive-staff', function (e) {
                        editForm.find("input[name='deactive']").val("true");
                        ACC.ipraApiservice.postResponse("#editStaffForm.editStaffForm", formActionUrl, editForm.serialize()).promise().done(function (res) {
                            console.log(res)
                            currentElem.addClass("passive");
                            $.magnificPopup.close();
                        });
                    });
                },
                close: function () {
                    $('#staff-deactif-confirm').off('click', '.js-deactive-staff');
                    $('#staff-popups').off('click', '.js-save-staff');
                }
            },
            midClick: true
        });
    },
    addNewStaff: function () {
        var addForm = $(".newStaff-tag form#addStaffForm");
        $(ACC.ipraStaff.pageDefaultClass + " .new__staff").magnificPopup({
            removalDelay: 500,
            callbacks: {
                beforeOpen: function () {
                    this.st.mainClass = this.st.el.attr("data-effect");
                },
                open: function (e) {
                    var targetPopup = $(this.currItem.src);
                    targetPopup.find('form')[0].reset();
                    $('#new-staff').on('click', '.js-add-staff', function (e) {
                        e.preventDefault();
                        ACC.ipraApiservice.postResponse(".newStaff-tag form", addForm.attr('action'), addForm.serialize()).promise().done(function (res) {
                            console.log(res)
                        });
                        // $.magnificPopup.close();
                    });

                },
                close: function () {
                    $('#staff-popups').off('click', '.js-deactive-staff');
                }
            },
            midClick: true
        });

        $(".modal-close").on('click', function (e) {
            e.preventDefault();

            $('.open-popup-link').magnificPopup('close');
        })
    }
};

$(document).ready(function () {
    with (ACC.ipraStaff) {
        editStaff();
        addNewStaff();
    }
});