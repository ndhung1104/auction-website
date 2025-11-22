# Page snapshot

```yaml
- generic [ref=e2]:
  - navigation [ref=e3]:
    - generic [ref=e4]:
      - link "AuctionApp" [ref=e5] [cursor=pointer]:
        - /url: /
      - generic [ref=e6]:
        - list [ref=e7]:
          - listitem [ref=e8]:
            - link "Home" [ref=e9] [cursor=pointer]:
              - /url: /
          - listitem [ref=e10]:
            - link "Products" [ref=e11] [cursor=pointer]:
              - /url: /products
          - listitem [ref=e12]:
            - button "Categories" [ref=e13] [cursor=pointer]
        - list [ref=e14]:
          - listitem [ref=e15]:
            - generic [ref=e16]:
              - searchbox "Search products..." [ref=e17]
              - button "Go" [ref=e18] [cursor=pointer]
          - listitem [ref=e19]:
            - link "Login" [ref=e20] [cursor=pointer]:
              - /url: /login
          - listitem [ref=e21]:
            - link "Register" [ref=e22] [cursor=pointer]:
              - /url: /register
  - main [ref=e23]:
    - generic [ref=e24]:
      - heading "Search" [level=1] [ref=e26]
      - generic [ref=e27]:
        - textbox "Search products..." [ref=e28]
        - button "Search" [ref=e29] [cursor=pointer]
      - generic [ref=e30]: Type a keyword above to explore available auctions.
  - contentinfo [ref=e31]:
    - generic [ref=e33]: © 2025 AuctionApp — All rights reserved.
```