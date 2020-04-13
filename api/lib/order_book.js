function OrderBook({ bids, asks, depth = 10 }) {
  this.bids = new Map(bids);
  this.asks = new Map(asks);
  this.depth = depth;
  this.subscribers = [];
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
  this.notify();
};

OrderBook.prototype.subscribe = function subscribe(subscriber) {
  this.subscribers.push(subscriber);
  return () => this.subscribers.filter(s => s !== subscriber);
};

OrderBook.prototype.buildSnapshot = function buildSnapshot() {
  const sortedBids = this.bids
    .entries()
    .sort(([price1, price2]) => price1 - price2)
    .slice(0, this.depth)
    .reverse();
  const sortedAsks = this.bids
    .entries()
    .sort(([price1, price2]) => price2 - price1)
    .slice(0, this.depth);
  return { asks: sortedAsks, bids: sortedBids };
};

OrderBook.prototype.notify = function notify() {
  const snapshot = this.buildSnapshot();
  this.subscribers.forEach(subscriber => subscriber(snapshot));
};

module.exports = { OrderBook };
