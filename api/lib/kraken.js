const WebSocket = require("ws");
const debug = require("debug")("kraken");

function Kraken({ symbol, depth = 100, sink }) {
  const ws = new WebSocket("wss://ws.kraken.com");
  ws.onopen = function onOpen() {
    debug("connection open");

    ws.send(
      JSON.stringify({
        event: "subscribe",
        pair: [symbol],
        subscription: {
          name: "book",
          depth: depth
        }
      })
    );
  };

  //  On subscription, a snapshot will be published at the specified depth, following the snapshot, level updates will be published
  ws.onmessage = ({ data }) => {
    const payload = JSON.parse(data);

    if (Array.isArray(payload)) {
      const { ask, asks, bid, bids, pair } = normalizePayload(payload);

      if (pair !== symbol) {
        throw new Error(`${pair} update received. Expected: ${symbol}`);
      }

      if (bids && asks) {
        // order book snapshot
        sink.snapshot({ bids, asks });
      } else {
        // These are updates, not orderbook snapshots. In a normal implementation they should update the last
        // orderbook snapshot in memory and deliver the up-to-date orderbook.
        sink.update({ bids: bid, asks: ask });
      }
    } else {
      const { event } = payload;
      if (event === "heartbeat") {
        debug("heartbeat received");
      } else if (["systemStatus", "subscriptionStatus"].includes(event)) {
        // do nothing
      } else {
        console.error("Unknown update received", payload);
      }
    }
  };

  ws.onerror = function onError(e) {
    console.error(e);
  };

  ws.onclose = function onClose() {
    console.error("[kraken] WebSocket connection closed");
    process.exit(2);
  };
}

// example usage
// const exchange = Kraken({ symbol: "ETH/XBT", sink });

module.exports = { Kraken };

// See https://www.kraken.com/features/websocket-api#message-book for payload example
function normalizePayload(payload) {
  if (payload.length === 5) {
    const [, { a: ask }, { b: bid }, , pair] = payload;
    // ask && bid
    return { ask, bid, pair };
  }
  // [channelID, orders, channelName, pair]
  // orders: {as: Array<[price, volumen, timestamp]>, bs: Array<[price, volumen, timestamp]> }
  // the array of price levels is sortedç
  const [, { as: asks, bs: bids, a: ask, b: bid }, , pair] = payload;
  // ask || bid || (asks && bids)
  return { ask, bid, asks, bids, pair };
}
