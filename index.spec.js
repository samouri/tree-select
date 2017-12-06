const createSelector = require('./index');
const _ = require('lodash');

const warn = jest.fn();
global.console = { ...console, warn };

describe('index', () => {
	const post1 = { id: 'id1', text: 'here is post 1', siteId: 'site1' };
	const post2 = { id: 'id2', text: 'here is post 2', siteId: 'site1' };
	const post3 = { id: 'id3', text: 'here is post 3', siteId: 'site2' };

	let getSitePosts;
	let selector;
	let getDependents;

	beforeEach(() => {
		selector = jest.fn(({ posts }, siteId) => _.filter(posts, { siteId }));
		getDependents = jest.fn(state => ({ posts: state.posts }));
		getSitePosts = createSelector({ selector, getDependents });
	});

	test('should create a function which returns the expected value when called', () => {
		const state = {
			posts: {
				[post1.id]: post1,
				[post2.id]: post2,
				[post3.id]: post3,
			},
		};

		expect(getSitePosts(state, 'site1')).toEqual([post1, post2]);
	});

	test('should cache the result of a selector function', () => {
		const reduxState = {
			posts: {
				[post1.id]: post1,
				[post2.id]: post2,
				[post3.id]: post3,
			},
		};

		getSitePosts(reduxState, 2916284);
		getSitePosts(reduxState, 2916284);

		expect(selector).calledOnce;
	});

	test.only('should warn against complex arguments', () => {
		console.warn.mockClear();
		const state = { posts: {} };

		getSitePosts(state, 1);
		getSitePosts(state, '');
		getSitePosts(state, 'foo');
		getSitePosts(state, true);
		getSitePosts(state, null);
		getSitePosts(state, undefined);
		getSitePosts(state, {});
		getSitePosts(state, []);
		getSitePosts(state, 1, []);

		expect(console.warn.mock.calls.length).toBe(3);
	});

	test('should return the expected value of differing arguments', () => {
		const state = {
			posts: {
				[post1.id]: post1,
				[post3.id]: post3,
			},
		};

		getSitePosts(state, post1.siteId);
		const sitePosts = getSitePosts(state, post3.siteId);
		getSitePosts(state, post1.siteId);

		expect(sitePosts).toEqual([post3]);
		expect(selector.mock.calls.length).toBe(2);
	});

	test('should bust the cache when watched state changes', () => {
		const prevState = {
			posts: {
				[post1.id]: post1,
			},
		};

		getSitePosts(prevState, post1.siteId);

		const nextState = {
			posts: {
				[post1.id]: { ...post1, modified: true },
				[post3.id]: post3,
			},
		};

		expect(getSitePosts(nextState, post1.siteId)).toEqual([{ ...post1, modified: true }]);
		expect(selector).calledTwice;
	});

	test('should keep the cache on a per-key basis', () => {
		const getPostByIdWithDataSpy = jest.fn(({ post }) => {
			return {
				...post,
				withData: true,
			};
		});

		const getPostByIdWithData = createSelector({
			selector: getPostByIdWithDataSpy,
			getDependents: (state, postId) => ({ post: state.posts[postId] }),
		});

		const prevState = {
			posts: {
				[post1.id]: post1,
			},
		};

		getPostByIdWithData(prevState, post1.id);

		const nextState = {
			posts: {
				[post1.id]: post1,
				[post2.id]: post2,
			},
		};

		expect(getPostByIdWithData(nextState, post1.id)).toEqual({
			...post1,
			withData: true,
		});
		getPostByIdWithData(nextState, post1.id);
		expect(getPostByIdWithDataSpy).calledOnce;
	});

	test('should throw an error if getDependents is missing', () => {
		expect(() => createSelector({ selector })).toThrow();
	});

	test('should throw an error if selector is missing', () => {
		expect(() => createSelector({ getDependents })).toThrow();
	});

	test('should warn if getDependents returns a primitive ', () => {
		console.warn.mockClear();
		const cachedSelector = createSelector({
			selector: () => null,
			getDependents: () => 5,
		});
		cachedSelector();
		expect(console.warn.mock.calls.length).toBe(1);
	});

	test('should call dependant state getter with dependents and arguments', () => {
		const memoizedSelector = createSelector({ selector, getDependents });
		const state = { posts: {} };

		memoizedSelector(state, 1, 2, 3);

		expect(getDependents).toHaveBeenCalledWith({ posts: {} }, 1, 2, 3);
	});
});
