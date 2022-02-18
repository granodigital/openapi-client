"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.genServiceFile = void 0;
const support_1 = require("./support");
const fs_1 = require("fs");
const util_1 = require("../util");
function genService(options) {
    const file = genServiceFile(options);
    const contents = file.contents.replace(/  /g, support_1.SP).replace(/;;/g, support_1.ST);
    (0, util_1.writeFileSync)(file.path, contents);
}
exports.default = genService;
function genServiceFile(options) {
    const path = `${options.outDir}/gateway/index.${options.language}`;
    const contents = (0, fs_1.readFileSync)(`${__dirname}/service.${options.language}.template`, 'utf8');
    return { path, contents };
}
exports.genServiceFile = genServiceFile;
