import 'cross-fetch/polyfill';
import { resolveSpec, getOperations } from './spec';
import genJsCode from './gen/js';
import { removeOldFiles } from './gen/util';

export function genCode(options: ClientOptions): Promise<any> {
	return resolveSpec(
		options.src,
		{ ignoreRefType: '#/definitions/' },
		options.authKey
	).then((spec) => gen(spec, options));
}

function gen(spec: ApiSpec, options: ClientOptions): ApiSpec {
	removeOldFiles(options);
	const operations = getOperations(spec);
	switch (options.language) {
		case 'js':
			return genJsCode(spec, operations, options);
		case 'ts':
			return genJsCode(spec, operations, options);
		default:
			throw new Error(`Language '${options.language}' not supported`);
	}
}
