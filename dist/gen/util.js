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
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeOldFiles = exports.getBestResponse = exports.camelToUppercase = exports.join = exports.groupOperationsByGroupName = exports.writeFileSync = exports.exists = void 0;
const FS = __importStar(require("fs"));
const PATH = __importStar(require("path"));
const mkdirp = __importStar(require("mkdirp"));
function exists(filePath) {
    try {
        return FS.lstatSync(filePath);
    }
    catch (e) {
        return undefined;
    }
}
exports.exists = exists;
function writeFileSync(filePath, contents) {
    mkdirp.sync(PATH.dirname(filePath));
    FS.writeFileSync(filePath, contents);
}
exports.writeFileSync = writeFileSync;
function groupOperationsByGroupName(operations) {
    return operations.reduce((groups, op) => {
        if (!groups[op.group])
            groups[op.group] = [];
        groups[op.group].push(op);
        return groups;
    }, {});
}
exports.groupOperationsByGroupName = groupOperationsByGroupName;
function join(parent, child) {
    parent.push.apply(parent, child);
    return parent;
}
exports.join = join;
function camelToUppercase(value) {
    return value.replace(/([A-Z]+)/g, '_$1').toUpperCase();
}
exports.camelToUppercase = camelToUppercase;
function getBestResponse(op) {
    const NOT_FOUND = 100000;
    const lowestCode = op.responses.reduce((code, resp) => {
        const responseCode = parseInt(resp.code);
        if (isNaN(responseCode) || responseCode >= code)
            return code;
        else
            return responseCode;
    }, NOT_FOUND);
    return (lowestCode === NOT_FOUND)
        ? op.responses[0]
        : op.responses.find(resp => resp.code == `${lowestCode}`);
}
exports.getBestResponse = getBestResponse;
function removeOldFiles(options) {
    cleanDirs(options.outDir, options);
}
exports.removeOldFiles = removeOldFiles;
function cleanDirs(dir, options) {
    dir = PATH.resolve(dir);
    const stats = exists(dir);
    if (!stats || !stats.isDirectory())
        return;
    const files = FS.readdirSync(dir).map(file => PATH.resolve(`${dir}/${file}`));
    while (files.length) {
        const file = files.pop();
        if (file.endsWith(options.language) && !file.endsWith(`index.${options.language}`)) {
            FS.unlinkSync(file);
        }
        else if (exists(file).isDirectory()) {
            cleanDirs(file, options);
        }
    }
}
