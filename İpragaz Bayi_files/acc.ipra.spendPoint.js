var ACC = window.ACC || {};
ACC.ipraMisc = ACC.ipraMisc || {};

ACC.ipraMisc.popup = (function () {
    function open(options) {
        const popupId = options.popupId || '#mnp-my-bonus-coupon-bayi';
        var $popup = $(popupId);

        if (!$popup.length) {
            console.error("Popup bulunamadı:", popupId);
            return;
        }

        // İçeriği dinamik olarak yerleştir (isContent değilse)
        if (!options.isContent) {
            const title = options.title || '';
            const messages = options.messages || '';
            const html = `
                <div class="popup-inner">
                    <h3 style="margin-top: 0;">${title}</h3>
                    <p>${messages}</p>
                    <button class="close-btn">Kapat</button>
                </div>
            `;
            $popup.html(html);
        }

        // Popup stil
        $popup.css({
            display: 'block',
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 9999,
            backgroundColor: '#fff',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 0 10px rgba(0,0,0,0.3)'
        });

        // Overlay ekle
        $('body').append('<div class="popup-overlay"></div>');
        $('.popup-overlay').css({
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: 9998
        });

        // Kapatma olayları
        $('.popup-overlay, ' + popupId + ' .close-btn').on('click', function () {
            close(popupId);
        });
    }

    function close(popupId) {
        $(popupId).hide();
        $('.popup-overlay').remove();
    }

    return {
        open: open,
        close: close
    };
})();


$(document).on("click", ".js_coupon_points", function (e) {
    $('.js_coupon_points').removeClass('active');
    $(this).addClass('active');
    var index = $(this).data('index');
    $('input.js_coupon_points[data-index="' + index + '"]').addClass('active');
});


$(document).on("click", ".create-report", function (e) {
    var _selectedBox = $('#selectAltCheckoutFlow').val();
    var _selectedPeriod = $('#selectDateMounth').val();

    if (_selectedBox !== 'sec' && _selectedPeriod !== 'sec') {
        $('#missingReportParam').hide();
        var _url = '/bayi/b2b/reports/selected-report?period=' + _selectedPeriod + '&reportType=' + _selectedBox;

        ACC.ipraApiservice.get(_url).promise().done(function (res) {
            if (res && res.length > 0) {
                $('.noresult-info').hide();
                $('.report-result').show();
                $('#exportExcel').show();
                var $tbody = $("#reportTable tbody");
                $tbody.empty(); // Önce eski satırları temizle

                $.each(res, function (index, dealer) {
                    var $tr = $("<tr></tr>");
                    $.each(dealer, function (key, value) {
                        $("<td></td>").text(value).appendTo($tr);
                    });
                    $tbody.append($tr);
                });

            } else {
                var $tbody = $("#reportTable tbody");
                $tbody.empty();
                $('.report-result').hide();
                $('.exportBtn').hide();
                $('.noresult-info').show();
                $('#missingReportParam').hide();
            }
        });
    } else {
        $('#missingReportParam').show();
        $('.report-result').hide();
        $('.exportBtn').hide();
    }
});

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("exportExcel").addEventListener("click", function () {
        var table = document.getElementById("reportTable");
        var workbook = XLSX.utils.table_to_book(table, {sheet: "Report"});
        var _selectedBox = $('#selectAltCheckoutFlow').val();
        var _selectedPeriod = $('#selectDateMounth').val();
        var timestamp = Date.now();
        var reportName = _selectedPeriod + "_" + _selectedBox + "_" + timestamp + ".xlsx";
        XLSX.writeFile(workbook, reportName);
    });
});

// $(document).on("click", ".js_points_coupon_get_bayi", function (e) {
//     var _t = $(this);
//     const popupId = '#mnp-my-bonus-coupon-bayi';
//     _t.attr('disabled', true);
//     var _active_campaign = $('.js_coupon_points.active');
//     var _id = _active_campaign.attr("data-id");
//     var _amount = _active_campaign.attr("data-realamount");
//     var _url = '/bayi/b2b/spend-coupon?campaignId=' + _id + '&redeemPointAmount=' + _amount;
//     var _data = {"CSRFToken": ACC.config.CSRFToken};

//     ACC.ipraApiservice.post(_url, _data).promise().done(function (res) {
//         if (res) {
//             if (res.errorMessage != null) {
//                 ACC.ipraMisc.popup.open({
//                     title: ACC.warnText,
//                     messages: res.errorMessage,
//                     popupId: popupId
//                 });
//                 if (res.isRedirectRequired) {
//                     setTimeout(function () {
//                         window.location.href = '/login';
//                     }, 3000);
//                 }
//             } else {
//                 $(popupId).find('.gdc-title').html(res.title);
//                 $(popupId).find('.gdc-desc').html(res.message);
//                 $(popupId).find('.gdc-date span').html(res.endDate);
//                 $(popupId).find('.gdc-code').html(res.promoCode);
//                 $('.close-btn').click(function () {
//                     window.location.reload();
//                 });
//                 ACC.ipraMisc.popup.open({
//                     isContent: true,
//                     popupId: popupId
//                 });
//             }
//             _t.removeAttr("disabled")
//         } else {
//             ACC.ipraMisc.popup.open({
//                 title: ACC.errorText,
//                 messages: ACC.errorDesc,
//                 popupId: popupId
//             });
//             _t.removeAttr("disabled")
//         }
//     });
// });

$(document).on("click", ".js_points_coupon_get_bayi", function (e) {

    const _t = $(this);
    
    const eligible = _t.data("eligible");
    if (!eligible) {
       _t.attr('disabled', true);
       return;
    }

    e.preventDefault();
    const popupId = '#confirm-popup';

    ACC.ipraMisc.popup.open({
        popupId: popupId,
        isContent: true 
    });

    $(document).off('click', '.js-confirm-yes').on('click', '.js-confirm-yes', function () {
        ACC.ipraMisc.popup.close(popupId);
        proceedCouponConversion(_t);
    });

    $(document).off('click', '.js-confirm-no').on('click', '.js-confirm-no', function () {
        ACC.ipraMisc.popup.close(popupId);
    });
});


function proceedCouponConversion(_t) {
    const popupId = '#mnp-my-bonus-coupon-bayi';
    _t.attr('disabled', true);
    const _active_campaign = $('.js_coupon_points.active');
    const _id = _active_campaign.attr("data-id");
    const _amount = _active_campaign.attr("data-realamount");
    const _url = '/bayi/b2b/spend-coupon?campaignId=' + _id + '&redeemPointAmount=' + _amount;
    const _data = {"CSRFToken": ACC.config.CSRFToken};

    ACC.ipraApiservice.post(_url, _data).promise().done(function (res) {
        if (res) {
            if (res.errorMessage != null) {
                ACC.ipraMisc.popup.open({
                    title: ACC.warnText,
                    messages: res.errorMessage,
                    popupId: popupId
                });
                if (res.isRedirectRequired) {
                    setTimeout(function () {
                        window.location.href = '/login';
                    }, 3000);
                }
            } else {
                $(popupId).find('.gdc-title').html(res.title);
                $(popupId).find('.gdc-desc').html(res.message);
                $(popupId).find('.gdc-date span').html(res.endDate);
                $(popupId).find('.gdc-code').html(res.promoCode);
                $('.close-btn').click(function () {
                    window.location.reload();
                });
                ACC.ipraMisc.popup.open({
                    isContent: true,
                    popupId: popupId
                });
            }
            _t.removeAttr("disabled")
        } else {
            ACC.ipraMisc.popup.open({
                title: ACC.errorText,
                messages: ACC.errorDesc,
                popupId: popupId
            });
            _t.removeAttr("disabled")
        }
    });
}



$(document).on("click", ".js_points_coupon_copy", function () {
    const text = $(".js_points_coupon_copy_text").text().trim();
    const popupId = '#mnp-my-bonus-coupon-bayi';
    navigator.clipboard.writeText(text).then(() => {
        $(".js_points_coupon_copy_success").show();
        setTimeout(() => {
            $(".js_points_coupon_copy_success").hide();
            ACC.ipraMisc.popup.close(popupId);
        }, 2000);
    });
});


function openCity(evt, cityName) {
    var i, x, tablinks;

    x = document.getElementsByClassName("city");
    for (i = 0; i < x.length; i++) {
        x[i].style.display = "none";
    }

    tablinks = document.getElementsByClassName("tablink");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].style.backgroundColor = "";
    }

    evt.currentTarget.style.backgroundColor = "rgba(188, 18, 10, 0.9)";
    evt.currentTarget.style.color = "white";

    document.getElementById(cityName).style.display = "block";
}

const dropdown = document.getElementById("myDropdown");


const monthNames = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayis", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasim", "Aralik"
];

const newdropdown = document.getElementById('selectDateMounth');


newdropdown.innerHTML = '<option value="sec">Tarihi Seciniz</option>';

const today = new Date();
let month = today.getMonth(); // 0-11
let year = today.getFullYear();

month -= 1;
if (month < 0) {
    month = 11;
    year -= 1;
}

for (let i = 0; i < 12; i++) {
    const monthName = monthNames[month];
    const label = `${monthName}-${year}`;
    const value = `${year}${(month + 1).toString().padStart(2, '0')}`; // Örn: 2025-08

    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;

    newdropdown.appendChild(option);

    month -= 1;
    if (month < 0) {
        month = 11;
        year -= 1;
    }
}

