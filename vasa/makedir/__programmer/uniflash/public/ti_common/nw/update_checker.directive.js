(function () {
    'use strict';
    angular.module('uniflash').directive('ufUpdateChecker', ufUpdateChecker);
    function ufUpdateChecker() {
        var directive = {
            restrict: 'E',
            controller: UpdateChecker,
            controllerAs: 'vm',
            templateUrl: 'ti_common/nw/update_checker.template.html',
            scope: {},
        };
        return directive;
    }
    var UpdateChecker = (function () {
        function UpdateChecker($scope, ticAlerts, ticUpdateSrv) {
            this.$scope = $scope;
            this.ticAlerts = ticAlerts;
            this.ticUpdateSrv = ticUpdateSrv;
            this.updatesSupported = this.ticUpdateSrv.supported();
            this.checkUpdate();
        }
        UpdateChecker.prototype.checkUpdate = function () {
            var _this = this;
            if (this.ticUpdateSrv.checkUpdateOnStartup && this.updatesSupported) {
                this.checkingForUpdates = true;
                this.ticUpdateSrv.available(function (value) {
                    _this.checkingForUpdates = false;
                    _this.updatesFound = (value === 0);
                    if (!_this.$scope.$$phase) {
                        _this.$scope.$digest();
                    }
                });
            }
        };
        UpdateChecker.prototype.installUpdates = function () {
            var _this = this;
            this.ticAlerts.showConfirm('Install Update', 'Shutting down application and install available updates. Do you wish to continue?')
                .then(function () {
                _this.ticUpdateSrv.install();
            });
        };
        UpdateChecker.$inject = ['$scope', 'ticAlerts', 'ticUpdateSrv'];
        return UpdateChecker;
    }());
})();
