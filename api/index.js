"use strict";
const express = require("express");
const http = require("http");
const axios = require("axios");
const cors = require("cors");
const io = require("socket.io");
const { Kraken } = require("./lib/kraken");
const { OrderBook } = require("./lib/order_book");

const app = express();
app.use(cors());

app.get("/asset_pairs", async (req, res) => {
  const { data } = await axios.get(
    "https://api.kraken.com/0/public/AssetPairs"
  );
  return res.json(data.result);
});

app.get("/healthcheck", (req, res) => res.send("OK"));

const PORT = process.env.PORT || 8080;

const httpServer = http.Server(app);

const socketServer = io({ serveClient: false });

const exchanges = new Map();

socketServer.on("connection", function onConnection(socket) {
  let subscriptions = [];
  socket.on("subscribe", ({ symbol }) => {
    const sink = {
      snapshot({ bids, asks }) {
        socket.emit(`${symbol}:book_snapshot`, {
          bids,
          asks
        });
      },
      update({ bids, asks }) {
        socket.emit(`${symbol}:book_update`, {
          bids,
          asks
        });
      }
    };
    let exchange;
    if (!exchanges.has(symbol)) {
      exchange = new Kraken({
        symbol: symbol,
        depth: 10
      });
      exchanges.set(symbol, exchange);
    } else {
      exchange = exchanges.get(symbol);
    }
    subscriptions.push(exchange.subscribe(sink));
  });

  socket.on("disconnect", function onDisconnected() {
    subscriptions.forEach(unsubscribe => unsubscribe());
  });
});

socketServer.attach(httpServer);

httpServer.listen(PORT, "0.0.0.0", err => {
  if (!err) {
    console.log("Server started on port " + PORT);
  }
});
