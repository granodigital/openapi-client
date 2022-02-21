"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.genCode = void 0;
require("cross-fetch/polyfill");
const spec_1 = require("./spec");
const js_1 = __importDefault(require("./gen/js"));
const util_1 = require("./gen/util");
function genCode(options) {
    return (0, spec_1.resolveSpec)(options.src, { ignoreRefType: '#/definitions/' }, options.authKey).then((spec) => gen(spec, options));
}
exports.genCode = genCode;
function gen(spec, options) {
    (0, util_1.removeOldFiles)(options);
    const operations = (0, spec_1.getOperations)(spec);
    switch (options.language) {
        case 'js':
            return (0, js_1.default)(spec, operations, options);
        case 'ts':
            return (0, js_1.default)(spec, operations, options);
        default:
            throw new Error(`Language '${options.language}' not supported`);
    }
}
