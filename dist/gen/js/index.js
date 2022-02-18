"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const genOperations_1 = __importDefault(require("./genOperations"));
const genReduxActions_1 = __importDefault(require("./genReduxActions"));
const genService_1 = __importDefault(require("./genService"));
const genTypes_1 = __importDefault(require("./genTypes"));
const genSpec_1 = __importDefault(require("./genSpec"));
const support_1 = require("./support");
function genCode(spec, operations, options) {
    (0, support_1.applyFormatOptions)(options);
    (0, genService_1.default)(options);
    (0, genSpec_1.default)(spec, options);
    (0, genOperations_1.default)(spec, operations, options);
    (0, genTypes_1.default)(spec, options);
    if (options.redux)
        (0, genReduxActions_1.default)(spec, operations, options);
    return spec;
}
exports.default = genCode;
