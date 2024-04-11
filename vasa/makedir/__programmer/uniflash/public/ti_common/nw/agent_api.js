var ti_common;
(function (ti_common) {
    var fs = require('fs');
    var path = require('path');
    var os = require('os');
    var logFileLoc = path.join(os.tmpdir(), 'ti_cloud_storage', 'uniflash');
    // configure desktop dinfra
    var dinfraCommon = require(path.resolve('ticloudagent/server/common/dinfra_common.js'));
    dinfraCommon.setDinfra(require(path.resolve('dinfra-library/desktop/dinfra.js')));
    var dinfra = dinfraCommon.dinfra;
    var logger = dinfra.logger('uniflash');
    dinfra.dlog.console();
    var dconfig = {
        'origin': {
            'landscape': 'localhost',
            'cluster': 'none',
            'instance': 'localhost'
        },
        'logging': {
            'base-path': logFileLoc,
            'format': {
                'render': 'condensed'
            }
        },
        'databases': {
            'defaults': {
                'type': 'file',
                'path': 'deskdb'
            }
        },
        'paths': {}
    };
    var dinfraConfigue = dinfra.configure(dconfig);
    var queryConfigImpl = require(path.resolve('ticloudagent/server/server_apis/query_config.js'));
    var getConfigInfoImpl = require(path.resolve('ticloudagent/server/server_apis/get_config_info.js'));
    var getSupportingFilesImpl = require(path.resolve('ticloudagent/server/server_apis/get_supporting_files.js'));
    var generateConfigImpl = require(path.resolve('ticloudagent/server/server_apis/generate_config.js'));
    var getFileImpl = require(path.resolve('ticloudagent/server/server_apis/get_file.js'));
    var getComponentInfoImpl = require(path.resolve('ticloudagent/server/server_apis/get_component_info.js'));
    var WriteStream = require(path.resolve('uniflash/public/ti_common/nw/streams.js')).write;
    var ReadStream = require(path.resolve('uniflash/public/ti_common/nw/streams.js')).read;
    ;
    var NWAgentAPI = (function () {
        function NWAgentAPI($q, $log) {
            var _this = this;
            this.$q = $q;
            this.$log = $log;
            dinfraConfigue
                .then(function () {
                _this.$log.log('NWAgentAPI: dinfraConfigue resolved successfully.');
            })
                .catch(function (err) {
                _this.$log.error(err);
            })
                .done();
        }
        NWAgentAPI.prototype.getLpListJson = function () {
            var deferred = this.$q.defer();
            var jsonPath = path.resolve('uniflash/public/target_setup/data/lpList.json');
            var jsonData = JSON.stringify(require(jsonPath));
            var retObj = { data: jsonData };
            deferred.resolve(retObj);
            return deferred.promise;
        };
        NWAgentAPI.prototype.uint8ToString = function (buf, resolve) {
            var blob = new Blob([buf]);
            var f = new FileReader();
            f.onload = function () {
                resolve({
                    data: this.result
                });
            };
            f.readAsText(blob);
        };
        //text 
        NWAgentAPI.prototype.getConfigInfo = function (OS) {
            var _this = this;
            var params = { os: OS };
            return this.$q(function (resolve, reject) {
                dinfraConfigue
                    .then(function () {
                    var res = new WriteStream();
                    getConfigInfoImpl(params, res);
                    res.on('finish', function () {
                        _this.uint8ToString(res.getData(), resolve);
                    });
                    res.on('error', reject);
                });
            });
        };
        //text
        NWAgentAPI.prototype.getSupportingFiles = function (ccxmlFileContents, OS, osBits) {
            var _this = this;
            var params = { os: OS, bitSize: osBits };
            return this.$q(function (resolve, reject) {
                dinfraConfigue
                    .then(function () {
                    var req = new ReadStream(ccxmlFileContents);
                    var res = new WriteStream();
                    getSupportingFilesImpl(params, req, res);
                    res.on('finish', function () {
                        _this.uint8ToString(res.getData(), resolve);
                    });
                    res.on('error', reject);
                    req.on('error', reject);
                });
            });
        };
        //text
        NWAgentAPI.prototype.queryConfig = function (ccxmlFileContents, OS) {
            var _this = this;
            return this.$q(function (resolve, reject) {
                dinfraConfigue
                    .then(function () {
                    var req = new ReadStream(ccxmlFileContents);
                    var res = new WriteStream();
                    queryConfigImpl({ os: OS }, req, res);
                    res.on('finish', function () {
                        _this.uint8ToString(res.getData(), resolve);
                    });
                    res.on('error', reject);
                    req.on('error', reject);
                });
            });
        };
        NWAgentAPI.prototype.getConfigurables = function (OS, connectionID, deviceID) {
            var _this = this;
            return this.$q(function (resolve, reject) {
                dinfraConfigue
                    .then(function () {
                    var res = new WriteStream();
                    generateConfigImpl.getConfigurables(connectionID, deviceID, OS, res);
                    res.on('finish', function () {
                        _this.uint8ToString(res.getData(), resolve);
                    });
                    res.on('error', reject);
                });
            });
        };
        //text
        NWAgentAPI.prototype.getConfig = function (OS, connectionID, deviceID, configurablesJson) {
            var _this = this;
            return this.$q(function (resolve, reject) {
                dinfraConfigue
                    .then(function () {
                    var res = new WriteStream();
                    if (configurablesJson) {
                        var params = {
                            os: OS,
                            connectionID: connectionID,
                            deviceID: deviceID
                        };
                        var req = new ReadStream(configurablesJson);
                        generateConfigImpl.advanced(params, req, res);
                    }
                    else {
                        generateConfigImpl.default(connectionID, deviceID, OS, res);
                    }
                    res.on('finish', function () {
                        _this.uint8ToString(res.getData(), resolve);
                    });
                    res.on('error', reject);
                });
            });
        };
        //text
        NWAgentAPI.prototype.getComponentInfo = function (OS) {
            var _this = this;
            return this.$q(function (resolve, reject) {
                dinfraConfigue
                    .then(function () {
                    var res = new WriteStream();
                    getComponentInfoImpl(res, OS);
                    res.on('finish', function () {
                        _this.uint8ToString(res.getData(), resolve);
                    });
                    res.on('error', reject);
                });
            });
        };
        NWAgentAPI.prototype.getFileBlob = function (api) {
            return this.$q(function (resolve, reject) {
                dinfraConfigue
                    .then(function () {
                    var res = new WriteStream();
                    var headers = [];
                    res.writeHead = function (status, _headers) {
                        headers = _headers;
                    };
                    api(res);
                    res.on('finish', function () {
                        var contentType = headers['content-type'];
                        var newData = new Blob([res.getData()], { type: contentType });
                        resolve({
                            data: newData,
                            headers: function () { return headers; }
                        });
                    });
                    res.on('error', reject);
                });
            });
        };
        //binary
        NWAgentAPI.prototype.getFileContent = function (OS, path, type, version) {
            var _this = this;
            var params = { os: OS };
            if (!version) {
                version = "LATEST";
            }
            var ret, contentType;
            return this.getFileBlob(function (res) {
                getFileImpl(params, path, version, res);
            })
                .catch(function (e) {
                _this.$log.error(JSON.stringify(e));
            });
        };
        NWAgentAPI.prototype.closeAgent = function () {
            return dinfra.shutdown(0);
        };
        NWAgentAPI.$inject = ['$q', '$log'];
        return NWAgentAPI;
    }());
    ;
    angular.module('ti_common').service('ticAgentAPI', NWAgentAPI);
})(ti_common || (ti_common = {}));
