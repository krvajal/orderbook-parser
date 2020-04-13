# `orderbook-parser`

Example projects that shows how to obtain orderbook snapshots from Kraken.

## Requirements

- You need a relatively new version of Node.js (this was tested with version 13.3.0)
- `yarn` package manager

## How to install

- `git clone` this repo
- Run `yarn` to install the dependencies

## How to run

Just `yarn start`.


### Questions

- Keep the order book on the server
  Single subscriber to an orderbook
- The order book is built in the client
  Less load on the server
  More connections needs to be made per subscriber
  More efficient data transport