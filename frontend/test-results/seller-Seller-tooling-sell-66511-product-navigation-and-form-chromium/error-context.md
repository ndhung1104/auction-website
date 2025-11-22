# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "Unexpected Application Error!" [level=2] [ref=e3]
  - heading "react_dom_1.default.findDOMNode is not a function" [level=3] [ref=e4]
  - generic [ref=e5]: "TypeError: react_dom_1.default.findDOMNode is not a function at ReactQuill2.getEditingArea (http://localhost:5173/node_modules/.vite/deps/react-quill.js?v=19af75e8:13139:45) at ReactQuill2.instantiateEditor (http://localhost:5173/node_modules/.vite/deps/react-quill.js?v=19af75e8:13028:50) at ReactQuill2.componentDidMount (http://localhost:5173/node_modules/.vite/deps/react-quill.js?v=19af75e8:12998:16) at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=19af75e8:18527:22) at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=19af75e8:997:72) at reappearLayoutEffects (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=19af75e8:10874:65) at recursivelyTraverseReappearLayoutEffects (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=19af75e8:10986:11) at reappearLayoutEffects (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=19af75e8:10901:13) at recursivelyTraverseReappearLayoutEffects (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=19af75e8:10986:11) at reappearLayoutEffects (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=19af75e8:10901:13)"
  - paragraph [ref=e6]: 💿 Hey developer 👋
  - paragraph [ref=e7]:
    - text: You can provide a way better UX than this when your app throws errors by providing your own
    - code [ref=e8]: ErrorBoundary
    - text: or
    - code [ref=e9]: errorElement
    - text: prop on your route.
```