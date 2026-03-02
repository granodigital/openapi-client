import { commaLists } from 'common-tags';
import { yellow } from 'chalk';

export const DOC = ' * ';
export const DEFAULT_SP = '  ';
export let SP = DEFAULT_SP;
export let ST = ''; // statement terminator

export function applyFormatOptions(options: ClientOptions) {
	switch (`${options.indent}`) {
		case 'tab':
		case '\t':
			SP = '\t';
			break;
		case '4':
			SP = '    ';
			break;
		case '2':
			SP = '  ';
			break;
		case 'spaces':
		default:
			SP = DEFAULT_SP;
			break;
	}
	if (options.semicolon) {
		ST = ';';
	}
}

export function formatDocDescription(description: string): string {
	return (description || '').trim().replace(/\n/g, `\n${DOC}${SP}`);
}

export function getDocType(
	param: any,
	details: { prop: string; description?: string }
): string {
	if (!param) {
		return 'object';
	} else if (param.$ref) {
		const type = param.$ref.split('/').pop();
		return `module:types.${type}`;
	} else if (Array.isArray(param.allOf) && param.allOf.length === 1) {
		// Handle single-element allOf (NestJS Swagger wraps $ref in allOf)
		return getDocType(param.allOf[0], details);
	} else if (param.schema) {
		return getDocType(param.schema, details);
	} else if (param.type === 'array') {
		if (param.items?.type) {
			return `${getDocType(param.items, details)}[]`;
		} else if (param.items?.$ref) {
			const type = param.items.$ref.split('/').pop();
			return `module:types.${type}[]`;
		} else {
			return 'object[]';
		}
	} else if (param.type === 'integer') {
		return 'number';
	} else if (
		param.type === 'string' &&
		(param.format === 'date-time' || param.format === 'date')
	) {
		return 'date';
	} else {
		return param.type || 'object';
	}
}

const primitives = new Set(['string', 'number', 'boolean']);

export function getTSParamType(
	param: any,
	details: { prop: string },
	inTypesModule?: boolean,
	indent = SP,
	visitedSchemas = new Set<object>()
): string {
	// Detect circular references by tracking visited schema objects
	if (param && typeof param === 'object') {
		if (visitedSchemas.has(param)) {
			console.warn(yellow(`Circular reference detected for "${details.prop}".`));
			return 'any';
		}
		visitedSchemas = new Set(visitedSchemas);
		visitedSchemas.add(param);
	}
	if (!param) {
		console.warn(yellow('Missing type information.'), details);
		return 'any';
	}

	// Handle nullable wrapper
	const nullable = param.nullable === true;
	const wrapNullable = (type: string) => (nullable ? `${type} | null` : type);

	if (param.enum) {
		if (!param.type || param.type === 'string')
			return wrapNullable(`'${param.enum.join(`'|'`)}'`);
		else if (param.type === 'number') return wrapNullable(`${param.enum.join(`|`)}`);
	}
	if (param.$ref) {
		const type = param.$ref.split('/').pop();
		return wrapNullable(inTypesModule ? type : `api.${type}`);
	} else if (param.schema) {
		// Pass nullable to nested schema if not already set
		const nestedParam = param.nullable && !param.schema.nullable
			? { ...param.schema, nullable: true }
			: param.schema;
		return getTSParamType(nestedParam, details, inTypesModule, indent, visitedSchemas);
	} else if (param.type === 'array') {
		if (!param.items) {
			console.warn(
				yellow(`Missing type information for "${details.prop}":`),
				param
			);
			return wrapNullable('any[]');
		}
		if (param.items.type) {
			if (param.items.enum) {
				return wrapNullable(`(${getTSParamType(
					param.items,
					details,
					inTypesModule,
					indent,
					visitedSchemas
				)})[]`);
			} else {
				return wrapNullable(`${getTSParamType(
					param.items,
					details,
					inTypesModule,
					indent,
					visitedSchemas
				)}[]`);
			}
		} else if (param.items.$ref) {
			const type = param.items.$ref.split('/').pop();
			return wrapNullable(inTypesModule ? `${type}[]` : `api.${type}[]`);
		} else if (param.items.oneOf || param.items.anyOf) {
			const schemas = param.items.oneOf || param.items.anyOf;
			return wrapNullable(`(${schemas
				.map((schema) => getTSParamType(schema, details, inTypesModule, indent, visitedSchemas))
				.join(' | ')})[]`);
		} else {
			console.warn(
				yellow(`Missing type information for "${details.prop}":`),
				param
			);
			return wrapNullable('any[]');
		}
	} else if (param.type === 'object') {
		if (param.additionalProperties) {
			const extraProps = param.additionalProperties;
			return wrapNullable(`{[key: string]: ${getTSParamType(
				extraProps,
				details,
				inTypesModule,
				indent,
				visitedSchemas
			)}}`);
		}
		if (param.properties) {
			const props = Object.keys(param.properties);
			return wrapNullable(commaLists`{
  ${indent}${props.map(
				(key) =>
					`${getKey(key, param)}: ${getTSParamType(
						param.properties[key],
						{ prop: `${details.prop}.${key}` },
						inTypesModule,
						`${indent}${SP}`,
						visitedSchemas
					)}`
			)}
${indent}}`);
		}
		console.warn(
			yellow(`Missing type information for "${details.prop}":`),
			param
		);
		return wrapNullable('any');
	} else if (Array.isArray(param.oneOf) || Array.isArray(param.anyOf)) {
		const schemas = param.oneOf || param.anyOf;
		return wrapNullable(schemas
			.map((schema) => getTSParamType(schema, details, inTypesModule, indent, visitedSchemas))
			.join(' | '));
	} else if (Array.isArray(param.allOf) && param.allOf.length === 1) {
		// Handle single-element allOf (NestJS Swagger wraps $ref in allOf for some reason)
		return getTSParamType(param.allOf[0], details, inTypesModule, indent, visitedSchemas);
	} else if (param.type === 'integer') {
		return wrapNullable('number');
	} else if (param.type === 'file') {
		return wrapNullable('File');
	} else if (primitives.has(param.type)) {
		return wrapNullable(param.type);
	} else if (
		Array.isArray(param.type) &&
		param.type.length === 2 &&
		param.type[1] === 'null'
	) {
		// OpenAPI 3.1 / JSON Schema style: type: ['string', 'null']
		return getTSParamType(
			{ ...param, type: param.type[0], nullable: true },
			details,
			inTypesModule,
			indent,
			visitedSchemas
		);
	} else {
		// No body returned.
		if (param.code === '204' || param.code?.startsWith('3')) {
			return 'undefined';
		}
		console.warn(
			yellow(`Missing type information for "${details.prop}":`),
			param
		);
		return wrapNullable('any');
	}
}

/**
 * Escape object key with quotation marks and add ? if it's optional.
 * @param key key name
 * @param schema the parameter definition
 */
function getKey(key, schema) {
	let suffix = '?';
	if (
		schema &&
		Array.isArray(schema.required) &&
		schema.required.includes(key)
	) {
		suffix = '';
	}

	if (key.match(/^[a-z0-9_]+$/i)) {
		return `${key}${suffix}`;
	}
	return `'${key}'${suffix}`;
}
