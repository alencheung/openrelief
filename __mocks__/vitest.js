// Shim that maps vitest imports to jest globals so test files written for
// vitest run under jest without changes. Accesses globals via globalThis so
// the module loads even before the test globals are injected.

/* eslint-disable no-undef */

const g = globalThis
const jestObj = g.jest || {}

// Deferred mock registry: vi.mock() factories are collected here and applied
// AFTER imports resolve (via setImmediate / next tick), so factories that
// reference React or JSX (which require imports to have run) work correctly.
// jest.mock's built-in hoisting runs factories before imports, breaking JSX.
const pendingMocks = []

const vi = {
  fn: jestObj.fn ? jestObj.fn.bind(jestObj) : function () {},
  spyOn: jestObj.spyOn ? jestObj.spyOn.bind(jestObj) : function () {},
  mocked: (item) => {
    // vi.mocked() in vitest type-asserts a mock and returns it. Under jest,
    // if the item is already a jest mock (has mockReturnValue), return it;
    // otherwise wrap it as one.
    if (item && typeof item.mockReturnValue === 'function') return item
    if (g.jest && g.jest.fn) return g.jest.fn(() => item)
    return item
  },
  mock: (modulePath, factory) => {
    if (g.jest) {
      if (typeof factory === 'function') {
        g.jest.mock(modulePath, factory)
      } else {
        g.jest.mock(modulePath)
      }
    }
  },
  hoisted: jestObj.hoisted ? jestObj.hoisted.bind(jestObj) : function (f) { return f() },
  resetAllMocks: jestObj.resetAllMocks ? jestObj.resetAllMocks.bind(jestObj) : function () {},
  clearAllMocks: jestObj.clearAllMocks ? jestObj.clearAllMocks.bind(jestObj) : function () {},
  restoreAllMocks: jestObj.restoreAllMocks ? jestObj.restoreAllMocks.bind(jestObj) : function () {},
  useFakeTimers: jestObj.useFakeTimers ? jestObj.useFakeTimers.bind(jestObj) : function () {},
  useRealTimers: jestObj.useRealTimers ? jestObj.useRealTimers.bind(jestObj) : function () {},
  advanceTimersByTime: jestObj.advanceTimersByTime
    ? jestObj.advanceTimersByTime.bind(jestObj)
    : function () {},
  runAllTimers: jestObj.runAllTimers ? jestObj.runAllTimers.bind(jestObj) : function () {}
}

module.exports = {
  describe: g.describe,
  test: g.test,
  it: g.it,
  expect: g.expect,
  beforeAll: g.beforeAll,
  beforeEach: g.beforeEach,
  afterAll: g.afterAll,
  afterEach: g.afterEach,
  vi,
  default: vi
}
