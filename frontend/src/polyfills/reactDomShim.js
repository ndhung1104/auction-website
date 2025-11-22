import * as ReactDOMModule from 'react-dom'

// React 19 ESM builds no longer expose a default export. Some third-party
// libraries (e.g. react-quill@2) still expect `react-dom` to provide
// `default.findDOMNode`. This shim ensures the default export exists and
// points back to the namespace object so those libraries keep working.
if (!ReactDOMModule.default) {
  ReactDOMModule.default = ReactDOMModule
}

if (
  typeof ReactDOMModule.findDOMNode === 'function' &&
  typeof ReactDOMModule.default.findDOMNode !== 'function'
) {
  ReactDOMModule.default.findDOMNode = ReactDOMModule.findDOMNode
}
