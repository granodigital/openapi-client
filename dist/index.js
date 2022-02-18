"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.genCode = void 0;
require("isomorphic-fetch");
const spec_1 = require("./spec");
const js_1 = __importDefault(require("./gen/js"));
const util_1 = require("./gen/util");
const assert = __importStar(require("assert"));
function genCode(options) {
    return verifyOptions(options)
        .then(options => (0, spec_1.resolveSpec)(options.src, { ignoreRefType: '#/definitions/' }, options.authKey)
        .then(spec => gen(spec, options)));
}
exports.genCode = genCode;
function verifyOptions(options) {
    try {
        assert.ok(options.src, 'Open API src not specified');
        assert.ok(options.outDir, 'Output directory not specified');
        assert.ok(options.language, 'Generation language not specified');
        return Promise.resolve(options);
    }
    catch (e) {
        return Promise.reject(e);
    }
}
function gen(spec, options) {
    (0, util_1.removeOldFiles)(options);
    const operations = (0, spec_1.getOperations)(spec);
    switch (options.language) {
        case 'js': return (0, js_1.default)(spec, operations, options);
        case 'ts': return (0, js_1.default)(spec, operations, options);
        default:
            throw new Error(`Language '${options.language}' not supported`);
    }
}
