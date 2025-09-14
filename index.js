import {AsyncLocalStorage} from 'node:async_hooks';
import crypto from 'node:crypto';
import fs from 'node:fs';
import * as nodeModule from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';

const namespace = 'import-fresh://';
const cjsNamespace = 'import-fresh-cjs://';
const parentUrlParameter = 'parent';
const cacheKeyParameter = 'import-fresh';
const cacheKeyPattern = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;
const nodeModulesPattern = /[/\\]node_modules[/\\]/;
const cjsExportsCacheGlobalKey = '__importFreshCjsExports';
const registrationStateKey = '__importFreshRegistrationState';
const runtimeStateKey = '__importFreshRuntimeState';
const packageTypeCache = new Map();

function getRuntimeState() {
	globalThis[runtimeStateKey] ||= {
		skipNodeModules: false,
		esmParentCacheKeys: new Map(),
		cjsParentCacheKeys: new Map(),
		activeFreshCjsParentCounts: new Map(),
		cjsWrapperParentUrls: new Map(),
		cjsFreshRequiredModules: new Set(),
		activeFreshImportCount: 0,
		freshImportQueue: Promise.resolve(),
		freshImportScopeStorage: new AsyncLocalStorage(),
		cjsImportCacheKeyStorage: new AsyncLocalStorage(),
	};
	return globalThis[runtimeStateKey];
}

const runtimeState = getRuntimeState();

function getRegistrationState() {
	globalThis[registrationStateKey] ||= {options: undefined};
	return globalThis[registrationStateKey];
}

function getFreshImportScope() {
	return runtimeState.freshImportScopeStorage.getStore();
}

// Cache-busting strategy:
// - URL cache-busting for ESM
// - require.cache tree clearing for CJS entries
// - AsyncLocalStorage scope tracking for CJS late import/require propagation
function assertSupported() {
	if (typeof nodeModule.registerHooks !== 'function') {
		throw new TypeError('import-fresh requires Node.js 22.15 or later.');
	}
}

function isObject(value) {
	return value !== null && typeof value === 'object';
}

function isOptionsObject(value) {
	return isObject(value) && !Array.isArray(value);
}

function isObjectLike(value) {
	return value !== null && (typeof value === 'object' || typeof value === 'function');
}

function isValidCacheKey(cacheKey) {
	return typeof cacheKey === 'string' && cacheKeyPattern.test(cacheKey);
}

function assertValidCacheKey(cacheKey) {
	if (!isValidCacheKey(cacheKey)) {
		throw new TypeError('Expected cacheKey to be a UUID.');
	}
}

function stripQueryAndHash(specifier) {
	if (typeof specifier !== 'string') {
		return '';
	}

	const queryIndex = specifier.indexOf('?');
	const hashIndex = specifier.indexOf('#');

	if (queryIndex === -1 && hashIndex === -1) {
		return specifier;
	}

	if (queryIndex === -1) {
		return specifier.slice(0, hashIndex);
	}

	if (hashIndex === -1) {
		return specifier.slice(0, queryIndex);
	}

	return specifier.slice(0, Math.min(queryIndex, hashIndex));
}

function stripSearchAndHash(urlString) {
	const parsedUrl = new URL(toUrlString(urlString));
	parsedUrl.search = '';
	parsedUrl.hash = '';
	return parsedUrl.href;
}

function normalizeResolvedUrl(urlString) {
	return urlString.startsWith('file:')
		? stripSearchAndHash(urlString)
		: stripQueryAndHash(urlString);
}

function getModulePathFromResolvedUrl(urlString) {
	const normalizedUrl = normalizeResolvedUrl(urlString);

	return {
		normalizedUrl,
		modulePath: normalizedUrl.startsWith('file:') ? fileURLToPath(normalizedUrl) : normalizedUrl,
	};
}

function toUrlString(urlOrPath) {
	try {
		return new URL(urlOrPath).href;
	} catch {
		return pathToFileURL(urlOrPath).href;
	}
}

function isWindowsPathLikeString(value) {
	return /^[a-z]:[/\\]/i.test(value);
}

function normalizeParsedParentUrl(parsedParentUrl) {
	if (isWindowsPathLikeString(parsedParentUrl.href) || !URL.canParse('./', parsedParentUrl)) {
		throw new TypeError('Expected parentURL to be a hierarchical URL string.');
	}

	parsedParentUrl.search = '';
	parsedParentUrl.hash = '';
	return parsedParentUrl.href;
}

function normalizeParentUrl(parentUrl) {
	if (parentUrl instanceof URL) {
		return normalizeParsedParentUrl(new URL(parentUrl.href));
	}

	if (typeof parentUrl === 'string') {
		if (!URL.canParse(parentUrl)) {
			throw new TypeError('Expected parentURL to be a valid URL string.');
		}

		return normalizeParsedParentUrl(new URL(parentUrl));
	}

	throw new TypeError('Expected parentURL to be a string or URL.');
}

function getLastValidCacheKey(searchParameters) {
	const cacheKeys = searchParameters.getAll(cacheKeyParameter);

	for (let index = cacheKeys.length - 1; index >= 0; index--) {
		const cacheKey = cacheKeys[index];

		if (isValidCacheKey(cacheKey)) {
			return cacheKey;
		}
	}

	return undefined;
}

function getCacheKeyFromParentUrl(parentUrl) {
	if (!parentUrl || typeof parentUrl !== 'string') {
		return undefined;
	}

	if (parentUrl.startsWith(namespace)) {
		try {
			const parsedFreshSpecifier = new URL(parentUrl);
			return isValidCacheKey(parsedFreshSpecifier.hostname) ? parsedFreshSpecifier.hostname : undefined;
		} catch {
			return undefined;
		}
	}

	try {
		const parsedUrl = new URL(parentUrl);
		const searchCacheKey = getLastValidCacheKey(parsedUrl.searchParams);

		if (searchCacheKey) {
			return searchCacheKey;
		}

		if (parsedUrl.protocol !== 'data:' || !parsedUrl.hash) {
			return undefined;
		}

		const hashSearchParameters = new URLSearchParams(parsedUrl.hash.slice(1));
		return getLastValidCacheKey(hashSearchParameters);
	} catch {
		return undefined;
	}
}

function appendCacheKey(urlString, cacheKey) {
	assertValidCacheKey(cacheKey);
	const parsedUrl = new URL(toUrlString(urlString));

	if (parsedUrl.protocol === 'data:') {
		const hashSearchParameters = new URLSearchParams(parsedUrl.hash.slice(1));
		hashSearchParameters.set(cacheKeyParameter, cacheKey);
		const hashValue = hashSearchParameters.toString();
		parsedUrl.hash = hashValue ? `#${hashValue}` : '';
		return parsedUrl.href;
	}

	parsedUrl.searchParams.set(cacheKeyParameter, cacheKey);
	return parsedUrl.href;
}

function isNodeModulesResolvedUrl(urlString) {
	if (typeof urlString !== 'string') {
		return false;
	}

	try {
		const {modulePath: normalizedPath} = getModulePathFromResolvedUrl(urlString);
		return nodeModulesPattern.test(normalizedPath);
	} catch {
		return false;
	}
}

function createImportFreshSpecifier(moduleSpecifier, cacheKey, parentUrl) {
	assertValidCacheKey(cacheKey);
	const encodedSpecifier = encodeURIComponent(moduleSpecifier);
	const freshUrl = new URL(`${namespace}${cacheKey}/${encodedSpecifier}`);

	if (parentUrl) {
		freshUrl.searchParams.set(parentUrlParameter, parentUrl);
	}

	return freshUrl.href;
}

function parseEncodedNamespaceSpecifier(specifier, expectedNamespace, messages) {
	if (!specifier.startsWith(expectedNamespace)) {
		return undefined;
	}

	const parsedSpecifier = new URL(specifier);
	const cacheKey = parsedSpecifier.hostname;
	const encodedValue = parsedSpecifier.pathname.slice(1);

	if (!cacheKey) {
		throw new Error(messages.missingCacheKey);
	}

	if (!encodedValue) {
		throw new Error(messages.missingValue);
	}

	assertValidCacheKey(cacheKey);

	let decodedValue;

	try {
		decodedValue = decodeURIComponent(encodedValue);
	} catch {
		throw new Error(messages.invalidEncoding);
	}

	return {
		cacheKey,
		decodedValue,
		parsedSpecifier,
	};
}

function parseImportFreshSpecifier(specifier) {
	const parsedFreshSpecifier = parseEncodedNamespaceSpecifier(specifier, namespace, {
		missingCacheKey: 'import-fresh specifier is missing the cache key.',
		missingValue: 'import-fresh specifier is missing the inner module specifier.',
		invalidEncoding: 'import-fresh specifier is not valid percent-encoding.',
	});

	if (!parsedFreshSpecifier) {
		return undefined;
	}

	return {
		cacheKey: parsedFreshSpecifier.cacheKey,
		moduleSpecifier: parsedFreshSpecifier.decodedValue,
		parentUrl: parsedFreshSpecifier.parsedSpecifier.searchParams.get(parentUrlParameter) ?? undefined,
	};
}

function createCjsWrapperUrl(fileUrl, cacheKey) {
	assertValidCacheKey(cacheKey);
	const encodedFileUrl = encodeURIComponent(fileUrl);
	const parsedWrapperSpecifier = new URL(`${cjsNamespace}${cacheKey}/${encodedFileUrl}`);
	return parsedWrapperSpecifier.href;
}

function parseCjsWrapperUrl(url) {
	const parsedWrapperSpecifier = parseEncodedNamespaceSpecifier(url, cjsNamespace, {
		missingCacheKey: 'import-fresh cjs specifier is missing the cache key.',
		missingValue: 'import-fresh cjs specifier is missing the file URL.',
		invalidEncoding: 'import-fresh cjs specifier is not valid percent-encoding.',
	});

	if (!parsedWrapperSpecifier) {
		return undefined;
	}

	return {
		cacheKey: parsedWrapperSpecifier.cacheKey,
		fileUrl: parsedWrapperSpecifier.decodedValue,
	};
}

function isCommonJsResolved(resolved) {
	if (typeof resolved.format === 'string') {
		return resolved.format === 'commonjs';
	}

	const normalizedUrl = stripQueryAndHash(resolved.url);

	if (normalizedUrl.endsWith('.cjs')) {
		return true;
	}

	if (!normalizedUrl.endsWith('.js') || !normalizedUrl.startsWith('file:') || typeof nodeModule.findPackageJSON !== 'function') {
		return false;
	}

	let packageJsonPath;

	try {
		packageJsonPath = nodeModule.findPackageJSON(normalizedUrl);
	} catch {
		return false;
	}

	if (!packageJsonPath) {
		return true;
	}

	if (packageTypeCache.has(packageJsonPath)) {
		return packageTypeCache.get(packageJsonPath);
	}

	let isCommonJs = true;

	try {
		const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
		isCommonJs = packageJson.type !== 'module';
	} catch {}

	packageTypeCache.set(packageJsonPath, isCommonJs);
	return isCommonJs;
}

function isRequireResolutionContext(context) {
	const conditions = context?.conditions;
	return Array.isArray(conditions) && conditions.includes('require');
}

function normalizeFileUrl(url) {
	if (typeof url !== 'string' || !url.startsWith('file:')) {
		return undefined;
	}

	try {
		return stripSearchAndHash(url);
	} catch {
		return undefined;
	}
}

function addCjsParentCacheKey(parentUrl, cacheKey) {
	pushParentCacheKey(runtimeState.cjsParentCacheKeys, parentUrl, cacheKey);
}

function addEsmParentCacheKey(parentUrl, cacheKey) {
	pushParentCacheKey(runtimeState.esmParentCacheKeys, parentUrl, cacheKey);
}

function pushParentCacheKey(cacheKeyMap, parentUrl, cacheKey) {
	if (!cacheKey) {
		return;
	}

	const normalizedFileUrl = normalizeFileUrl(parentUrl);

	if (!normalizedFileUrl) {
		return;
	}

	const cacheKeys = cacheKeyMap.get(normalizedFileUrl);

	if (cacheKeys) {
		cacheKeys.push(cacheKey);
		return;
	}

	cacheKeyMap.set(normalizedFileUrl, [cacheKey]);
}

function consumeEsmParentCacheKey(parentUrl) {
	return popParentCacheKey(runtimeState.esmParentCacheKeys, parentUrl);
}

function consumeCjsParentCacheKey(parentUrl, expectedCacheKey) {
	return popParentCacheKey(runtimeState.cjsParentCacheKeys, parentUrl, expectedCacheKey);
}

function popParentCacheKey(cacheKeyMap, parentUrl, expectedCacheKey) {
	const normalizedFileUrl = normalizeFileUrl(parentUrl);

	if (!normalizedFileUrl) {
		return undefined;
	}

	const cacheKeys = cacheKeyMap.get(normalizedFileUrl);

	if (!cacheKeys || cacheKeys.length === 0) {
		return undefined;
	}

	let cacheKey;

	if (expectedCacheKey) {
		const expectedCacheKeyIndex = cacheKeys.indexOf(expectedCacheKey);

		if (expectedCacheKeyIndex === -1) {
			return undefined;
		}

		cacheKey = cacheKeys[expectedCacheKeyIndex];
		cacheKeys.splice(expectedCacheKeyIndex, 1);
	} else {
		cacheKey = cacheKeys.shift();
	}

	if (cacheKeys.length === 0) {
		cacheKeyMap.delete(normalizedFileUrl);
	}

	return cacheKey;
}

function getCacheKeyFromNonRequireContext(parentUrl, cacheKey, freshImportScope) {
	if (cacheKey) {
		return cacheKey;
	}

	const cacheKeyFromCjsImportScope = runtimeState.cjsImportCacheKeyStorage.getStore();

	if (cacheKeyFromCjsImportScope) {
		consumeCjsParentCacheKey(parentUrl, cacheKeyFromCjsImportScope);
		return cacheKeyFromCjsImportScope;
	}

	if (!freshImportScope) {
		const normalizedFileUrl = normalizeFileUrl(parentUrl);
		const isActiveFreshCjsParent = normalizedFileUrl && runtimeState.activeFreshCjsParentCounts.has(normalizedFileUrl);

		if (!isActiveFreshCjsParent) {
			return undefined;
		}

		return consumeCjsParentCacheKey(parentUrl);
	}

	return consumeCjsParentCacheKey(parentUrl);
}

function clearFreshRequiredModules() {
	const requireCache = nodeModule.createRequire(import.meta.url).cache;

	for (const modulePath of runtimeState.cjsFreshRequiredModules) {
		clearFreshRequireCache(requireCache, modulePath);
	}

	runtimeState.cjsFreshRequiredModules.clear();
}

function getCjsExportsCache() {
	globalThis[cjsExportsCacheGlobalKey] ||= new Map();
	return globalThis[cjsExportsCacheGlobalKey];
}

function detachModuleFromParent(moduleEntry, moduleId) {
	const parent = moduleEntry?.parent;

	if (!parent || !Array.isArray(parent.children)) {
		return;
	}

	let index = parent.children.length;

	while (index--) {
		if (parent.children[index]?.id === moduleId) {
			parent.children.splice(index, 1);
		}
	}
}

function clearRequireCacheTree(requireCache, moduleId, options, visited = new Set()) {
	if (!requireCache || typeof requireCache !== 'object') {
		return;
	}

	if (visited.has(moduleId)) {
		return;
	}

	visited.add(moduleId);
	const moduleEntry = requireCache[moduleId];

	if (!moduleEntry) {
		return;
	}

	if (options.skipNodeModules && nodeModulesPattern.test(moduleId)) {
		return;
	}

	const children = [...moduleEntry.children];

	for (const child of children) {
		if (child?.id) {
			clearRequireCacheTree(requireCache, child.id, options, visited);
		}
	}

	detachModuleFromParent(moduleEntry, moduleId);
	delete requireCache[moduleId];
}

function getCommonJsExportNames(exports) {
	if (!isObjectLike(exports)) {
		return [];
	}

	let keys;

	try {
		keys = Reflect.ownKeys(exports);
	} catch {
		return [];
	}

	const names = [];
	const intrinsicFunctionKeys = typeof exports === 'function'
		? new Set(['length', 'name', 'prototype'])
		: undefined;

	for (const key of keys) {
		if (typeof key !== 'string' || key === 'default' || key === 'module.exports') {
			continue;
		}

		if (intrinsicFunctionKeys?.has(key)) {
			continue;
		}

		let descriptor;

		try {
			descriptor = Reflect.getOwnPropertyDescriptor(exports, key);
		} catch {
			continue;
		}

		if (descriptor && Object.hasOwn(descriptor, 'value')) {
			names.push(key);
		}
	}

	return names;
}

function createCommonJsWrapperSource(cacheKey, exportNames) {
	const serializedCacheKey = JSON.stringify(cacheKey);
	const lines = [
		`const exportsCache = globalThis[${JSON.stringify(cjsExportsCacheGlobalKey)}];`,
		`const hasExports = exportsCache.has(${serializedCacheKey});`,
		`const exports = exportsCache.get(${serializedCacheKey});`,
		`exportsCache.delete(${serializedCacheKey});`,
		'if (!hasExports) throw new Error(\'Failed to read wrapped CommonJS exports.\');',
		'const moduleExports = exports;',
		'export default exports;',
		'export {moduleExports as "module.exports"};',
	];

	for (const [index, name] of exportNames.entries()) {
		const serializedName = JSON.stringify(name);
		const valueName = `__importFreshExportValue${index}`;
		lines.push(
			`const ${valueName} = exports[${serializedName}];`,
			`export {${valueName} as ${serializedName}};`,
		);
	}

	return lines.join('\n');
}

function assertSynchronousLoaderHookResult(result) {
	if (result && typeof result.then === 'function') {
		throw new Error('import-fresh does not support asynchronous loader hooks.');
	}

	return result;
}

function resolveWithCacheKey(specifier, context, nextResolve) {
	if (specifier.startsWith(cjsNamespace)) {
		return {
			url: specifier,
			format: 'module',
			shortCircuit: true,
		};
	}

	const parsedFreshSpecifier = parseImportFreshSpecifier(specifier);
	const freshImportScope = getFreshImportScope();
	let cacheKey;
	let resolvedSpecifier = specifier;
	let parentUrl = context.parentURL;
	let isRequireContext = false;

	if (parsedFreshSpecifier) {
		cacheKey = parsedFreshSpecifier.cacheKey;
		resolvedSpecifier = parsedFreshSpecifier.moduleSpecifier;
		parentUrl = parsedFreshSpecifier.parentUrl ?? parentUrl;
	} else {
		isRequireContext = isRequireResolutionContext(context);
		cacheKey = getCacheKeyFromParentUrl(parentUrl);

		if (!cacheKey && isRequireContext) {
			cacheKey = consumeEsmParentCacheKey(parentUrl);
		}

		if (!isRequireContext) {
			cacheKey = getCacheKeyFromNonRequireContext(parentUrl, cacheKey, freshImportScope);
		}
	}

	const resolveContext = parentUrl ? {...context, parentURL: parentUrl} : context;
	const resolved = assertSynchronousLoaderHookResult(nextResolve(resolvedSpecifier, resolveContext));

	if (!cacheKey || resolved.url.startsWith('node:')) {
		return resolved;
	}

	if (runtimeState.skipNodeModules && isNodeModulesResolvedUrl(resolved.url)) {
		return resolved;
	}

	if (isRequireContext && isCommonJsResolved(resolved)) {
		const requireFunction = createRequireFromParentUrl(parentUrl);
		const modulePath = prepareFreshCommonJsModule(resolved.url, cacheKey);
		const releaseActiveFreshCjsParent = markFreshCjsParentActive(resolved.url);
		setImmediate(releaseActiveFreshCjsParent);
		runtimeState.cjsFreshRequiredModules.add(modulePath);
		clearFreshRequireCache(requireFunction.cache, modulePath);
		return resolved;
	}

	if (isCommonJsResolved(resolved)) {
		const wrapperUrl = createCjsWrapperUrl(resolved.url, cacheKey);

		if (!runtimeState.cjsWrapperParentUrls.has(wrapperUrl)) {
			runtimeState.cjsWrapperParentUrls.set(wrapperUrl, parentUrl);
		}

		return {
			...resolved,
			url: wrapperUrl,
		};
	}

	if (parsedFreshSpecifier) {
		addEsmParentCacheKey(resolved.url, cacheKey);
	}

	return {
		...resolved,
		url: appendCacheKey(resolved.url, cacheKey),
	};
}

function resolveRequireParentUrl(parentUrl) {
	if (!parentUrl || typeof parentUrl !== 'string') {
		return undefined;
	}

	let resolvedParentUrl = parentUrl;

	while (resolvedParentUrl.startsWith(namespace)) {
		try {
			const parsedFreshSpecifier = parseImportFreshSpecifier(resolvedParentUrl);

			if (!parsedFreshSpecifier?.parentUrl || parsedFreshSpecifier.parentUrl === resolvedParentUrl) {
				return undefined;
			}

			resolvedParentUrl = parsedFreshSpecifier.parentUrl;
		} catch {
			return undefined;
		}
	}

	return resolvedParentUrl;
}

function createRequireFromParentUrl(parentUrl) {
	const resolvedParentUrl = resolveRequireParentUrl(parentUrl);

	if (!resolvedParentUrl) {
		return nodeModule.createRequire(import.meta.url);
	}

	let requireParentUrl = resolvedParentUrl;

	try {
		requireParentUrl = stripSearchAndHash(resolvedParentUrl);
	} catch {}

	try {
		return nodeModule.createRequire(requireParentUrl);
	} catch {
		return nodeModule.createRequire(import.meta.url);
	}
}

function loadWithCacheKey(url, context, nextLoad) {
	const parsedWrapperSpecifier = parseCjsWrapperUrl(url);

	if (!parsedWrapperSpecifier) {
		return assertSynchronousLoaderHookResult(nextLoad(url, context));
	}

	const modulePath = prepareFreshCommonJsModule(parsedWrapperSpecifier.fileUrl, parsedWrapperSpecifier.cacheKey);
	const requireFunction = createRequireFromParentUrl(runtimeState.cjsWrapperParentUrls.get(url));
	clearFreshRequireCache(requireFunction.cache, modulePath);
	const releaseActiveFreshCjsParent = markFreshCjsParentActive(parsedWrapperSpecifier.fileUrl);
	let exports;

	try {
		exports = runtimeState.cjsImportCacheKeyStorage.run(parsedWrapperSpecifier.cacheKey, () => requireFunction(modulePath));
	} finally {
		setImmediate(releaseActiveFreshCjsParent);
	}

	const wrapperCacheKey = url;
	const cjsExportsCache = getCjsExportsCache();
	cjsExportsCache.set(wrapperCacheKey, exports);

	return {
		format: 'module',
		shortCircuit: true,
		source: createCommonJsWrapperSource(wrapperCacheKey, getCommonJsExportNames(exports)),
	};
}

function validateCreateImportFreshOptions(options) {
	if (options === undefined) {
		return {skipNodeModules: false};
	}

	if (!isOptionsObject(options)) {
		throw new TypeError('Expected options to be an object.');
	}

	const {skipNodeModules: shouldSkipNodeModules = false} = options;

	if (typeof shouldSkipNodeModules !== 'boolean') {
		throw new TypeError('Expected options.skipNodeModules to be a boolean.');
	}

	return {skipNodeModules: shouldSkipNodeModules};
}

function validateImportFreshOptions(options) {
	if (options === undefined) {
		return {importAttributes: undefined};
	}

	if (!isOptionsObject(options)) {
		throw new TypeError('Expected options to be an object.');
	}

	const {importAttributes} = options;

	if (importAttributes === undefined) {
		return {importAttributes: undefined};
	}

	if (!isOptionsObject(importAttributes)) {
		throw new TypeError('Expected options.importAttributes to be an object.');
	}

	for (const [name, value] of Object.entries(importAttributes)) {
		if (typeof value !== 'string') {
			throw new TypeError(`Expected options.importAttributes.${name} to be a string.`);
		}
	}

	return {importAttributes};
}

function resolveImportAttributes(moduleSpecifier, importAttributes) {
	if (!stripQueryAndHash(moduleSpecifier).endsWith('.json')) {
		return importAttributes;
	}

	if (!importAttributes) {
		return {type: 'json'};
	}

	return {
		type: 'json',
		...importAttributes,
	};
}

function waitForNextEventLoopTurn() {
	return new Promise(resolve => {
		setImmediate(resolve);
	});
}

function clearFreshRequireCache(requireCache, modulePath) {
	clearRequireCacheTree(requireCache, modulePath, {skipNodeModules: runtimeState.skipNodeModules});
}

function prepareFreshCommonJsModule(urlString, cacheKey) {
	const {normalizedUrl, modulePath} = getModulePathFromResolvedUrl(urlString);
	addCjsParentCacheKey(normalizedUrl, cacheKey);
	return modulePath;
}

function markFreshCjsParentActive(parentUrl) {
	const normalizedFileUrl = normalizeFileUrl(parentUrl);

	if (!normalizedFileUrl) {
		return () => {};
	}

	const activeCount = runtimeState.activeFreshCjsParentCounts.get(normalizedFileUrl) ?? 0;
	runtimeState.activeFreshCjsParentCounts.set(normalizedFileUrl, activeCount + 1);
	let isReleased = false;

	return () => {
		if (isReleased) {
			return;
		}

		isReleased = true;
		const currentActiveCount = runtimeState.activeFreshCjsParentCounts.get(normalizedFileUrl);

		if (currentActiveCount === undefined || currentActiveCount <= 1) {
			runtimeState.activeFreshCjsParentCounts.delete(normalizedFileUrl);
			return;
		}

		runtimeState.activeFreshCjsParentCounts.set(normalizedFileUrl, currentActiveCount - 1);
	};
}

function enqueueFreshImport(parentFreshImportScope) {
	const freshImportRoot = parentFreshImportScope?.root ?? {nestedQueue: Promise.resolve()};
	let releaseFreshImport = () => {};
	const nextFreshImport = new Promise(resolve => {
		releaseFreshImport = resolve;
	});
	const previousFreshImport = parentFreshImportScope
		? freshImportRoot.nestedQueue
		: runtimeState.freshImportQueue;

	if (parentFreshImportScope) {
		freshImportRoot.nestedQueue = nextFreshImport;
	} else {
		runtimeState.freshImportQueue = nextFreshImport;
	}

	return {freshImportRoot, previousFreshImport, releaseFreshImport};
}

function register(options) {
	assertSupported();
	const registrationState = getRegistrationState();

	if (!registrationState.options) {
		registrationState.options = options;
		nodeModule.registerHooks({
			resolve: resolveWithCacheKey,
			load: loadWithCacheKey,
		});
	} else if (registrationState.options.skipNodeModules !== options.skipNodeModules) {
		throw new TypeError('createImportFresh() must be called with the same options across one process.');
	}

	runtimeState.skipNodeModules = registrationState.options.skipNodeModules;
}

export default function createImportFresh(parentUrl, options = {}) {
	const normalizedParentUrl = normalizeParentUrl(parentUrl);
	const {skipNodeModules: shouldSkipNodeModules} = validateCreateImportFreshOptions(options);
	register({skipNodeModules: shouldSkipNodeModules});

	return async function (moduleSpecifier, importFreshOptions) {
		if (typeof moduleSpecifier !== 'string') {
			throw new TypeError('Expected a string.');
		}

		const {importAttributes} = validateImportFreshOptions(importFreshOptions);
		const resolvedImportAttributes = resolveImportAttributes(moduleSpecifier, importAttributes);
		const importOptions = resolvedImportAttributes ? {with: resolvedImportAttributes} : undefined;
		const parentFreshImportScope = getFreshImportScope();
		const {freshImportRoot, previousFreshImport, releaseFreshImport} = enqueueFreshImport(parentFreshImportScope);

		await previousFreshImport;

		let hasActiveFreshImport = false;

		try {
			const cacheKey = crypto.randomUUID();
			const moduleNamespace = await runtimeState.freshImportScopeStorage.run({root: freshImportRoot, cacheKey}, async () => {
				clearFreshRequiredModules();
				const freshSpecifier = createImportFreshSpecifier(moduleSpecifier, cacheKey, normalizedParentUrl);
				runtimeState.activeFreshImportCount++;
				hasActiveFreshImport = true;
				const loadedModule = importOptions ? await import(freshSpecifier, importOptions) : await import(freshSpecifier);
				await waitForNextEventLoopTurn();
				return loadedModule;
			});
			return moduleNamespace;
		} finally {
			if (hasActiveFreshImport) {
				await waitForNextEventLoopTurn();
				runtimeState.activeFreshImportCount--;

				if (runtimeState.activeFreshImportCount === 0) {
					runtimeState.esmParentCacheKeys.clear();
					runtimeState.cjsParentCacheKeys.clear();
					runtimeState.activeFreshCjsParentCounts.clear();
					runtimeState.cjsWrapperParentUrls.clear();
				}
			}

			releaseFreshImport();
		}
	};
}
