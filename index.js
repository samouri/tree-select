function createSelector({ selector, getDependents }) {
	if (!isFunction(selector) || !isFunction(getDependents)) {
		throw new TypeError(
			'createCachedSelector: invalid arguments passed, selector and getDependents must both be functions'
		);
	}

	const cache = new WeakMap();

	const cachedSelector = function(state, ...args) {
		const dependents = getDependents(state, ...args);
		const sortedDependentsArray = Object.keys(dependents)
			.sort()
			.map(key => dependents[key]);

		if (args.some(isObject)) {
			console.warn('Do not pass complex objects as arguments to a cachedSelector');
		}
		if (!isObject(dependents) || isEmpty(dependents)) {
			console.warn('getDependents must return an object');
			return undefined;
		}

		// create a dependency tree for caching selector results.
		// this is beneficial over standard memoization techniques so that we can
		// garbage collect any values that are based on outdated dependents
		let currCache = cache;
		sortedDependentsArray.forEach(dependent => {
			if (!currCache.has(dependent)) {
				const isLast = last(sortedDependentsArray) === dependent;
				currCache.set(dependent, isLast ? new Map() : new WeakMap());
			}
			currCache = currCache.get(dependent);
		});

		const key = castArray(args).join();
		if (!currCache.has(key)) {
			currCache.set(key, selector(dependents, ...args));
		}

		return currCache.get(key);
	};

	return cachedSelector;
}

/* 
 * Lodash Functions
 */
function isObject(value) {
	var type = typeof value;
	return value !== null && (type == 'object' || type == 'function');
}

function isFunction(value) {
	var type = typeof value;
	return value !== null && type === 'function';
}

function castArray() {
	if (!arguments.length) {
		return [];
	}
	var value = arguments[0];
	return Array.isArray(value) ? value : [value];
}

function last(array) {
	var length = array == null ? 0 : array.length;
	return length ? array[length - 1] : undefined;
}

function isEmpty(object) {
	return Object.keys(object).length === 0;
}

module.exports = createSelector;
