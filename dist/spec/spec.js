"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
exports.expandRefs = exports.resolveSpec = void 0;
const YAML = __importStar(require("js-yaml"));
require("cross-fetch/polyfill");
/** Type guard to check if spec is OpenAPI 3.x */
function isOpenApi3(spec) {
    return 'openapi' in spec;
}
function resolveSpec(src, options, authKey) {
    if (!options)
        options = {};
    if (typeof src === 'string') {
        return loadJson(src, authKey).then((spec) => formatSpec(spec, src, options));
    }
    else {
        return Promise.resolve(formatSpec(src, null, options));
    }
}
exports.resolveSpec = resolveSpec;
function loadJson(src, authKey) {
    if (/^https?:\/\//im.test(src)) {
        const headers = new Headers();
        if (authKey)
            headers.append('Open-Api-Spec-Auth-Key', authKey);
        const request = new Request(src, { headers });
        return fetch(request).then((response) => response.json());
    }
    else if (String(process) === '[object process]') {
        return readFile(src).then((contents) => parseFileContents(contents, src));
    }
    else {
        throw new Error(`Unable to load api at '${src}'`);
    }
}
function readFile(filePath) {
    return new Promise((res, rej) => require('fs').readFile(filePath, 'utf8', (err, contents) => err ? rej(err) : res(contents)));
}
function parseFileContents(contents, path) {
    return /.ya?ml$/i.test(path) ? YAML.load(contents) : JSON.parse(contents);
}
function formatSpec(spec, src, options) {
    // Use any for the result since we're building up a Swagger 2.0-like internal format
    const s = spec;
    // Handle OpenAPI 3.0 -> internal format conversion
    if (isOpenApi3(spec)) {
        // servers[] -> host/basePath/schemes
        if (spec.servers && spec.servers.length > 0) {
            const serverUrl = spec.servers[0].url;
            try {
                // Handle absolute URLs
                if (serverUrl.startsWith('http://') || serverUrl.startsWith('https://')) {
                    const url = new URL(serverUrl);
                    if (!s.host)
                        s.host = url.host;
                    if (!s.basePath)
                        s.basePath = url.pathname;
                    if (!s.schemes || !s.schemes.length) {
                        s.schemes = [url.protocol.slice(0, -1)]; // remove trailing ':'
                    }
                }
                else {
                    // Relative URL (e.g., '/v2')
                    if (!s.basePath)
                        s.basePath = serverUrl;
                }
            }
            catch {
                // If URL parsing fails, treat as relative path
                if (!s.basePath)
                    s.basePath = serverUrl;
            }
        }
        // components.schemas -> definitions
        if (spec.components?.schemas && !s.definitions) {
            s.definitions = spec.components.schemas;
        }
        // components.securitySchemes -> securityDefinitions
        if (spec.components?.securitySchemes && !s.securityDefinitions) {
            s.securityDefinitions = spec.components.securitySchemes;
        }
    }
    if (!s.basePath)
        s.basePath = '';
    else if (s.basePath.endsWith('/'))
        s.basePath = s.basePath.slice(0, -1);
    if (src && /^https?:\/\//im.test(src)) {
        const parts = src.split('/');
        if (!s.host)
            s.host = parts[2];
        if (!s.schemes || !s.schemes.length)
            s.schemes = [parts[0].slice(0, -1)];
    }
    else {
        if (!s.host)
            s.host = 'localhost';
        if (!s.schemes || !s.schemes.length)
            s.schemes = ['http'];
    }
    if (!s.produces || !s.produces.length) {
        s.accepts = ['application/json']; // give sensible default
    }
    else {
        s.accepts = s.produces;
    }
    if (!s.consumes || !s.consumes.length) {
        s.contentTypes = ['application/json'];
    }
    else {
        s.contentTypes = s.consumes;
    }
    delete s.consumes;
    delete s.produces;
    return expandRefs(s, s, options);
}
/**
 * Recursively expand internal references in the form `#/path/to/object`.
 * Only expands refs to #/components/parameters/ - schemas ($refs to #/components/schemas/)
 * are preserved for the type generator to handle.
 *
 * @param {object} data the object to search for and update refs
 * @param {object} lookup the object to clone refs from
 * @param {regexp=} refMatch an optional regex to match specific refs to resolve
 * @returns {object} the resolved data object
 */
function expandRefs(data, lookup, options) {
    if (!data)
        return data;
    if (Array.isArray(data)) {
        return data.map((item) => expandRefs(item, lookup, options));
    }
    else if (typeof data === 'object') {
        if (dataCache.has(data))
            return data;
        if (data.$ref &&
            !(options.ignoreRefType && data.$ref.startsWith(options.ignoreRefType))) {
            // Only expand refs that are NOT schema refs (schema refs are handled by type generator)
            // This prevents circular reference issues when schemas reference each other
            if (!data.$ref.startsWith('#/components/schemas/') && !data.$ref.startsWith('#/definitions/')) {
                const resolved = expandRef(data.$ref, lookup);
                delete data.$ref;
                data = Object.assign({}, resolved, data);
            }
        }
        dataCache.add(data);
        for (let name in data) {
            data[name] = expandRefs(data[name], lookup, options);
        }
    }
    return data;
}
exports.expandRefs = expandRefs;
function expandRef(ref, lookup) {
    const parts = ref.split('/');
    if (parts.shift() !== '#' || !parts[0]) {
        throw new Error(`Only support JSON Schema $refs in format '#/path/to/ref'`);
    }
    let value = lookup;
    while (parts.length) {
        value = value[parts.shift()];
        if (!value)
            throw new Error(`Invalid schema reference: ${ref}`);
    }
    return value;
}
const dataCache = new Set();
