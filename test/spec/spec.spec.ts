import { resolveSpec } from "../../src/spec/spec";

describe("spec", () => {
	it("should resolve a spec from url", async () => {
		const spec = await resolveSpec(
			"http://petstore.swagger.io/v2/swagger.json"
		);
		expect(spec).not.toBeFalsy();
		expect(spec.host).toBe("petstore.swagger.io");
		expect(spec.basePath).toBe("/v2");
		expect(spec.securityDefinitions).not.toBeFalsy();
		expect(spec.definitions).not.toBeFalsy();
		expect(spec.paths).not.toBeFalsy();
	});

	it("should resolve a spec from local file", async () => {
		const path = `${__dirname}/../petstore.yml`;
		const spec = await resolveSpec(path);
		expect(spec).not.toBeFalsy();
		expect(spec.host).toBe("petstore.swagger.io");
		expect(spec.basePath).toBe("/v1");
		expect(spec.definitions).not.toBeFalsy();
		expect(spec.paths).not.toBeFalsy();
	});
});
