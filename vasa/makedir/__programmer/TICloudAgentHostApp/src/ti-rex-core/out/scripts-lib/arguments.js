'use strict';
exports.options = {
    dinfra: {
        describe: 'path to dinfra.js (relative or absolute)'
    },
    mode: {
        describe: 'the server mode',
        choices: ['remoteserver', 'localserver']
    }
};
