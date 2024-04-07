(function () {
    'use strict';
    angular.module('ti_common').service('ticAnalyticsSrv', ticAnalyticsSrv);
    function ticAnalyticsSrv() {
        function record(action, data) {
        }
        ;
        return {
            record: record
        };
    }
})();
