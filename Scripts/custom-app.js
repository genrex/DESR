var serviceRootUrl = "http://tusspdev1"; //window.location.protocol + "//" + window.location.host



var angApp = angular.module('catalog', ['ngRoute', 'ngSanitize'])
.config(['$routeProvider', function ($routeProvider) {
      $routeProvider.
          when('/login', { templateUrl: 'partials/login.html', controller: LoginController }).
          when('/home', { templateUrl: 'partials/Home.html', controller: HomeController }).
          when('/history', { templateUrl: 'partials/History.html', controller: HistoryController }).
          when('/history/:id', { templateUrl: 'partials/History.html', controller: HistoryController }).
          when('/search', { templateUrl: 'partials/Search.html', controller: SearchController }).
          when('/search/:searchstring', { templateUrl: 'partials/Search.html', controller: SearchController }).
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

angApp.filter('iif', function () {
    return function (input, trueValue, falseValue) {
        return input ? trueValue : falseValue;
    };
});

/* Controllers */
function LoginController($scope, $location, $rootScope, $http) {
    if (fsaApp.session.isSessionAvailable()) {
        $http({
            method: "GET",
            url: "svc.aspx?op=GetUserInfo&SPUrl=" + serviceRootUrl + "/sites/marketing",
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
            $location.path("/home");
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
            url: "svc.aspx?op=Authenticate&SPUrl=" + serviceRootUrl + "/sites/marketing&authInfo=" + Base64.encode($('#login').val() + ":" + $('#password').val()) + "&currentURL=" + window.location.href,
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
                    url: "svc.aspx?op=Login&SPUrl=" + serviceRootUrl + "/sites/marketing",
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
                    url: "svc.aspx?op=GetUserInfo&SPUrl=" + serviceRootUrl + "/sites/marketing",
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
                    $location.path("/home");
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
    AppLogoVisibility();
    showLoading(true);
    $('#main-top-div').show();
    $('.all-catalog-empty-cart').hide();
    if ($('#current-user-email').val() == '' || $scope.currentUserName === undefined || $scope.currentUserName=="") {
        $http({
            method: "GET",
            url: "svc.aspx?op=GetUserInfo&SPUrl=" + serviceRootUrl + "/sites/marketing",
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
            url: "svc.aspx?op=GetSystemTypes&SPUrl=" + serviceRootUrl + "/sites/busops",
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

    /*
    $scope.getHistoryStatuses = function () {
        showLoading(true);
        $('.history-status-empty-cart').hide();

        $scope.allURL = "svc.aspx?op=GetHistoryStatuses&SPUrl=" + serviceRootUrl + "/sites/busops";
        $http({
            method: "GET",
            url: $scope.allURL,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            headers: { "Authorization": fsaApp.session.getAuthenticationHeader() },
        })
        .success(function (data, status, headers, config) {
            $scope.historyStatuses = data.d.results;
            $scope.currentView = "History";
            $scope.getSystemTypes();

            if (data.d.results.length == 0)
                $('.history-status-empty-cart').show();
        })
        .error(function (data, status, headers, config) {
            $('#error-div').html('Error while fetching catalogs.');
            showTimedElem('error-div');
            showLoading(false);
        });
        
    }*/
}

function SearchController($scope, $location, $rootScope, $http, $filter, $routeParams) {
    AppLogoVisibility();
    showLoading(true);
    $('#main-top-div').show();
    $('.all-catalog-empty-cart').hide();

    if ($('#current-user-email').val() == '' || $scope.currentUserName === undefined || $scope.currentUserName == "") {
        $http({
            method: "GET",
            url: "svc.aspx?op=GetUserInfo&SPUrl=" + serviceRootUrl + "/sites/marketing",
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

    $scope.currentView = 'Search';
    $scope.filterModality = 'All';
    $scope.filterDocumentType = 'All';
    $scope.searchText = '';
    $scope.allPosition = 1;
    $scope.newestPosition = 1;
    $scope.newestCatalogs = [];
    $scope.allCatalogs = [];
    var cartCatalog = [];

    if ($routeParams.searchstring != null && $routeParams.searchstring != "") {
        var temps = $routeParams.searchstring.split(";");
        for (var i = 0; i < temps.length; i++) {
            var values = temps[i].split("=");
            if (values.length == 2) {
                if (values[0] == "documentType")
                    $scope.filterDocumentType = values[1];
                else if (values[0] == "searchText")
                    $scope.searchText = values[1];
            }
        }
    }


    $('#filterModality').change(function () {
        $scope.filterModality = $('#filterModality').val();

        location.href = "main.html#/search/" + "modality=" + $scope.filterModality + ";documentType=" + $scope.filterDocumentType + ";searchText=" + $scope.searchText;
    });

    $('#filterDocumentType').change(function () {
        $scope.filterDocumentType = $('#filterDocumentType').val();
        location.href = "main.html#/search/" + "modality=" + $scope.filterModality + ";documentType=" + $scope.filterDocumentType + ";searchText=" + $scope.searchText;
    });

    $scope.getSystemTypes = function () {
        showLoading(true);
        $http({
            method: "GET",
            url: "svc.aspx?op=GetSystemTypes&SPUrl=" + serviceRootUrl + "/sites/busops",
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

    
    showLoading(true);
    $scope.allURL = "svc.aspx?op=SearchCatalogs&SPUrl=" + serviceRootUrl + "/sites/busops&searchText=" + $scope.searchText + "&modality=" + $scope.filterModality + "&documentType=" + $scope.filterDocumentType;
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
        //$scope.searchText = $scope.searchTextTemp;
        //$scope.currentView = "Search";
        $scope.getSystemTypes();

        if (data.d.results.length == 0)
            $('.all-catalog-empty-cart').show();
    })
    .error(function (data, status, headers, config) {
        $('#error-div').html('Error while fetching catalogs.');
        showTimedElem('error-div');
        showLoading(false);
    });



    //$scope.getAllCatalogs();
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
            location.href = "main.html#/search/" + "modality=" + $scope.filterModality + ";documentType=" + $scope.filterDocumentType + ";searchText=" + $scope.searchText;
        }
    });

    $('#search-button').click(function (e) {
        $scope.searchText = $('#search-text-box').val();
        showLoading(true);
        location.href = "main.html#/search/" + "modality=" + $scope.filterModality + ";documentType=" + $scope.filterDocumentType + ";searchText=" + $scope.searchText;
    });

    $scope.addStatus = function (id) {
        $location.path('/mainCatalog/' + id);
    }

    
}



function CatalogController($scope, $location, $rootScope, $http, $filter, $routeParams) {
    AppLogoVisibility();
    showLoading(true);
    $('#main-top-div').show();
    if ($('#current-user-email').val() == '' || $scope.currentUserName === undefined || $scope.currentUserName == "") {
        $http({
            method: "GET",
            url: "svc.aspx?op=GetUserInfo&SPUrl=" + serviceRootUrl + "/sites/marketing",
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
        url: "svc.aspx?op=GetCatalogById&SPUrl=" + serviceRootUrl + "/sites/busops&id=" + $routeParams.id,
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
            url: "svc.aspx?op=GetCPLValues&SPUrl=" + serviceRootUrl + "/sites/busops",
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
    $scope.systemPerformedNotAsExpectedExplain = "";
    $scope.wereAnyIssuesDiscoveredWithSystemDuringDemo = "Yes";
    $scope.wasServiceContacted = "Yes";
    $scope.ConfirmSystemHddEmptiedOfAllPatientStudies = "Yes";
    $scope.ConfirmModalityWorkListRemovedFromSystem = "Yes";
    $scope.LayoutChangeExplain = "";

    $scope.saveStatus = function (isFinal) {
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

        var confirmMessage = 'Submit the status update?';
        if (isFinal == "Yes")
            confirmMessage = 'Do you want to submit a final status?\nPlease make sure.....';

        var sure = confirm(confirmMessage);
        if (sure) {
            showLoading(true);
            $http({
                method: "GET",
                url: "svc.aspx?op=AddStatus&SPUrl=" + serviceRootUrl + "/sites/busops&recordId=" + $routeParams.id + "&ControlPanelLayout=" + $scope.controlPanelLayout + "&ModalityWorkListEmpty=" + $scope.modalityWorkListEmpty + "&AllSoftwareLoadedAndFunctioning=" + $scope.allSoftwareLoadedAndFunctioning + "&IfNoExplain=" + $scope.allSoftwareLoadedAndFunctioningReason + "&NPDPresetsOnSystem=" + $scope.nPDPresetsOnSystem + "&HDDFreeOfPatientStudies=" + $scope.hDDFreeOfPatientStudies + "&DemoImagesLoadedOnHardDrive=" + $scope.demoImagesLoadedOnHardDrive + "&SystemPerformedAsExpected=" + $scope.systemPerformedAsExpected + "&AnyIssuesDuringDemo=" + $scope.wereAnyIssuesDiscoveredWithSystemDuringDemo + "&wasServiceContacted=" + $scope.wasServiceContacted + "&ConfirmModalityWorkListRemoved=" + $scope.ConfirmModalityWorkListRemovedFromSystem + "&ConfirmSystemHDDEmptied=" + $scope.ConfirmSystemHddEmptiedOfAllPatientStudies + "&LayoutChangeExplain=" + $scope.LayoutChangeExplain + "&Comments=" + $scope.Comments + "&WorkPhone=" + $scope.userInfo.WorkPhone + "&SystemPerformedNotAsExpectedExplain=" + $scope.systemPerformedNotAsExpectedExplain + "&IsFinal=" + isFinal,
                //url: $scope.currentURL,
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                headers: { "Authorization": fsaApp.session.getAuthenticationHeader() },
            })
            .success(function (data, status, headers, config) {
                $location.path('/search');
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
    AppLogoVisibility();
    showLoading(true);
    $('#main-top-div').show();
    if ($('#current-user-email').val() == '' || $scope.currentUserName === undefined || $scope.currentUserName == "") {
        $http({
            method: "GET",
            url: "svc.aspx?op=GetUserInfo&SPUrl=" + serviceRootUrl + "/sites/marketing",
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
        url: "svc.aspx?op=GetCPLValues&SPUrl=" + serviceRootUrl + "/sites/busops",
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
    $scope.systemPerformedNotAsExpectedExplain = "";
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
                url: "svc.aspx?op=AddNewStatus&SPUrl=" + serviceRootUrl + "/sites/busops&SerialNumber=" + $scope.SystemSerialNumber + "&SoftwareVersion=" + $scope.SoftwareVersion + "&RevisionLevel=" + $scope.RevisionLevel + "&SystemType=" + $scope.SystemType + "&Modality=" + $scope.Modality + "&ControlPanelLayout=" + $scope.controlPanelLayout + "&ModalityWorkListEmpty=" + $scope.modalityWorkListEmpty + "&AllSoftwareLoadedAndFunctioning=" + $scope.allSoftwareLoadedAndFunctioning + "&IfNoExplain=" + $scope.allSoftwareLoadedAndFunctioningReason + "&NPDPresetsOnSystem=" + $scope.nPDPresetsOnSystem + "&HDDFreeOfPatientStudies=" + $scope.hDDFreeOfPatientStudies + "&DemoImagesLoadedOnHardDrive=" + $scope.demoImagesLoadedOnHardDrive + "&SystemPerformedAsExpected=" + $scope.systemPerformedAsExpected + "&AnyIssuesDuringDemo=" + $scope.wereAnyIssuesDiscoveredWithSystemDuringDemo + "&wasServiceContacted=" + $scope.wasServiceContacted + "&ConfirmModalityWorkListRemoved=" + $scope.ConfirmModalityWorkListRemovedFromSystem + "&ConfirmSystemHDDEmptied=" + $scope.ConfirmSystemHddEmptiedOfAllPatientStudies + "&LayoutChangeExplain=" + $scope.LayoutChangeExplain + "&Comments=" + $scope.Comments + "&WorkPhone=" + $scope.userInfo.WorkPhone + "&SystemPerformedNotAsExpectedExplain=" + $scope.systemPerformedNotAsExpectedExplain + "&IsFinal=No",
                //url: $scope.currentURL,
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                headers: { "Authorization": fsaApp.session.getAuthenticationHeader() },
            })
            .success(function (data, status, headers, config) {
                $location.path('/search');
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

function HomeController($scope, $location, $rootScope, $http, $filter, $routeParams) {
    AppLogoVisibility();
    showLoading(true);
    $http({
        method: "GET",
        url: "svc.aspx?op=AccessedHelp&SPUrl=" + serviceRootUrl + "/sites/busops",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        headers: { "Authorization": fsaApp.session.getAuthenticationHeader() },
    })
    .success(function (data, status, headers, config) {
        showLoading(false);

        enableTopMenus(true);

        $scope.currentView = 'Home';
        $scope.filterModality = 'All';
        $scope.filterDocumentType = 'All';
        $scope.searchText = '';
        $scope.allPosition = 1;
        $scope.newestPosition = 1;
        $scope.newestCatalogs = [];
        $scope.allCatalogs = [];
        var cartCatalog = [];
    })
    .error(function (data, status, headers, config) {
        $('#error-div').html('Error while fetching User.');
        showTimedElem('error-div');
        showLoading(false);
    });
}

function HistoryController($scope, $location, $rootScope, $http, $filter, $routeParams) {
    AppLogoVisibility();
    showLoading(true);
    $('.history-status-empty-cart').hide();

    if ($routeParams.id != null && $routeParams.id != "")
        $scope.historyId = $routeParams.id;
    else
        $scope.historyId = 0;

    $http({
        method: "GET",
        url: "svc.aspx?op=GetHistoryStatuses&SPUrl=" + serviceRootUrl + "/sites/busops",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        headers: { "Authorization": fsaApp.session.getAuthenticationHeader() },
    })
    .success(function (data, status, headers, config) {
        showLoading(false);
        enableTopMenus(true);

        $scope.historyStatuses = data.d.results;

        if (data.d.results.length == 0)
            $('.history-status-empty-cart').show();
        else if ($scope.historyId > 0) {
            setTimeout(function () {
                if ($(".itemid_" + $scope.historyId).length > 0)
                    toggleHistoryStatusDetails($(".itemid_" + $scope.historyId).first());
                else
                    setTimeout(function () {
                        toggleHistoryStatusDetails($(".itemid_" + $scope.historyId).first());
                    }, 1000);
            }, 1000);
        }
    })
    .error(function (data, status, headers, config) {
        $('#error-div').html('Error while fetching catalogs.');
        showTimedElem('error-div');
        showLoading(false);
    });



    $scope.saveAdditionalComment = function (id) {
        var comment = $("#taAdditionalComment" + id).val();
        showLoading(true);

        $("#divAddCommentError" + id).hide();

        if (jQuery.trim(comment) != "") {
            $http({
                method: "GET",
                url: "svc.aspx?op=AddAdditionalComments&SPUrl=" + serviceRootUrl + "/sites/busops&itemid=" + id + "&comment=" + comment,
                //url: $scope.currentURL,
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                headers: { "Authorization": fsaApp.session.getAuthenticationHeader() },
            })
            .success(function (data, status, headers, config) {
                showLoading(false);
                if ($routeParams.id != null && $routeParams.id != "" && $routeParams.id == id)
                    location.reload(true);
                else 
                    $location.path('/history/' + id);                    
            })
            .error(function (data, status, headers, config) {
                $('#error-div').html('Error while fetching User.');
                showTimedElem('error-div');
                $('#error-div2').html('Please select all values.');
                showTimedElem('error-div2');
                showLoading(false);
            });
        }
        else {
            $("#divAddCommentError" + id).show();
        }
    };

        
    /*
    $http({
        method: "GET",
        url: "svc.aspx?op=AccessedHelp&SPUrl=" + serviceRootUrl + "/sites/busops",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        headers: { "Authorization": fsaApp.session.getAuthenticationHeader() },
    })
    .success(function (data, status, headers, config) {
        showLoading(false);

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
    })
    .error(function (data, status, headers, config) {
        $('#error-div').html('Error while fetching User.');
        showTimedElem('error-div');
        showLoading(false);
    });
    */
}

function HelpController($scope, $location, $rootScope, $http, $filter, $routeParams) {
    AppLogoVisibility();
    showLoading(true);
    $http({
        method: "GET",
        url: "svc.aspx?op=AccessedHelp&SPUrl=" + serviceRootUrl + "/sites/busops",
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
        url: "svc.aspx?op=LogOut&SPUrl=" + serviceRootUrl + "/sites/busops",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        headers: { "Authorization": fsaApp.session.getAuthenticationHeader() },
    })
    .success(function (data, status, headers, config) {
        fsaApp.session.removeSessionValue();
        window.location.href = "/VirtualApps/BusOpsWebs/TAMS.BUSOPS.DemoESR.Mobile/main.html#/login";
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


function toggleHistoryStatusDetails(obj) {
    if ($(obj).hasClass("history-collapsed")) {
        $(obj).removeClass("history-collapsed").addClass("history-expanded");
        $(obj).next().show();
    }
    else {
        $(obj).removeClass("history-expanded").addClass("history-collapsed");
        $(obj).next().hide();
    }
}


function showSearch() {
    if ($("#img-search-button").attr("src").indexOf("search-button2.png") > 0) {
        $("#img-search-button").attr("src", "Images/search-close-button2.png");
        $("#div-search-bar").show(400);
    }
    else {
        $("#img-search-button").attr("src", "Images/search-button2.png");
        $("#div-search-bar").hide(400);
    }
}

function GoBackHome() {
    var str = location.href.toLowerCase();
    if (str.indexOf("#/home") > 0)
        location.reload(true);
    else
        location.href = 'main.html#/home';
}


function DecodeUnicodeString(x) {
    var r = /\\u([\d\w]{4})/gi;
    x = x.replace(r, function (match, grp) {
        return String.fromCharCode(parseInt(grp, 16));
    });
    return unescape(x);
}

function AppLogoVisibility() {
    var location = window.location.href.toLowerCase();
    if (location.indexOf("#/home") > 0) {
        $("#appLogoLink").show();
        $("#appLogoBackLink").hide();
    }
    else {
        $("#appLogoLink").hide();
        $("#appLogoBackLink").show();
    }
}
