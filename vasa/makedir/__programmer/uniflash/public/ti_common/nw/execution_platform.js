var ti_common;
(function (ti_common) {
    var NWPlatform = (function () {
        function NWPlatform() {
        }
        NWPlatform.prototype.getPlatform = function () {
            return ti_common.PlatformType.NW;
        };
        return NWPlatform;
    }());
    angular.module('ti_common').service('ticExecutionPlatform', NWPlatform);
})(ti_common || (ti_common = {}));
