var fsaApp;
$(document).ready(function () {
    //Initialize the FSAApplication
    
});

// REGION: FSAApplication Object
function FSAApplication() {
    this.session = new FSASession(this);
}
////////////////////////////////

//REGION: FSASession Object
function FSASession(app) {

    this.parent = app;
    this.rememberMeFlag = false;

    //check for the availability of the session.
    this.isSessionAvailable = isSessionAvailable;
    function isSessionAvailable() {
        if (this.rememberMeFlag || getCookie("fsaSessionObjectRememberMe") == "1") {
            if (getCookie('fsaSessionObject') != null && getCookie('fsaSessionObject') != "") {
                this.rememberMeFlag = true;
                return true;
            } else {
                return false;
            }
        } else {
            if (sessionStorage.getItem('fsaSessionObject') != null && sessionStorage.getItem('fsaSessionObject') != "") {
                return true;
            } else {
                return false;
            }
        }
    }

    this.setSessionValue = setSessionValue;
    function setSessionValue(value, rememberMe) {
        if (rememberMe) {
            setCookie("fsaSessionObject", value, 10);
            setCookie("fsaSessionObjectRememberMe", "1", 10);
            this.rememberMeFlag = true;
        } else {
            sessionStorage.setItem("fsaSessionObject", value);
            this.rememberMeFlag = false;
        }
    }

    this.getSessionValue = getSessionValue;
    function getSessionValue() {
        if (this.rememberMeFlag || getCookie("fsaSessionObjectRememberMe") == "1") {
            return getCookie("fsaSessionObject");
        } else {
            return sessionStorage.getItem("fsaSessionObject");
        }
    }

    this.getUserName = getUserName;
    function getUserName() {
        if (this.rememberMeFlag) {
            return jQuery.parseJSON(getCookie("fsaSessionObject")).User.toUpperCase();
        } else {
            return jQuery.parseJSON(sessionStorage.getItem("fsaSessionObject")).User.toUpperCase();
        }
    }

    this.getAuthenticationHeader = getAuthenticationHeader;
    function getAuthenticationHeader() {
        if (this.rememberMeFlag) {
            var ss = getCookie("fsaSessionObject");
            return 'Basic ' + ss;
        } else {
            var ss = sessionStorage.getItem("fsaSessionObject");
            return 'Basic ' + ss;
        }
    }

    this.removeSessionValue = removeSessionValue;
    function removeSessionValue() {
        if (this.rememberMeFlag) {
            setCookie("fsaSessionObject", "", -2);
            setCookie("fsaSessionObjectRememberMe", "0", -2);
        } else {
            sessionStorage.removeItem("fsaSessionObject");
        }
        this.rememberMeFlag = false;
    }

}
////////////////////////////////

//REGION: Exception Objects
function Exception401(msg) {
    this.message = msg;
}

function Exception500(msg) {
    this.message = msg;
}

function ExceptionOther(name, msg) {
    this.name = msg;
    this.message = msg;
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

fsaApp = new FSAApplication();