var angApp = angular.module('catalog', ['ngRoute'])
.config(['$routeProvider', function ($routeProvider) {
      $routeProvider.
          when('/login', { templateUrl: 'partials/login.html', controller: LoginController }).
          when('/mainCatalog', { templateUrl: 'partials/MainCatalog.html', controller: MainCatalogController }).
          when('/mainCatalog/:id', { templateUrl: 'partials/AddStatus.html', controller: CatalogController }).
          when('/newCatalog', { templateUrl: 'partials/AddNewStatus.html', controller: AddNewController }).
          when('/help', { templateUrl: 'partials/Help.html', controller: HelpController }).
          when('/logout', { templateUrl: 'partials/login.html', controller: LogOutController }).
          otherwise({ redirectTo: '/login' });
  }])
.service('sharedProperties', function () {
        var catalog = null;

        return {
            getProperty: function () {
                catalog = sessionStorage.getItem('myCatalog');
                if (catalog != null) {
                    return JSON.parse(catalog);
                }
                return null;
            },
            setProperty: function (value) {
                catalog = value;
                sessionStorage.setItem('myCatalog', JSON.stringify(catalog));
            },
            clearProperty: function (value) {
                catalog = null;
                sessionStorage.removeItem('myCatalog');
            }
        };
    })
.run(function ($rootScope, $location, $routeParams) {
    // register listener to watch route changes
    $('body').tooltip('disable');
    $rootScope.$on("$locationChangeStart", function (event, next, current) {
        if (!fsaApp.session.isSessionAvailable()) {
            // no logged user, we should be going to #login
            if (next.templateUrl != "partials/Login.html") {
                // not going to #/login, we should redirect now
                $location.path("/login");
            }
        }
    });
});

/* Controllers */
function LoginController($scope, $location, $rootScope, $http) {
    if (fsaApp.session.isSessionAvailable()) {
        $http({
            method: "GET",
            url: "svc.aspx?op=GetUserInfo&SPUrl=" + window.location.protocol + "//" + window.location.host + "/sites/marketing",
            //url: $scope.currentURL,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            headers: { "Authorization": fsaApp.session.getAuthenticationHeader() },
        })
        .success(function (data, status, headers, config) {
            if (data.d.results[1] != null && data.d.results[1] != '') {
                $scope.currentUserEmail = data.d.results[1];
            } else {
                $scope.currentUserEmail = 'abodla@tams.com';
            }
            $('#current-user-email').val($scope.currentUserEmail);
            $scope.currentUserName = data.d.results[0].toUpperCase();
            $('#span-username').html($scope.currentUserName);
            showLoading(false);
            $location.path("/mainCatalog");
        })
        .error(function (data, status, headers, config) {
            $('#error-div').html('Error while fetching User.');
            showTimedElem('error-div');
            showLoading(false);
        });
    } else {
        enableTopMenus(false);
        $('#main-top-div').hide();
        showLoading(false);
    }

    $('#login').keypress(function (e) {
        if (e.which == 13) {
            $scope.LoginUser();
        }
    });

    $('#password').keypress(function (e) {
        if (e.which == 13) {
            $scope.LoginUser();
        }
    });

    $scope.LoginUser = function () {
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

        var rememberMe = $scope.rememberMe;
        if (rememberMe === undefined) {
            rememberMe = false;
        }

        showLoading(true);
        $http({
            method: "GET",
            url: "svc.aspx?op=Authenticate&SPUrl=" + window.location.protocol + "//" + window.location.host + "/sites/marketing&authInfo=" + Base64.encode($('#login').val() + ":" + $('#password').val()) + "&currentURL=" + window.location.href,
            //url: $scope.currentURL,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            headers: { "Accept": "application/json; odata=verbose" },
        })
        .success(function (data, status, headers, config) {
            if (data.d.results) {
                fsaApp.session.setSessionValue(Base64.encode($('#login').val() + ":" + $('#password').val()), rememberMe);
                $http({
                    method: "GET",
                    url: "svc.aspx?op=Login&SPUrl=" + window.location.protocol + "//" + window.location.host + "/sites/marketing",
                    //url: $scope.currentURL,
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    headers: { "Authorization": fsaApp.session.getAuthenticationHeader() },
                })
                .success(function (data, status, headers, config) {
                })
                .error(function (data, status, headers, config) {
                    $('#td-error').html('Error while fetching User.');
                    showTimedElem('error-div');
                    showLoading(false);
                });
                $http({
                    method: "GET",
                    url: "svc.aspx?op=GetUserInfo&SPUrl=" + window.location.protocol + "//" + window.location.host + "/sites/marketing",
                    //url: $scope.currentURL,
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    headers: { "Authorization": fsaApp.session.getAuthenticationHeader() },
                })
                .success(function (data, status, headers, config) {
                    if (data.d.results[1] != null && data.d.results[1] != '') {
                        $scope.currentUserEmail = data.d.results[1];
                    } else {
                        $scope.currentUserEmail = 'abodla@tams.com';
                    }
                    $('#current-user-email').val($scope.currentUserEmail);
                    $scope.currentUserName = data.d.results[0].toUpperCase();
                    $('#span-username').html($scope.currentUserName);
                    showLoading(false);
                    $location.path("/mainCatalog");
                })
                .error(function (data, status, headers, config) {
                    $('#td-error').html('Error while fetching User.');
                    showTimedElem('error-div');
                    showLoading(false);
                });
            } else {
                $('#td-error').html("Invalid login and/or password.");
                showTimedElem('td-error');
                showLoading(false);
            }
        })
        .error(function (data, status, headers, config) {
            $('#td-error').html('Error connecting to service.');
            showTimedElem('td-error');
            showLoading(false);
        });
    }
}

function MainCatalogController($scope, $location, $rootScope, $http, $filter, sharedProperties) {
    showLoading(true);
    $('#main-top-div').show();
    if ($('#current-user-email').val() == '' || $scope.currentUserName === undefined || $scope.currentUserName=="") {
        $http({
            method: "GET",
            url: "svc.aspx?op=GetUserInfo&SPUrl=" + window.location.protocol + "//" + window.location.host + "/sites/marketing",
            //url: $scope.currentURL,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            headers: { "Authorization": fsaApp.session.getAuthenticationHeader() },
        })
        .success(function (data, status, headers, config) {
            if (data.d.results[1] != null && data.d.results[1] != '') {
                $scope.currentUserEmail = data.d.results[1];
            } else {
                $scope.currentUserEmail = 'abodla@tams.com';
            }
            $('#current-user-email').val($scope.currentUserEmail);
            $scope.currentUserName = data.d.results[0].toUpperCase();
            $('#span-username').html($scope.currentUserName);
        })
        .error(function (data, status, headers, config) {
            $('#error-div').html('Error while fetching User.');
            showTimedElem('error-div');
            showLoading(false);
        });
    }

    enableTopMenus(true);
    
    $scope.currentView = 'All';
    $scope.filterModality = 'All';
    $scope.filterDocumentType = 'All';
    $scope.searchText = '';
    $scope.allPosition = 1;
    $scope.newestPosition = 1;
    $scope.newestCatalogs = [];
    $scope.allCatalogs = [];
    var cartCatalog = [];

    $(document).scroll(function () {
        if ($(window).scrollTop() + $(window).height() == $(document).height()) {
            if ($location.path() == '/mainCatalog') {
                if ($scope.currentView == 'All') {
                    $scope.allPosition++;
                    $scope.getAllCatalogs();
                }

                if ($scope.currentView == 'Newest') {
                    $scope.newestPosition++;
                    $scope.getNewestCatalog();
                }
            }
        }
    });

    $('#filterModality').change(function () {
        $scope.filterModality = $('#filterModality').val();
        if ($scope.currentView == "All") {
            $scope.allCatalogs = [];
            $scope.getAllCatalogs();
        } else if ($scope.currentView == "Newest") {
            $scope.newestCatalogs = [];
            $scope.getNewestCatalog();
        } else {
            $scope.searchCatalogs();
        }
    });

    $('#filterDocumentType').change(function () {
        $scope.filterDocumentType = $('#filterDocumentType').val();
        if ($scope.currentView == "All") {
            $scope.allCatalogs = [];
            $scope.getAllCatalogs();
        } else if ($scope.currentView == "Newest") {
            $scope.newestCatalogs = [];
            $scope.getNewestCatalog();
        } else {
            $scope.searchCatalogs();
        }
    });

    $scope.getSystemTypes = function () {
        showLoading(true);
       $http({
            method: "GET",
            url: "svc.aspx?op=GetSystemTypes&SPUrl=" + window.location.protocol + "//" + window.location.host + "/sites/busops",
            //url: $scope.currentURL,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            headers: { "Authorization": fsaApp.session.getAuthenticationHeader() },
        })
        .success(function (data, status, headers, config) {
            $scope.systemTypes = data.d.results;            
            showLoading(false);
        })
        .error(function (data, status, headers, config) {
            $('#error-div').html('Error while fetching catalogs.');
            showTimedElem('error-div');
            showLoading(false);
        });
    }

    $scope.getAllCatalogs = function () {
        showLoading(true);
        $scope.allURL = "svc.aspx?op=GetAllCatalogs&SPUrl=" + window.location.protocol + "//" + window.location.host + "/sites/busops&position=" + $scope.allPosition + "&modality=" + $scope.filterModality + "&documentType=" + $scope.filterDocumentType;
        $http({
            method: "GET",
            url: $scope.allURL,
            //url: $scope.currentURL,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            headers: { "Authorization": fsaApp.session.getAuthenticationHeader() },
        })
        .success(function (data, status, headers, config) {
            $scope.allCatalogs = data.d.results;
            $scope.allCatalogs.forEach(function (node) {
                if (node.System_x0020_Date !== undefined && node.System_x0020_Date != null && node.System_x0020_Date != "") {
                    node.System_x0020_Date = node.System_x0020_Date.substr(0, node.System_x0020_Date.indexOf(' '));
                    node.MCSS = node.MCSS.substr(node.MCSS.indexOf("#") + 1);
                }
            });
            $scope.currentView = "All";
            $scope.getSystemTypes();
        })
        .error(function (data, status, headers, config) {
            $('#error-div').html('Error while fetching catalogs.');
            showTimedElem('error-div');
            showLoading(false);
        });
    }

    $scope.getNewestCatalog = function () {
        showLoading(true);
        $scope.allURL = "svc.aspx?op=GetNewestCatalogs&SPUrl=" + window.location.protocol + "//" + window.location.host + "/sites/busops&position=" + $scope.newestPosition + "&modality=" + $scope.filterModality + "&documentType=" + $scope.filterDocumentType;
        $http({
            method: "GET",
            url: $scope.allURL,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            headers: { "Authorization": fsaApp.session.getAuthenticationHeader() },
        })
        .success(function (data, status, headers, config) { 
            $scope.newestCatalogs = data.d.results;
            $scope.newestCatalogs.forEach(function (node) {
                if (node.System_x0020_Date !== undefined && node.System_x0020_Date != null && node.System_x0020_Date != "") {
                    node.System_x0020_Date = node.System_x0020_Date.substr(0, node.System_x0020_Date.indexOf(' '));
                    node.MCSS = node.MCSS.substr(node.MCSS.indexOf("#") + 1);
                }
            });
            $scope.currentView = "Newest";
            $scope.getSystemTypes();
        })
        .error(function (data, status, headers, config) {
            $('#error-div').html('Error while fetching catalogs.');
            showTimedElem('error-div');
            showLoading(false);
        });
    }    

    $scope.searchCatalogs = function () {
        $scope.searchTextTemp = $('#search-text-box').val();
        if ($('#search-text-box').val() == "") {
            $('#error-div').html('Please enter value to search');
            showTimedElem('error-div');
            showLoading(false);
            return;
        }
        showLoading(true);
        $scope.allURL = "svc.aspx?op=SearchCatalogs&SPUrl=" + window.location.protocol + "//" + window.location.host + "/sites/busops&searchText=" + $scope.searchText + "&modality=" + $scope.filterModality + "&documentType=" + $scope.filterDocumentType;
        $http({
            method: "GET",
            url: $scope.allURL,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            headers: { "Authorization": fsaApp.session.getAuthenticationHeader() },
        })
        .success(function (data, status, headers, config) {
            $scope.allCatalogs = data.d.results;
            $scope.allCatalogs.forEach(function (node) {
                if (node.System_x0020_Date !== undefined && node.System_x0020_Date != null && node.System_x0020_Date != "") {
                    node.System_x0020_Date = node.System_x0020_Date.substr(0, node.System_x0020_Date.indexOf(' '));
                    node.MCSS = node.MCSS.substr(node.MCSS.indexOf("#") + 1);
                }
            });
            $scope.searchText = $scope.searchTextTemp;
            $scope.currentView = "Search";
            $scope.getSystemTypes();
        })
        .error(function (data, status, headers, config) {
            $('#error-div').html('Error while fetching catalogs.');
            showTimedElem('error-div');
            showLoading(false);
        });
    
    }


    $scope.getAllCatalogs();
    $scope.incrementValue = function (prefix, id) {
        $('#quantity-' + prefix + id).val(parseInt($('#quantity-' + prefix + id).val()) + 1);
    }

    $scope.decrementValue = function (prefix, id) {
        if ($('#quantity-' + prefix + id).val() != '0') {
            $('#quantity-' + prefix + id).val(parseInt($('#quantity-' + prefix + id).val()) - 1);
        }
    }
        
    $('#search-text-box').keypress(function (e) {
        $scope.searchText = $('#search-text-box').val();
        if (e.which == 13) {
            showLoading(true);
            $scope.$apply($scope.searchCatalogs());
        }
    });

    $scope.addStatus = function (id) {
        $location.path('/mainCatalog/' + id);
    }
}

function CatalogController($scope, $location, $rootScope, $http, $filter, $routeParams) {
    showLoading(true);
    $('#main-top-div').show();
    if ($('#current-user-email').val() == '' || $scope.currentUserName === undefined || $scope.currentUserName == "") {
        $http({
            method: "GET",
            url: "svc.aspx?op=GetUserInfo&SPUrl=" + window.location.protocol + "//" + window.location.host + "/sites/marketing",
            //url: $scope.currentURL,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            headers: { "Authorization": fsaApp.session.getAuthenticationHeader() },
        })
        .success(function (data, status, headers, config) {
            if (data.d.results[1] != null && data.d.results[1] != '') {
                $scope.currentUserEmail = data.d.results[1];
            } else {
                $scope.currentUserEmail = 'abodla@tams.com';
            }
            $('#current-user-email').val($scope.currentUserEmail);
            $scope.currentUserName = data.d.results[0].toUpperCase();
            $('#span-username').html($scope.currentUserName);
            $http({
                method: "GET",
                url: "/VirtualApps/ENTWebs/TAMS.ENT.SQLTOREST.Web/svc.aspx?op=GetData&conn=TestConnString&cmd=EXEC%20prd_FilterByEmployeeEmail%20@EmployeeStatus%20=%20N%27T%27,%20@Email%20=%20N%27" + $('#current-user-email').val() + "%27",
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                headers: { "Authorization": fsaApp.session.getAuthenticationHeader() },
            })
            .success(function (data, status, headers, config) {
                $scope.userInfo = data.d.results[0];
            })
            .error(function (data, status, headers, config) {
                $('#error-div').html('Error while fetching employee record.');
                showTimedElem('error-div');
                showLoading(false);
            });
        })
        .error(function (data, status, headers, config) {
            $('#error-div').html('Error while fetching User.');
            showTimedElem('error-div');
            showLoading(false);
        });
    } else {
        $http({
            method: "GET",
            url: "/VirtualApps/ENTWebs/TAMS.ENT.SQLTOREST.Web/svc.aspx?op=GetData&conn=TestConnString&cmd=EXEC%20prd_FilterByEmployeeEmail%20@EmployeeStatus%20=%20N%27T%27,%20@Email%20=%20N%27" + $('#current-user-email').val() + "%27",
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            headers: { "Authorization": fsaApp.session.getAuthenticationHeader() },
        })
        .success(function (data, status, headers, config) {
            $scope.userInfo = data.d.results[0];
        })
        .error(function (data, status, headers, config) {
            $('#error-div').html('Error while fetching employee record.');
            showTimedElem('error-div');
            showLoading(false);
        });
    }

    $http({
        method: "GET",
        url: "svc.aspx?op=GetCatalogById&SPUrl=" + window.location.protocol + "//" + window.location.host + "/sites/busops&id=" + $routeParams.id,
        //url: $scope.currentURL,
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        headers: { "Authorization": fsaApp.session.getAuthenticationHeader() },
    })
    .success(function (data, status, headers, config) {
        $scope.catalog = data.d.results[0];
        $scope.catalog.System_x0020_Date = $scope.catalog.System_x0020_Date.substr(0, $scope.catalog.System_x0020_Date.indexOf(' '));
        $scope.catalog.MCSS = $scope.catalog.MCSS.substr($scope.catalog.MCSS.indexOf("#") + 1);
        $http({
            method: "GET",
            url: "svc.aspx?op=GetCPLValues&SPUrl=" + window.location.protocol + "//" + window.location.host + "/sites/busops",
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            headers: { "Authorization": fsaApp.session.getAuthenticationHeader() },
        })
        .success(function (data, status, headers, config) {
            $scope.cPLValues = data.d.results;
            showLoading(false);
        })
        .error(function (data, status, headers, config) {
            $('#error-div').html('Error while fetching User.');
            showTimedElem('error-div');
            showLoading(false);
        });
    })
    .error(function (data, status, headers, config) {
        $('#error-div').html('Error while fetching User.');
        showTimedElem('error-div');
        showLoading(false);
    });

    $scope.controlPanelLayout = "-- Please Select --";
    $scope.modalityWorkListEmpty = "Yes";
    $scope.allSoftwareLoadedAndFunctioning = "Yes";
    $scope.allSoftwareLoadedAndFunctioningReason = "";
    $scope.nPDPresetsOnSystem = "Yes";
    $scope.hDDFreeOfPatientStudies = "Yes";
    $scope.demoImagesLoadedOnHardDrive = "Yes";
    $scope.systemPerformedAsExpected = "Yes";
    $scope.wereAnyIssuesDiscoveredWithSystemDuringDemo = "Yes";
    $scope.wasServiceContacted = "Yes";
    $scope.ConfirmSystemHddEmptiedOfAllPatientStudies = "Yes";
    $scope.ConfirmModalityWorkListRemovedFromSystem = "Yes";
    $scope.LayoutChangeExplain = "";

    $scope.saveStatus = function () {
        if ($scope.controlPanelLayout == "-- Please Select --" || $scope.modalityWorkListEmpty == "" || $scope.allSoftwareLoadedAndFunctioning == "" || $scope.nPDPresetsOnSystem == "" || $scope.hDDFreeOfPatientStudies == "" || $scope.demoImagesLoadedOnHardDrive == "" || $scope.systemPerformedAsExpected == "" || $scope.wereAnyIssuesDiscoveredWithSystemDuringDemo == "" || $scope.ConfirmSystemHddEmptiedOfAllPatientStudies == "" || $scope.ConfirmModalityWorkListRemovedFromSystem == "") {
            $('#error-div').html('Please select all values.');
            showTimedElem('error-div');
            $('#error-div2').html('Please select all values.');
            showTimedElem('error-div2');
            showLoading(false);
            return;
        }

        if ($scope.controlPanelLayout == "Control panel changed" && $scope.LayoutChangeExplain == "") {
            $('#error-div').html('Please fill all values.');
            showTimedElem('error-div');
            $('#error-div2').html('Please fill all values.');
            showTimedElem('error-div2');
            showLoading(false);
            return;
        }

        if ($scope.allSoftwareLoadedAndFunctioning == "No" && $scope.allSoftwareLoadedAndFunctioningReason == "") {
            $('#error-div').html('Please fill all values.');
            showTimedElem('error-div');
            $('#error-div2').html('Please fill all values.');
            showTimedElem('error-div2');
            showLoading(false);
            return;
        }

        if ($scope.wereAnyIssuesDiscoveredWithSystemDuringDemo == "Yes" && $scope.wasServiceContacted == "") {
            $('#error-div').html('Please fill all values.');
            showTimedElem('error-div');
            $('#error-div2').html('Please fill all values.');
            showTimedElem('error-div2');
            showLoading(false);
            return;
        }

        var sure = confirm('Submit the status update?');
        if (sure) {
            showLoading(true);
            $http({
                method: "GET",
                url: "svc.aspx?op=AddStatus&SPUrl=" + window.location.protocol + "//" + window.location.host + "/sites/busops&recordId=" + $routeParams.id + "&ControlPanelLayout=" + $scope.controlPanelLayout + "&ModalityWorkListEmpty=" + $scope.modalityWorkListEmpty + "&AllSoftwareLoadedAndFunctioning=" + $scope.allSoftwareLoadedAndFunctioning + "&IfNoExplain=" + $scope.allSoftwareLoadedAndFunctioningReason + "&NPDPresetsOnSystem=" + $scope.nPDPresetsOnSystem + "&HDDFreeOfPatientStudies=" + $scope.hDDFreeOfPatientStudies + "&DemoImagesLoadedOnHardDrive=" + $scope.demoImagesLoadedOnHardDrive + "&SystemPerformedAsExpected=" + $scope.systemPerformedAsExpected + "&AnyIssuesDuringDemo=" + $scope.wereAnyIssuesDiscoveredWithSystemDuringDemo + "&wasServiceContacted=" + $scope.wasServiceContacted + "&ConfirmModalityWorkListRemoved=" + $scope.ConfirmModalityWorkListRemovedFromSystem + "&ConfirmSystemHDDEmptied=" + $scope.ConfirmSystemHddEmptiedOfAllPatientStudies + "&LayoutChangeExplain=" + $scope.LayoutChangeExplain + "&Comments=" + $scope.Comments + "&WorkPhone=" + $scope.userInfo.WorkPhone,
                //url: $scope.currentURL,
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                headers: { "Authorization": fsaApp.session.getAuthenticationHeader() },
            })
            .success(function (data, status, headers, config) {
                $location.path('/mainCatalog');
                showLoading(false);
            })
            .error(function (data, status, headers, config) {
                $('#error-div').html('Error while fetching User.');
                showTimedElem('error-div');
                $('#error-div2').html('Please select all values.');
                showTimedElem('error-div2');
                showLoading(false);
            });
            //$location.path('/mainCatalog');
        }
    }

    $scope.cancelStatus = function () {
        var sure = confirm('Cancel the status update and go back to main screen?');
        if (sure) {
            $location.path('/mainCatalog');
        }
    }


}

function AddNewController($scope, $location, $rootScope, $http, $filter, $routeParams) {
    showLoading(true);
    $('#main-top-div').show();
    if ($('#current-user-email').val() == '' || $scope.currentUserName === undefined || $scope.currentUserName == "") {
        $http({
            method: "GET",
            url: "svc.aspx?op=GetUserInfo&SPUrl=" + window.location.protocol + "//" + window.location.host + "/sites/marketing",
            //url: $scope.currentURL,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            headers: { "Authorization": fsaApp.session.getAuthenticationHeader() },
        })
        .success(function (data, status, headers, config) {
            if (data.d.results[1] != null && data.d.results[1] != '') {
                $scope.currentUserEmail = data.d.results[1];
            } else {
                $scope.currentUserEmail = 'abodla@tams.com';
            }
            $('#current-user-email').val($scope.currentUserEmail);
            $scope.currentUserName = data.d.results[0].toUpperCase();
            $('#span-username').html($scope.currentUserName);
            $http({
                method: "GET",
                url: "/VirtualApps/ENTWebs/TAMS.ENT.SQLTOREST.Web/svc.aspx?op=GetData&conn=TestConnString&cmd=EXEC%20prd_FilterByEmployeeEmail%20@EmployeeStatus%20=%20N%27T%27,%20@Email%20=%20N%27" + $('#current-user-email').val() + "%27",
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                headers: { "Authorization": fsaApp.session.getAuthenticationHeader() },
            })
            .success(function (data, status, headers, config) {
                $scope.userInfo = data.d.results[0];
            })
            .error(function (data, status, headers, config) {
                $('#error-div').html('Error while fetching employee record.');
                showTimedElem('error-div');
                showLoading(false);
            });
        })
        .error(function (data, status, headers, config) {
            $('#error-div').html('Error while fetching User.');
            showTimedElem('error-div');
            showLoading(false);
        });
    } else {
        $http({
            method: "GET",
            url: "/VirtualApps/ENTWebs/TAMS.ENT.SQLTOREST.Web/svc.aspx?op=GetData&conn=TestConnString&cmd=EXEC%20prd_FilterByEmployeeEmail%20@EmployeeStatus%20=%20N%27T%27,%20@Email%20=%20N%27" + $('#current-user-email').val() + "%27",
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            headers: { "Authorization": fsaApp.session.getAuthenticationHeader() },
        })
        .success(function (data, status, headers, config) {
            $scope.userInfo = data.d.results[0];
        })
        .error(function (data, status, headers, config) {
            $('#error-div').html('Error while fetching employee record.');
            showTimedElem('error-div');
            showLoading(false);
        });
    }

    $scope.currentDate = new Date();

    $http({
        method: "GET",
        url: "svc.aspx?op=GetCPLValues&SPUrl=" + window.location.protocol + "//" + window.location.host + "/sites/busops",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        headers: { "Authorization": fsaApp.session.getAuthenticationHeader() },
    })
    .success(function (data, status, headers, config) {
        $scope.cPLValues = data.d.results;
        showLoading(false);
    })
    .error(function (data, status, headers, config) {
        $('#error-div').html('Error while fetching User.');
        showTimedElem('error-div');
        showLoading(false);
    });

    $scope.controlPanelLayout = "-- Please Select --";
    $scope.modalityWorkListEmpty = "Yes";
    $scope.allSoftwareLoadedAndFunctioning = "Yes";
    $scope.allSoftwareLoadedAndFunctioningReason = "";
    $scope.nPDPresetsOnSystem = "Yes";
    $scope.hDDFreeOfPatientStudies = "Yes";
    $scope.demoImagesLoadedOnHardDrive = "Yes";
    $scope.systemPerformedAsExpected = "Yes";
    $scope.wereAnyIssuesDiscoveredWithSystemDuringDemo = "Yes";
    $scope.wasServiceContacted = "Yes";
    $scope.ConfirmSystemHddEmptiedOfAllPatientStudies = "Yes";
    $scope.ConfirmModalityWorkListRemovedFromSystem = "Yes";
    $scope.LayoutChangeExplain = "";
    $scope.SystemType = "";
    $scope.SystemSerialNumber = "";
    $scope.SoftwareVersion = "";
    $scope.RevisionLevel = "";
    $scope.Modality = "-- Please Select --";

    $scope.saveStatus = function () {
        if ($scope.SystemType == "") {
            $('#error-div').html('Please fill all values.');
            showTimedElem('error-div');
            $('#error-div2').html('Please fill all values.');
            showTimedElem('error-div2');
            showLoading(false);
            return;
        }
        if ($scope.SystemType == "" || $scope.SystemSerialNumber == "" || $scope.SoftwareVersion == "" || $scope.RevisionLevel == "" || $scope.Modality == "-- Please Select --" || $scope.controlPanelLayout == "-- Please Select --" || $scope.modalityWorkListEmpty == "" || $scope.allSoftwareLoadedAndFunctioning == "" || $scope.nPDPresetsOnSystem == "" || $scope.hDDFreeOfPatientStudies == "" || $scope.demoImagesLoadedOnHardDrive == "" || $scope.systemPerformedAsExpected == "" || $scope.wereAnyIssuesDiscoveredWithSystemDuringDemo == "" || $scope.ConfirmSystemHddEmptiedOfAllPatientStudies == "" || $scope.ConfirmModalityWorkListRemovedFromSystem == "") {
            $('#error-div').html('Please select all values.');
            showTimedElem('error-div');
            $('#error-div2').html('Please select all values.');
            showTimedElem('error-div2');
            showLoading(false);
            return;
        }

        if ($scope.controlPanelLayout == "Control panel changed" && $scope.LayoutChangeExplain == "") {
            $('#error-div').html('Please fill all values.');
            showTimedElem('error-div');
            $('#error-div2').html('Please fill all values.');
            showTimedElem('error-div2');
            showLoading(false);
            return;
        }

        if ($scope.allSoftwareLoadedAndFunctioning == "No" && $scope.allSoftwareLoadedAndFunctioningReason == "") {
            $('#error-div').html('Please fill all values.');
            showTimedElem('error-div');
            $('#error-div2').html('Please fill all values.');
            showTimedElem('error-div2');
            showLoading(false);
            return;
        }

        if ($scope.wereAnyIssuesDiscoveredWithSystemDuringDemo == "Yes" && $scope.wasServiceContacted == "") {
            $('#error-div').html('Please fill all values.');
            showTimedElem('error-div');
            $('#error-div2').html('Please fill all values.');
            showTimedElem('error-div2');
            showLoading(false);
            return;
        }

        var sure = confirm('Submit the status update?');
        if (sure) {
            showLoading(true);
            $http({
                method: "GET",
                url: "svc.aspx?op=AddNewStatus&SPUrl=" + window.location.protocol + "//" + window.location.host + "/sites/busops&SerialNumber=" + $scope.SystemSerialNumber + "&SoftwareVersion=" + $scope.SoftwareVersion + "&RevisionLevel=" + $scope.RevisionLevel + "&SystemType=" + $scope.SystemType + "&Modality=" + $scope.Modality + "&ControlPanelLayout=" + $scope.controlPanelLayout + "&ModalityWorkListEmpty=" + $scope.modalityWorkListEmpty + "&AllSoftwareLoadedAndFunctioning=" + $scope.allSoftwareLoadedAndFunctioning + "&IfNoExplain=" + $scope.allSoftwareLoadedAndFunctioningReason + "&NPDPresetsOnSystem=" + $scope.nPDPresetsOnSystem + "&HDDFreeOfPatientStudies=" + $scope.hDDFreeOfPatientStudies + "&DemoImagesLoadedOnHardDrive=" + $scope.demoImagesLoadedOnHardDrive + "&SystemPerformedAsExpected=" + $scope.systemPerformedAsExpected + "&AnyIssuesDuringDemo=" + $scope.wereAnyIssuesDiscoveredWithSystemDuringDemo + "&wasServiceContacted=" + $scope.wasServiceContacted + "&ConfirmModalityWorkListRemoved=" + $scope.ConfirmModalityWorkListRemovedFromSystem + "&ConfirmSystemHDDEmptied=" + $scope.ConfirmSystemHddEmptiedOfAllPatientStudies + "&LayoutChangeExplain=" + $scope.LayoutChangeExplain + "&Comments=" + $scope.Comments + "&WorkPhone=" + $scope.userInfo.WorkPhone,
                //url: $scope.currentURL,
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                headers: { "Authorization": fsaApp.session.getAuthenticationHeader() },
            })
            .success(function (data, status, headers, config) {
                $location.path('/mainCatalog');
                showLoading(false);
            })
            .error(function (data, status, headers, config) {
                $('#error-div').html('Error while fetching User.');
                showTimedElem('error-div');
                $('#error-div2').html('Please select all values.');
                showTimedElem('error-div2');
                showLoading(false);
            });
            //$location.path('/mainCatalog');
        }
    }

    $scope.cancelStatus = function () {
        var sure = confirm('Cancel the status update and go back to main screen?');
        if (sure) {
            $location.path('/mainCatalog');
        }
    }


}

function HelpController($scope, $location, $rootScope, $http, $filter, $routeParams) {
    showLoading(true);
    $http({
        method: "GET",
        url: "svc.aspx?op=AccessedHelp&SPUrl=" + window.location.protocol + "//" + window.location.host + "/sites/busops",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        headers: { "Authorization": fsaApp.session.getAuthenticationHeader() },
    })
    .success(function (data, status, headers, config) {
        showLoading(false);
    })
    .error(function (data, status, headers, config) {
        $('#error-div').html('Error while fetching User.');
        showTimedElem('error-div');
        showLoading(false);
    });
}

function LogOutController($scope, $location, $rootScope, $http, $filter, $routeParams) {
    $http({
        method: "GET",
        url: "svc.aspx?op=LogOut&SPUrl=" + window.location.protocol + "//" + window.location.host + "/sites/busops",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        headers: { "Authorization": fsaApp.session.getAuthenticationHeader() },
    })
    .success(function (data, status, headers, config) {
        fsaApp.session.removeSessionValue();
        window.location.href = "/VirtualApps/BusOpsWebs/TAMS.BUSOPS.DemoEquipmentStatusRequest.Mobile/main.html#/login";
    })
    .error(function (data, status, headers, config) {
        $('#error-div').html('Error while fetching User.');
        showTimedElem('error-div');
        showLoading(false);
    });
}
/* Helpers */
function showLoading(show) {
    if (show) {
        $('#curtain').show();
        $('#hour-glass').show();
    } else {
        $('#curtain').hide();
        $('#hour-glass').hide();
    }

}

function enableTopMenus(enable) {
    if (enable) {
        $('#div-shopping-cart').show();
        $('#img-left-bars').show();
    } else {
        $('#div-shopping-cart').hide();
        $('#img-left-bars').hide();
    }
}

function showMenu() {
    if ($('#div-menu').css('display') == 'none') {
        $('#div-menu').show();
        $('#img-left-bars').hide();
        $('#menu-close-button').show();
        var timer = setTimeout(hideMenu, 4000);
    } else {
        $('#img-left-bars').show();
        $('#menu-close-button').hide();
        $('#div-menu').hide();
    }
}

function hideMenu() {
    $('#img-left-bars').show();
    $('#menu-close-button').hide();
    $('#div-menu').hide();
}

function showTimedElem(divName) {
    $('#' + divName).fadeIn('slow');
    $('#' + divName).focus();
    setTimeout(function () { $('#' + divName).fadeOut('slow'); }, 10000);
}

function SetPageTitle(title) {
    $('#page-title').html(title);
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
