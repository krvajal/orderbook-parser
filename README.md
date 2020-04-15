# `orderbook-parser`

Example projects that shows how to obtain orderbook snapshots from Kraken.

## Requirements

- You need a relatively new version of Node.js (this was tested with version 13.3.0)
- `yarn` package manager

## How to install

- `git clone` this repo
- Run `(cd api && yarn install)` to install the server dependencies
- Run `(cd web && yarn install)` to install the server dependencies

## How to run

This repo is composed of two apps.

- One is a node app which have a tiny express server. To run the server

```bash
cd api && yarn start
```

- The other is a web client written in React. To run the client on dev mode you need to

```
cd web && yarn dev
```

This will start the client app on http://localhost:3000 and it will get connected to the express server.

### Questions

- Keep the order book on the server
  Single subscriber to an orderbook
- The order book is built in the client
  Less load on the server
  More connections needs to be made per subscriber
  More efficient data transport
