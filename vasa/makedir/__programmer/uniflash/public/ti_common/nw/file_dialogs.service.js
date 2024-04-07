(function () {
    // Design
    // The node webkit interface for accessesing system file dialog's is not intuitive.
    // It is based around having clickable html <input tags> see here : https://github.com/nwjs/nw.js/wiki/File-dialogs 
    // Thus, to encapsulate and abstract the dialogs on node webkit the implementation is a bit tricky
    // 1) We have to have some html elements embedded on the page. We do this by exposing a 'ticFileDialogs' directive. It's
    // 	  only job is to insert our input html tags into the page. We could do this dynamically by inserting programmatically into the body
    //	  but this gives the API user a bit more flexability.
    // 2) When an API is invoked we programatically 'click' on element, and attach a listener as per node webkit instructions
    //
    'use strict';
    var openFilePathInput;
    var saveFilePathInput;
    /*global File*/
    (function () {
        angular.module('ti_common').service('ticFileDialogs', fileDialogs);
        fileDialogs.$inject = ['$q', '$timeout', 'ticFileFactory'];
        function fileDialogs($q, $timeout, ticFileFactory) {
            var currentHandler;
            function commonFilePath(element, action) {
                if (currentHandler) {
                    // There is no way to hook into cancel in nw file dialogs,
                    // so to avoid get multiple call backs we have to make sure there is only 1
                    // active handler at a time.. 
                    element.removeEventListener('change', currentHandler);
                }
                return $q(function (resolve) {
                    currentHandler = function fileLoadHandler() {
                        element.removeEventListener('change', fileLoadHandler, false);
                        var fullpath = this.value;
                        var file = action(fullpath);
                        var files = [];
                        files.push(file);
                        file.calculateChecksum().then(function () {
                            // console.log(file.checksum);
                            resolve(files);
                        });
                    };
                    // this allows us to handle cancel appropriately
                    element.files.clear();
                    element.addEventListener('change', currentHandler, false);
                    // we want have the click happen in the next event loop
                    // to avoid causing an angular already in $digest phase issue
                    $timeout(element.click.bind(element));
                });
            }
            var dialogSettings = {
                acceptTypes: '',
                defaultName: ''
            };
            function openFile(title, exts) {
                //title not used atm due to nw limitation
                if (typeof exts === 'string') {
                    dialogSettings.acceptTypes = (exts) ? exts : '';
                }
                else {
                    dialogSettings.acceptTypes = '';
                }
                return commonFilePath(openFilePathInput, ticFileFactory.create);
            }
            function saveFile(title, name, ext) {
                //title not used atm due to nw limitation
                dialogSettings.acceptTypes = ext;
                dialogSettings.defaultName = name + dialogSettings.acceptTypes;
                return commonFilePath(saveFilePathInput, ticFileFactory.create)
                    .then(function (files) {
                    return files[0];
                });
            }
            return {
                openFile: openFile,
                saveFile: saveFile,
                dialogSettings: dialogSettings
            };
        }
    })();
    (function () {
        angular.module('ti_common').directive('ticFileDialogs', ticFileLoadDialog);
        function ticFileLoadDialog() {
            var directive = {
                restrict: 'E',
                templateUrl: 'ti_common/nw/file_dialogs.html',
                link: link,
                scope: {},
                controller: ticFileDialogsCtrl,
                controllerAs: 'vm',
                bindToController: true
            };
            function link(scope, element) {
                openFilePathInput = element.children()[0]; // select only existing file paths ( to load files)
                saveFilePathInput = element.children()[1]; // select existing or new file paths
            }
            return directive;
        }
        ticFileDialogsCtrl.$inject = ['ticFileDialogs'];
        function ticFileDialogsCtrl(ticFileDialogs) {
            var vm = this;
            vm.dialogSettings = ticFileDialogs.dialogSettings;
        }
    })();
}());
