import * as ReactDOMClient from 'react-dom'

const ReactDOM = { ...ReactDOMClient }

if (!ReactDOM.findDOMNode && typeof ReactDOMClient.findDOMNode === 'function') {
  ReactDOM.findDOMNode = ReactDOMClient.findDOMNode
}

export * from 'react-dom'
export default ReactDOM
