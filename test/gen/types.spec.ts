import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as ts from 'typescript';
import { resolveSpec } from '../../src/spec/spec';
import { genTypesFile } from '../../src/gen/js/genTypes';

const options = { language: 'ts', outDir: 'out' } as ClientOptions;

/** Lines from `start` up to the first following line that equals `end`. */
function getBlock(contents: string, start: string, end = '}'): string {
	const lines = contents.split('\n');
	const from = lines.indexOf(start);
	if (from === -1) throw new Error('Block not found');
	const to = lines.indexOf(end, from + 1);
	return lines.slice(from, to + 1).join('\n');
}

/** Index-signature diagnostics (TS2411) of the generated types under strict checks. */
function getIndexSignatureErrors(contents: string): string[] {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'openapi-types-'));
	const file = path.join(dir, 'types.d.ts');
	fs.writeFileSync(file, contents.replace('// @ts-nocheck', ''));
	const program = ts.createProgram([file], {
		strict: true,
		noEmit: true,
		types: [],
	});
	return ts
		.getPreEmitDiagnostics(program)
		.filter((d) => d.code === 2411)
		.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
}

describe('genTypes', () => {
	describe('genTypesFile', () => {
		let contents: string;
		beforeAll(async () => {
			const spec = await resolveSpec(
				`${__dirname}/../additional-properties.yml`
			);
			// The fixture has an untyped property on purpose.
			const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
			contents = genTypesFile(spec, options).contents;
			warn.mockRestore();
		});

		it('should add an index signature widened by the declared property types when additionalProperties is a schema', () => {
			expect(getBlock(contents, 'export interface SelectedOptions {')).toBe(
				[
					'export interface SelectedOptions {',
					'  order_quantity: number',
					'  size?: string',
					'  dimensions?: Dimensions',
					'  note?: string | null',
					'  meta?: {',
					'    source?: string',
					'  }',
					'  [key: string]: string | number | boolean | Dimensions | null | {',
					'    source?: string',
					'  } | undefined',
					'}',
				].join('\n')
			);
		});

		it('should not widen the index signature with a property typed any', () => {
			expect(getBlock(contents, 'export interface UntypedOptions {')).toBe(
				[
					'export interface UntypedOptions {',
					'  count?: number',
					'  legacy?: any',
					'  [key: string]: string | number | undefined',
					'}',
				].join('\n')
			);
		});

		it('should add an any index signature when additionalProperties is true', () => {
			expect(getBlock(contents, 'export interface FreeForm {')).toBe(
				[
					'export interface FreeForm {',
					'  name: string',
					'  [key: string]: any',
					'}',
				].join('\n')
			);
		});

		it('should add an index signature when the schema has only additionalProperties', () => {
			expect(getBlock(contents, 'export interface StringMap {')).toBe(
				['export interface StringMap {', '  [key: string]: string', '}'].join(
					'\n'
				)
			);
			expect(getBlock(contents, 'export interface RefMap {')).toBe(
				['export interface RefMap {', '  [key: string]: Dimensions', '}'].join(
					'\n'
				)
			);
		});

		it('should add an any index signature when the schema extends a parent', () => {
			expect(
				getBlock(
					contents,
					'export interface DeepDimensions extends Dimensions {'
				)
			).toBe(
				[
					'export interface DeepDimensions extends Dimensions {',
					'  depth?: number',
					'  [key: string]: any',
					'}',
				].join('\n')
			);
		});

		it('should add an any index signature when another schema extends the schema', () => {
			expect(getBlock(contents, 'export interface LabelMap {')).toBe(
				[
					'export interface LabelMap {',
					'  id: string',
					'  [key: string]: any',
					'}',
				].join('\n')
			);
		});

		it('should add an index signature when additionalProperties sits next to allOf', () => {
			expect(
				getBlock(contents, 'export interface OuterExtra extends Dimensions {')
			).toBe(
				[
					'export interface OuterExtra extends Dimensions {',
					'  depth?: number',
					'  [key: string]: any',
					'}',
				].join('\n')
			);
		});

		it('should widen the index signature with the type the property renderer gives', () => {
			expect(getBlock(contents, 'export interface TagFlags {')).toBe(
				[
					'export interface TagFlags {',
					'  tags?: string[]',
					'  [key: string]: boolean | string[] | undefined',
					'}',
				].join('\n')
			);
		});

		it('should keep the interface unchanged when additionalProperties is missing or false', () => {
			expect(getBlock(contents, 'export interface Dimensions {')).toBe(
				[
					'export interface Dimensions {',
					'  width: number',
					'  height?: number',
					'}',
				].join('\n')
			);
			expect(getBlock(contents, 'export interface Closed {')).toBe(
				['export interface Closed {', '  id?: string', '}'].join('\n')
			);
		});

		it('should keep the JSDoc typedef to the declared properties', () => {
			expect(getBlock(contents, ' * @typedef SelectedOptions', ' */')).toBe(
				[
					' * @typedef SelectedOptions',
					' * @memberof module:types',
					' * ',
					' * @property {number} order_quantity ',
					' * @property {string} size ',
					' * @property {module:types.Dimensions} dimensions ',
					' * @property {string} note ',
					' * @property {object} meta ',
					' */',
				].join('\n')
			);
			expect(getBlock(contents, ' * @typedef StringMap', ' */')).toBe(
				[' * @typedef StringMap', ' * @memberof module:types', ' */'].join('\n')
			);
		});

		it('should generate index signatures that pass strict type checks', () => {
			expect(getIndexSignatureErrors(contents)).toEqual([]);
		});

		it('should detect an index signature that does not fit the declared properties', () => {
			const broken =
				'declare namespace api {\n  interface A {\n    a?: number\n    [key: string]: string\n  }\n}\n';
			expect(getIndexSignatureErrors(broken)).toHaveLength(1);
		});
	});
});
