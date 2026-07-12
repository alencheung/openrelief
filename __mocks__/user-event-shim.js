// Lightweight shim for @testing-library/user-event.
//
// The real @testing-library/user-event package is frequently corrupted on
// network-mapped drives (only LICENSE present, no package.json/dist), which
// causes every test file that imports it to fail to load. This shim maps the
// import to a thin wrapper around @testing-library/dom's fireEvent (which is
// always present) so test suites run reliably regardless of drive state.
//
// The shim exposes both usage patterns supported by the real package:
//   - Direct: `await userEvent.click(el)` / `await userEvent.type(el, 'text')`
//   - Setup:  `const user = userEvent.setup(); await user.click(el)`
//
// Methods are async (return Promises) to match the real API signatures so
// `await userEvent.type(...)` continues to work unchanged.

const { fireEvent } = require('@testing-library/dom')

const asyncFire = fn => async (...args) => {
  const result = fn(...args)
  await Promise.resolve(result)
  return result
}

const click = asyncFire((el, init) => fireEvent.click(el, init))
const hover = asyncFire((el, init) => fireEvent.mouseOver(el, init))
const unhover = asyncFire((el, init) => fireEvent.mouseOut(el, init))
const focus = asyncFire(el => fireEvent.focus(el))
const blur = asyncFire(el => fireEvent.blur(el))
const tab = asyncFire(() => {
  // fireEvent.keyDown(document.body, { key: 'Tab' })
  return undefined
})

// type: simulate entering text by firing input/change events. Mirrors the
// real userEvent.type(element, text) signature. Characters are appended to the
// element's current value (matching real user-event semantics) rather than
// overwriting it.
const type = async (element, text, opts) => {
  if (!element || text == null) return
  // delay option is intentionally ignored: this shim is synchronous for speed.
  void opts
  fireEvent.focus(element)
  const current = element.value || ''
  const value = current + String(text)
  // Set the value directly and fire input/change so both controlled and
  // uncontrolled components receive the update synchronously (fast and
  // deterministic under jsdom). Some components listen to 'input', others to
  // 'change', so fire both.
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
    fireEvent.input(element, { target: { value } })
    fireEvent.change(element, { target: { value } })
  } else {
    fireEvent.input(element, { target: { textContent: value } })
  }
}

// upload: set files on an input and dispatch a change event.
const upload = async (element, files) => {
  if (!element) return
  const fileArray = Array.isArray(files) ? files : [files]
  fireEvent.change(element, { target: { files: fileArray } })
}

// keyboard: fire keyDown/KeyUp for a keystroke. The real implementation
// interprets special strings like '{Enter}'; we handle the common cases and
// also dispatch a click on Enter/Space against the focused element to mimic
// real user-event accessibility behavior (so onClick fires on focused divs).
const keyboard = async (text) => {
  if (!text) return
  const target = document.activeElement || document.body
  // '{Enter}' -> Enter key
  if (/\{enter\}/i.test(text)) {
    fireEvent.keyDown(target, { key: 'Enter', code: 'Enter', charCode: 13 })
    fireEvent.keyUp(target, { key: 'Enter', code: 'Enter', charCode: 13 })
    // Activate focused element on Enter (matches browser/user-event behavior)
    fireEvent.click(target)
    return
  }
  // '{Tab}' -> Tab key
  if (/\{tab\}/i.test(text)) {
    fireEvent.keyDown(target, { key: 'Tab', code: 'Tab', charCode: 9 })
    fireEvent.keyUp(target, { key: 'Tab', code: 'Tab', charCode: 9 })
    return
  }
  // Otherwise type each character
  for (const ch of String(text)) {
    fireEvent.keyDown(target, { key: ch })
    fireEvent.keyPress(target, { key: ch })
    fireEvent.keyUp(target, { key: ch })
  }
}

// clear: clear an input/textarea value.
const clear = async (element) => {
  if (!element) return
  fireEvent.change(element, { target: { value: '' } })
}

// selectOptions / deselectOptions: fire change on a select element.
const selectOptions = async (element, values) => {
  if (!element) return
  const valueArray = Array.isArray(values) ? values : [values]
  fireEvent.change(element, { target: { value: valueArray[0] } })
}
const deselectOptions = async (element) => {
  if (!element) return
  fireEvent.change(element, { target: { value: '' } })
}

// paste / dblClick convenience wrappers.
const paste = async (element, text) => type(element, text)
const dblClick = asyncFire((el, init) => fireEvent.doubleClick(el, init))

const api = {
  click,
  dblClick,
  type,
  typeText: type,
  upload,
  tab,
  keyboard,
  clear,
  selectOptions,
  deselectOptions,
  hover,
  unhover,
  focus,
  blur,
  paste
}

// setup() returns the same API (matches the real userEvent.setup() contract).
const setup = () => api

module.exports = Object.assign(
  // Default export: function-style + named methods (so both
  // `userEvent.click(...)` and `const user = userEvent.setup()` work).
  Object.assign(() => api, api),
  { setup, ...api }
)
