var rememberMeKey = "MMCRememberMe";
var sessionKey = "MMCSessionKey";
var rememberMe = 'MMCRemember';

$(document).ready(function () {
    if (isSessionAvailable()) {
        window.location.href = 'http://tusspdev1/VirtualApps/MKTWebs/TAMS.MKT.MarketingMaterialCatalog.Mobile/login/test.html';
    }
});

function LoginUser() {
    if ($('#login') === undefined || $('#login').val() == '') {
        $('#td-error').html('Please provide login.');
        showTimedElem('td-error');
        return;
    }

    if ($('#password') === undefined || $('#password').val() == '') {
        $('#td-error').html('Please provide password.');
        showTimedElem('td-error');
        return;
    }

    $.ajax({
        type: 'POST',
        url: "svc.aspx",
        data: { op: 'Authenticate', username: $('#login').val(), password: $('#password').val() },
        async: false,
        success: function (data) {
            //console.log(data.d.results); 
            if (data.d.results) {
                if ($('#rememberMe') !== undefined && $('#rememberMe').val() == '1') {
                    localStorage.setItem(rememberMeKey, Base64.encode($('#login').val() + ":" + $('#password').val()));
                } else {
                    sessionStorage.setItem(sessionKey, Base64.encode($('#login').val() + ":" + $('#password').val()));
                }
                $('#td-error').html('Successful Login.');
                showTimedElem('td-error');
            } else {
                $('#td-error').html('Wrong Username and/or Password.');
                showTimedElem('td-error');
            }
        },
        error: function (data) {
            alert(JSON.stringify(data));
        }
    });
}

function showTimedElem(divName) {
    $('#' + divName).fadeIn('slow');
    $('#' + divName).focus();
    setTimeout(function () { $('#' + divName).fadeOut('slow'); }, 10000);
}

function isSessionAvailable() {
    if (getCookie(rememberMe) != null && getCookie(rememberMe) == '1') {
        if (getCookie(rememberMeKey) != null && getCookie(rememberMeKey) != '') {
            return true;
        } else {
            return false;
        }
    } else {
        if (getCookie(sessionKey) != null && getCookie(sessionKey) != '') {
            return true;
        } else {
            return false;
        }
    }
    //if (rememberMeFlag || getCookie("fsaSessionObjectRememberMe") == "1") {
    //    if (getCookie('fsaSessionObject') != null && getCookie('fsaSessionObject') != "") {
    //        var rememberMeFlag = true;
    //        return true;
    //    } else {
    //        return false;
    //    }
    //} else {
    //    if (sessionStorage.getItem('fsaSessionObject') != null && sessionStorage.getItem('fsaSessionObject') != "") {
    //        return true;
    //    } else {
    //        return false;
    //    }
    //}
}

function getCookie(c_name) {
    var c_value = document.cookie;
    var c_start = c_value.indexOf(" " + c_name + "=");
    if (c_start == -1) {
        c_start = c_value.indexOf(c_name + "=");
    }
    if (c_start == -1) {
        c_value = null;
    }
    else {
        c_start = c_value.indexOf("=", c_start) + 1;
        var c_end = c_value.indexOf(";", c_start);
        if (c_end == -1) {
            c_end = c_value.length;
        }
        c_value = unescape(c_value.substring(c_start, c_end));
    }
    return c_value;
}

function setCookie(c_name, value, exdays) {
    var exdate = new Date();
    exdate.setDate(exdate.getDate() + exdays);
    var c_value = escape(value) + ((exdays == null) ? "" : "; expires=" + exdate.toUTCString());
    document.cookie = c_name + "=" + c_value;
}