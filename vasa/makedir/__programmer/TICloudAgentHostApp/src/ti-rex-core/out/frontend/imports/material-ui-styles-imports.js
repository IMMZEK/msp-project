"use strict";
/**
 * Workaround to allow importing from one location while not increasing bundle size.
 * Once tree shaking support is improved we can import from @material-ui/styles directly
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.withStyles = exports.createStyles = exports.makeStyles = void 0;
var styles_1 = require("@material-ui/styles");
Object.defineProperty(exports, "makeStyles", { enumerable: true, get: function () { return styles_1.makeStyles; } });
Object.defineProperty(exports, "createStyles", { enumerable: true, get: function () { return styles_1.createStyles; } });
Object.defineProperty(exports, "withStyles", { enumerable: true, get: function () { return styles_1.withStyles; } });
