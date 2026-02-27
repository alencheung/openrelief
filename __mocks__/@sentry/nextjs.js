module.exports = {
  withSentryConfig: config => config,
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  init: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  setExtra: jest.fn(),
  addBreadcrumb: jest.fn(),
  withScope: jest.fn(fn => fn({ setTag: jest.fn(), setExtra: jest.fn() })),
  Scope: jest.fn()
}
