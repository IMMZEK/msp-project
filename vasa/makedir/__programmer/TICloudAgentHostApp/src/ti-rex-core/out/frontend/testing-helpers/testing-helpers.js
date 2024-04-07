"use strict";
// tslint:disable-next-line no-var-requires
// require('source-map-support').install();
// tslint:disable-next-line no-var-requires
// require('longjohn');
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestingHelpers = void 0;
const MockAgent = require("../mock-agent/mock-agent");
const CreateAppProps = require("./create-app-props");
const GetPromiseReplacement = require("./get-promise-replacement");
const PromiseSyncronizationHelpers = require("./promise-syncronization-helpers");
const FakeServerHelpers = require("./fake-server-helpers");
const UrlHelpers = require("./url-helpers");
const ClearCaches = require("./clear-caches");
exports.TestingHelpers = {
    MockAgent,
    CreateAppProps,
    GetPromiseReplacement,
    PromiseSyncronizationHelpers,
    FakeServerHelpers,
    UrlHelpers,
    ClearCaches
};
