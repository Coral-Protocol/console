# Coral Console

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Coral-Protocol/console)

Create, manage & inspect agent sessions with Console, which comes prebuilt and served with the [CoralOS Server](https://github.com/Coral-Protocol/coral-server/).

<img width="1960" height="1152" alt="coralos-console-01" src="https://github.com/user-attachments/assets/9591f1d5-f7ed-4c9e-9d25-4d83fdc1ca51" />


<!-- # Getting Started -->
<!-- ### Running via npx -->
<!---->
<!-- ```bash -->
<!-- npx @coral-protocol/console -->
<!-- ``` -->
<!-- Coral studio will be available at [`http://localhost:3000/`](http://localhost:3000/) -->

<!-- ### Running via Docker -->
<!-- ```bash -->
<!-- docker run -p 3000:3000 ghcr.io/coral-protocol/console -->
<!-- ``` -->
<!-- Coral Console will be available at [`http://localhost:3000/`](http://localhost:3000/) -->

### Developing

Install dependencies with:

```bash
yarn install
```

Then, start a development server to view your changes:

```bash
yarn dev
```

Connecting to a local CoralOS Server will require a proxy in your vite.config.ts file:

```js
server: {
  proxy: {
    '/api': { target: 'http://localhost:5555', changeOrigin: true },
    '/sse': { target: 'http://localhost:5555', changeOrigin: true },
    '/ws': { target: 'http://localhost:5555', rewriteWsOrigin: true, ws: true }
  }
},
```

