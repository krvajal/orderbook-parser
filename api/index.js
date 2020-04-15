"use strict";
const express = require("express");
const http = require("http");
const axios = require("axios");
const cors = require("cors");
const io = require("socket.io");
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

const socketServer = io({ serveClient: false, transports: ["websocket"] });

const exchanges = new Map();

function getExchange(symbol) {
  let exchange;
  if (!exchanges.has(symbol)) {
    exchange = new OrderBook({ symbol });
    exchanges.set(symbol, exchange);
  } else {
    exchange = exchanges.get(symbol);
  }
  return exchange;
}

socketServer.on("connection", function onConnection(socket) {
  let subscriptions = [];
  socket.on("subscribe", ({ symbol }) => {
    const exchange = getExchange(symbol);

    subscriptions.push(
      exchange.subscribe((type, payload) => {
        if (type === "snapshot") {
          const { asks, bids } = payload;
          socket.emit(`${symbol}:book_snapshot`, { asks, bids });
        }
        if (type === "update") {
          const { asks, bids, pos } = payload;
          socket.emit(`${symbol}:book_update`, { asks, bids, pos });
        }
        if (type === "speed") {
          socket.emit(`${symbol}:speed_update`, payload);
        }
      })
    );
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
