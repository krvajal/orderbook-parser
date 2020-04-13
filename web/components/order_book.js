import React from "react";
import classNames from "classnames";
import io from "socket.io-client";

function OrderBook({ symbol }) {
  const [loading, setLoading] = React.useState(true);
  const [asks, setAsks] = React.useState([]);
  const [bids, setBids] = React.useState([]);

  function updateOrders(orderUpdates, setOrders) {
    setOrders(orders => {
      const ordersMap = new Map(orders);
      for (let [price, vol, timestamp] of orderUpdates) {
        if (vol != 0) {
          ordersMap.set(price, [vol, timestamp]);
        } else {
          if (ordersMap.has(price)) {
            ordersMap.delete(price);
          }
        }
      }
      return Array.from(ordersMap);
    });
  }

  React.useEffect(() => {
    const connection = io(process.env.API_URL);
    connection.on(`${symbol}:book_snapshot`, snapshot => {
      setAsks(
        snapshot.asks.map(([price, vol, timestamp]) => [
          price,
          [vol, timestamp]
        ])
      );
      setBids(
        snapshot.bids.map(([price, vol, timestamp]) => [
          price,
          [vol, timestamp]
        ])
      );
      setLoading(false);
    });
    connection.on(`${symbol}:book_update`, ({ asks, bids }) => {
      if (asks) {
        updateOrders(asks, setAsks);
      }
      if (bids) {
        updateOrders(bids, setBids);
      }
    });
    connection.emit("subscribe", { symbol: symbol });
  }, []);

  const lastAsks = asks
    .sort(([price1], [price2]) => price1 - price2)
    .slice(0, 10)
    .reverse();
  const lastBids = bids
    .sort(([price1], [price2]) => price2 - price1)
    .slice(0, 10);

  const higherAskVol = lastAsks.reduce((max, order) => {
    const vol = parseFloat(order[1][0]);
    if (vol > max) {
      return vol;
    }
    return max;
  }, 0);

  const higherBidVol = lastBids.reduce((max, order) => {
    const vol = parseFloat(order[1][0]);
    if (vol > max) {
      return vol;
    }
    return max;
  }, 0);

  const higherAsk = lastAsks[9];
  const higherBid = lastBids[0];

  const midPrice = (parseFloat(higherAsk) + parseFloat(higherBid)) * 0.5;
  const spread = (parseFloat(higherAsk) - parseFloat(higherBid)) / midPrice;

  return (
    <section
      className="font-mono flex flex-col mx-1 h-full rounded-sm"
      style={{
        background: "#15202b",
        maxWidth: 256,
        width: 256,
        minWidth: "fit-content"
      }}
    >
      <header
        className="py-1 px-2"
        style={{ borderBottom: "2px solid #10171e" }}
      >
        <h3>{symbol}</h3>
      </header>
      <div className="my-2 text-xs">
        <table className="table-fixed">
          <thead>
            <tr>
              <td className="w-12"></td>
              <td className="pl-2 w-32">Price</td>
              <td className="w-32">Volumen</td>
            </tr>
          </thead>
          <tbody>
            {lastAsks.map(ask => {
              return (
                <Order
                  key={ask[0]}
                  order={ask}
                  side="asks"
                  maxVolumen={higherAskVol}
                />
              );
            })}
          </tbody>
        </table>
      </div>
      {!loading && (
        <div className="p-2 text-center">
          <span className="text-lg">{midPrice.toPrecision(8) || "-"} </span>
          <br />
          <span className="text-sm">
            (Spread: {spread ? (spread * 100).toFixed(3) : "-"}%)
          </span>
        </div>
      )}
      <div className="text-xs">
        <table className="table-fixed">
          <tbody>
            {lastBids.map(bid => {
              return (
                <Order
                  key={bid[0]}
                  order={bid}
                  side="bids"
                  maxVolumen={higherBidVol}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const Order = React.memo(function Order({ order, side, maxVolumen }) {
  return (
    <tr className="hover:bg-blue-900">
      <td className="w-12">
        <div
          className={classNames("h-4 opacity-25", {
            "bg-red-600 ": side === "asks",
            "bg-green-400": side === "bids"
          })}
          style={{ width: `${(order[1][0] / maxVolumen) * 100.0}%` }}
        ></div>
      </td>
      <td
        className={classNames("w-32 pl-2", {
          "text-green-400": side === "bids",
          "text-red-600": side === "asks"
        })}
      >
        {order[0]}
      </td>
      <td className="w-24 pr-2">{order[1][0]}</td>
    </tr>
  );
});

export default OrderBook;
