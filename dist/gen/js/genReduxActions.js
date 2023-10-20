"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.genReduxActionGroupFiles = void 0;
const util_1 = require("../util");
const support_1 = require("./support");
const genOperations_1 = require("./genOperations");
function genReduxActions(spec, operations, options) {
    const files = genReduxActionGroupFiles(spec, operations, options);
    files.forEach((file) => (0, util_1.writeFileSync)(file.path, file.contents));
}
exports.default = genReduxActions;
function genReduxActionGroupFiles(spec, operations, options) {
    const groups = (0, util_1.groupOperationsByGroupName)(operations);
    const files = [];
    for (let name in groups) {
        const group = groups[name];
        const lines = [];
        lines.push(renderHeader(name, spec, options));
        lines.push((0, genOperations_1.renderOperationGroup)(group, renderReduxActionBlock, spec, options));
        files.push({
            path: `${options.outDir}/action/${name}.${options.language}`,
            contents: lines.join('\n'),
        });
    }
    return files;
}
exports.genReduxActionGroupFiles = genReduxActionGroupFiles;
function renderHeader(name, spec, options) {
    const code = `
${options.language === 'ts' && spec.definitions
        ? '// @ts-nocheck\n/// <reference path="../types.d.ts"/>'
        : ''}
/** @module action/${name} */
// Auto-generated, edits will be overwritten
import * as ${name} from '../${name}'${support_1.ST}
`.trim();
    return code;
}
function renderActionDocs(op) {
    const lines = [
        '/**',
        ...(0, genOperations_1.renderDocDescription)(op, '[Action] '),
        ...(0, genOperations_1.renderDocParams)(op),
        `${support_1.DOC}@return {api.AsyncAction} API Action`,
        ' */',
    ];
    return lines.join('\n');
}
function renderReduxActionBlock(spec, op, options) {
    const isTs = options.language === 'ts';
    const actionStart = (0, util_1.camelToUppercase)(op.id) + '_START';
    const actionComplete = (0, util_1.camelToUppercase)(op.id);
    const infoParam = isTs ? 'info?: any' : 'info';
    const docs = renderActionDocs(op);
    let paramSignature = (0, genOperations_1.renderParamSignature)(op, options, `${op.group}.`);
    paramSignature += `${paramSignature ? ', ' : ''}${infoParam}`;
    const required = op.parameters.filter((param) => param.required);
    let params = required.map((param) => (0, genOperations_1.getParamName)(param.name)).join(', ');
    if (required.length < op.parameters.length) {
        if (required.length)
            params += ', options';
        else
            params = 'options';
    }
    const response = (0, util_1.getBestResponse)(op);
    const returnType = response
        ? (0, support_1.getTSParamType)(response, { prop: response.code })
        : 'any';
    return `
export const ${actionStart} = 's/${op.group}/${actionStart}'${support_1.ST}
export const ${actionComplete} = 's/${op.group}/${actionComplete}'${support_1.ST}
${isTs ? `export type ${actionComplete} = ${returnType}${support_1.ST}` : ''}

${docs}
export function ${op.id}(${paramSignature})${isTs ? ': api.AsyncAction' : ''} {
  return dispatch => {
    dispatch({ type: ${actionStart}, meta: { info, params: { ${params} } } })${support_1.ST}
    return ${op.group}.${op.id}(${params})
      .then(response => dispatch({
        type: ${actionComplete},
        payload: response.data,
        error: response.error,
        meta: {
          res: response.raw,
          info
        }
      }))${support_1.ST}
  }${support_1.ST}
}
`.replace(/  /g, support_1.SP);
}
