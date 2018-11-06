"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_tags_1 = require("common-tags");
const chalk_1 = require("chalk");
exports.DOC = ' * ';
exports.DEFAULT_SP = '  ';
exports.SP = exports.DEFAULT_SP;
exports.ST = ''; // statement terminator
function applyFormatOptions(options) {
    switch (`${options.indent}`) {
        case 'tab':
        case '\t':
            exports.SP = '\t';
            break;
        case '4':
            exports.SP = '    ';
            break;
        case '2':
            exports.SP = '  ';
            break;
        case 'spaces':
        default:
            exports.SP = exports.DEFAULT_SP;
            break;
    }
    if (options.semicolon) {
        exports.ST = ';';
    }
}
exports.applyFormatOptions = applyFormatOptions;
function formatDocDescription(description) {
    return (description || '').trim().replace(/\n/g, `\n${exports.DOC}${exports.SP}`);
}
exports.formatDocDescription = formatDocDescription;
function getDocType(param) {
    if (!param) {
        return 'object';
    }
    else if (param.$ref) {
        const type = param.$ref.split('/').pop();
        return `module:types.${type}`;
    }
    else if (param.schema) {
        return getDocType(param.schema);
    }
    else if (param.type === 'array') {
        if (param.items.type) {
            return `${getDocType(param.items)}[]`;
        }
        else if (param.items.$ref) {
            const type = param.items.$ref.split('/').pop();
            return `module:types.${type}[]`;
        }
        else {
            return 'object[]';
        }
    }
    else if (param.type === 'integer') {
        return 'number';
    }
    else if (param.type === 'string' && (param.format === 'date-time' || param.format === 'date')) {
        return 'date';
    }
    else {
        return param.type || 'object';
    }
}
exports.getDocType = getDocType;
const primitives = new Set(['string', 'number', 'boolean']);
function getTSParamType(param, inTypesModule, indent = '  ') {
    if (!param) {
        console.warn(chalk_1.yellow('Missing type information.'));
        return 'any';
    }
    else if (param.enum) {
        if (!param.type || param.type === 'string')
            return `'${param.enum.join(`'|'`)}'`;
        else if (param.type === 'number')
            return `${param.enum.join(`|`)}`;
    }
    if (param.$ref) {
        const type = param.$ref.split('/').pop();
        return inTypesModule
            ? type
            : `api.${type}`;
    }
    else if (param.schema) {
        return getTSParamType(param.schema, inTypesModule, indent);
    }
    else if (param.type === 'array') {
        if (!param.items) {
            console.warn(chalk_1.yellow('Missing type information:'), param);
            return 'any[]';
        }
        if (param.items.type) {
            if (param.items.enum) {
                return `(${getTSParamType(param.items, inTypesModule, indent)})[]`;
            }
            else {
                return `${getTSParamType(param.items, inTypesModule, indent)}[]`;
            }
        }
        else if (param.items.$ref) {
            const type = param.items.$ref.split('/').pop();
            return inTypesModule
                ? `${type}[]`
                : `api.${type}[]`;
        }
        else if (param.items.oneOf) {
            return `(${param.items.oneOf
                .map(schema => getTSParamType(schema, inTypesModule, indent))
                .map(type => `${type}`)
                .join(' | ')})[]`;
        }
        else {
            console.warn(chalk_1.yellow('Missing type information:'), param);
            return 'any[]';
        }
    }
    else if (param.type === 'object') {
        if (param.additionalProperties) {
            const extraProps = param.additionalProperties;
            return `{[key: string]: ${getTSParamType(extraProps, inTypesModule, indent)}}`;
        }
        if (param.properties) {
            const props = Object.keys(param.properties);
            return common_tags_1.commaLists `{
  ${indent}${props.map(key => `${sanitizeKey(key)}: ${getTSParamType(param.properties[key], inTypesModule, `${indent}  `)}`)}
${indent}}`;
        }
        console.warn(chalk_1.yellow('Missing type information:'), param);
        return 'any';
    }
    else if (Array.isArray(param.oneOf)) {
        return param.oneOf.map(schema => getTSParamType(schema, inTypesModule, indent)).join(' | ');
    }
    else if (param.type === 'integer') {
        return 'number';
    }
    else if (param.type === 'string' && (param.format === 'date-time' || param.format === 'date')) {
        return 'Date';
    }
    else if (param.type === 'file') {
        return 'File';
    }
    else if (primitives.has(param.type)) {
        return param.type;
    }
    else {
        console.warn(chalk_1.yellow('Missing type information:'), param);
        return 'any';
    }
}
exports.getTSParamType = getTSParamType;
function sanitizeKey(key) {
    if (key.match(/^[a-z0-9]+$/i)) {
        return key;
    }
    return `'${key}'`;
}
