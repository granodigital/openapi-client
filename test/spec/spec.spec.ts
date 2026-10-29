import { resolveSpec } from '../../src/spec/spec';

describe('spec', () => {
	it('should resolve a spec from url', async () => {
		const spec = await resolveSpec(
			'http://petstore.swagger.io/v2/swagger.json'
		);
		expect(spec).not.toBeFalsy();
		expect(spec.host).toBe('petstore.swagger.io');
		expect(spec.basePath).toBe('/v2');
		expect(spec.securityDefinitions).not.toBeFalsy();
		expect(spec.definitions).not.toBeFalsy();
		expect(spec.paths).not.toBeFalsy();
	});

	it('should resolve a spec from local file', async () => {
		const path = `${__dirname}/../petstore.yml`;
		const spec = await resolveSpec(path);
		expect(spec).not.toBeFalsy();
		expect(spec.host).toBe('petstore.swagger.io');
		expect(spec.basePath).toBe('/v1');
		expect(spec.definitions).not.toBeFalsy();
		expect(spec.paths).not.toBeFalsy();
	});

	describe('schema refs', () => {
		const specWithRef = (ref: string) => ({
			openapi: '3.0.0',
			info: { title: 'Test', version: '1' },
			paths: {
				'/a': {
					get: {
						responses: {
							200: { description: 'OK', content: { 'application/json': { schema: { $ref: ref } } } },
						},
					},
				},
			},
			components: { schemas: { Existing: { type: 'object' } } },
		});

		it('should keep a schema ref that resolves', async () => {
			const spec = await resolveSpec(specWithRef('#/components/schemas/Existing') as any);
			const response: any = spec.paths['/a'].get.responses[200];
			expect(response.content['application/json'].schema.$ref).toBe('#/components/schemas/Existing');
		});

		it('should fail when a schema ref points to no schema', async () => {
			await expect(async () => resolveSpec(specWithRef('#/components/schemas/Missing') as any)).rejects.toThrow(
				'Invalid schema reference: #/components/schemas/Missing'
			);
		});
	});
});
