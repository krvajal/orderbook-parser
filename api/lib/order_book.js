const { Kraken } = require("./kraken");
const debug = require("debug")("orderbook");

// Each how many milliseconds it will calculate and display the speed
const PERIOD = 10000;
// the range of positions to rotate,
// so we avoid integer overflow
const RANGE = 100;

const books = new Map();

function getOrderBook(symbol) {
  let book;
  if (!books.has(symbol)) {
    book = new OrderBook({ symbol });
    books.set(symbol, book);
  } else {
    book = books.get(symbol);
  }
  return book;
}

function OrderBook({ symbol, depth = 10 }) {
  this.pos = 0;
  this.refCount = 0;
  this.symbol = symbol;
  this.kraken = new Kraken({
    symbol,
    depth: depth,
    sink: {
      update: ({ asks, bids }) => {
        this.pos = nextPos(this.pos);
        debug("update received");
        if (bids) {
          this.update("bids", bids);
          this.updatesQueue.push({ bids, pos: this.pos });
        }
        if (asks) {
          this.update("asks", asks);
          this.updatesQueue.push({ asks, pos: this.pos });
        }

        this.notify("update");
        // this is growing uncontrolled
        // so we should remove old updates
        // at some point
        this.updates.push(Date.now());
      },
      snapshot: ({ asks, bids }) => {
        this.initialized = true;
        debug("snapshot received");
        this.update("asks", asks);
        this.update("bids", bids);
        this.notify("snapshot");
      },
    },
  });

  this.bids = new Map();
  this.asks = new Map();
  this.depth = depth;
  this.subscriptions = [];
  this.updatesQueue = [];
  this.initialized = false;
  // keep a list of tiemstamps of update arrivals
  // so we can calculate the speed

  this.updates = [];

  setInterval(() => {
    this.notify("speed");
  }, PERIOD);
}

OrderBook.prototype.update = function updateOrderBook(side, updates) {
  const orders = side === "bids" ? this.bids : this.asks;
  for (let [price, vol, timestamp] of updates) {
    if (vol > 0) {
      orders.set(price, vol);
    } else {
      if (orders.has(price)) {
        orders.delete(price);
      }
    }
  }
};

OrderBook.prototype.subscribe = function subscribe(observer) {
  debug("adding observer");
  this.subscriptions.push(observer);
  this.refCount = this.refCount + 1;
  if (this.initialized) {
    observer("snapshot", this.buildSnapshot());
  }
  return () => {
    debugger;
    this.subscriptions = this.subscriptions.filter((o) => o !== observer);
    this.refCount = this.refCount - 1;
    if (this.refCount === 0) {
      debugger;
      books.delete(this.symbol);
    }
  };
};

OrderBook.prototype.buildSnapshot = function buildSnapshot() {
  const sortedBids = Array.from(this.bids)
    .sort(([price1, price2]) => parseFloat(price1) - parseFloat(price2))
    .slice(0, this.depth);
  const sortedAsks = Array.from(this.asks)
    .sort(([price1, price2]) => parseFloat(price2) - parseFloat(price1))
    .slice(0, this.depth);

  return { asks: sortedAsks, bids: sortedBids, pos: this.pos };
};

OrderBook.prototype.notify = function notify(type) {
  if (type === "snapshot") {
    const snapshot = this.buildSnapshot();
    this.subscriptions.forEach((observer) => observer("snapshot", snapshot));
  }

  if (type === "update") {
    while (this.updatesQueue.length > 0) {
      const oldestUpdate = this.updatesQueue.shift();
      this.subscriptions.forEach((observer) =>
        observer("update", oldestUpdate)
      );
    }
  }
  if (type === "speed") {
    const end = Date.now();
    const start = end - PERIOD;

    const ordersPerMin =
      (this.updates.filter(inRange([start, end])).length * 60000.0) / PERIOD;

    this.subscriptions.forEach((observer) => observer("speed", ordersPerMin));
  }
};

module.exports = { getOrderBook };

function nextPos(pos) {
  return (pos + 1) % RANGE;
}

const inRange = ([start, end]) => (val) => val <= end && val >= start;
