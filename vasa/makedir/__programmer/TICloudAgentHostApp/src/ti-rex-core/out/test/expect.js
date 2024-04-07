"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expect = exports.chai = void 0;
const chaiInner = require("chai");
const chaiAsPromised = require("chai-as-promised");
// @ts-ignore
const chaiHttp = require("chai-http");
chaiInner.use(chaiAsPromised);
chaiInner.use(chaiHttp);
exports.chai = chaiInner;
exports.expect = chaiInner.expect;
