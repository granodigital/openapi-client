import { resolveSpec } from '../../src/spec/spec';
import { getOperations } from '../../src/spec/operations';

describe('operations', () => {
	it('should parse operations from spec', async () => {
		const path = `${__dirname}/../petstore.yml`;
		const spec = await resolveSpec(path);
		const operations = getOperations(spec);
		expect(operations).not.toBeFalsy();
		expect(operations.length).toBe(3);

		const listPets = operations.find((op) => op.id === 'listPets');
		expect(listPets).not.toBeFalsy();
		expect(listPets.method).toBe('get');
		expect(listPets.path).toBe('/pets');
		expect(listPets.tags).not.toBeFalsy();
		expect(listPets.tags[0]).toBe('pets');
		expect(listPets.responses).not.toBeFalsy();
		expect(listPets.responses.length).toBe(2);

		const res200 = listPets.responses.find((res) => res.code === '200');
		expect(res200).not.toBeFalsy();
		expect(res200.headers['x-next'].type).toBe('string');
		const resDefault = listPets.responses.find((res) => res.code === 'default');
		expect(resDefault).not.toBeFalsy();
	});

	describe('OpenAPI 3.0 content types', () => {
		let operations: any[];
		beforeAll(async () => {
			const spec = await resolveSpec(`${__dirname}/../openapi3.yml`);
			operations = getOperations(spec);
		});

		it('derives request contentTypes from requestBody.content (XML)', () => {
			const op = operations.find((o) => o.id === 'xmlEcho');
			expect(op.contentTypes).toEqual(['application/xml']);
		});

		it('derives accepts from the success response content (XML)', () => {
			const op = operations.find((o) => o.id === 'xmlEcho');
			expect(op.accepts).toEqual(['application/xml']);
		});

		it('keeps JSON request/response as application/json', () => {
			const op = operations.find((o) => o.id === 'jsonCreate');
			expect(op.contentTypes).toEqual(['application/json']);
			expect(op.accepts).toEqual(['application/json']);
		});

		it('derives request and response content types independently', () => {
			const op = operations.find((o) => o.id === 'jsonReqXmlResp');
			expect(op.contentTypes).toEqual(['application/json']);
			expect(op.accepts).toEqual(['application/xml']);
		});
	});
});
