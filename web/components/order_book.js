import React from "react";
import classNames from "classnames";
import io from "socket.io-client";

function OrderBook({ symbol }) {
  const { asks, bids, loading, speed } = useOrderBook({ symbol });

  let [lastAsks, higherAskVol, higherAsk] = React.useMemo(() => {
    let lastAsks = asks
      .sort(([price1], [price2]) => price1 - price2)
      .slice(0, 10)
      .reverse();
    const higherAskVol = lastAsks.reduce((max, order) => {
      const vol = parseFloat(order[1][0]);
      if (vol > max) {
        return vol;
      }
      return max;
    }, 0);

    const higherAsk = lastAsks[9];
    return [lastAsks, higherAskVol, higherAsk];
  }, [asks]);

  const [lastBids, higherBidVol, higherBid] = React.useMemo(() => {
    const lastBids = bids
      .sort(([price1], [price2]) => price2 - price1)
      .slice(0, 10);

    const higherBidVol = lastBids.reduce((max, order) => {
      const vol = parseFloat(order[1][0]);
      if (vol > max) {
        return vol;
      }
      return max;
    }, 0);

    const higherBid = lastBids[0];
    return [lastBids, higherBidVol, higherBid];
  }, [bids]);

  const midPrice = (parseFloat(higherAsk) + parseFloat(higherBid)) * 0.5;
  const spread = (parseFloat(higherAsk) - parseFloat(higherBid)) / midPrice;

  return (
    <section
      className="font-mono flex flex-col mx-1 h-full rounded-sm flex-shrink-0"
      style={{
        background: "#15202b"
      }}
    >
      <header
        className="py-1 px-2"
        style={{ borderBottom: "2px solid #10171e" }}
      >
        <h3>{symbol}</h3>
      </header>
      <div className="overflow-y-auto flex-grow">
        <table className="my-2 w-full text-xs">
          <thead>
            <tr>
              <td className="w-12"></td>
              <td className="w-24 pl-2 text-right">Price</td>
              <td className="w-32 pr-2 text-right">Volumen</td>
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

        {!loading && (
          <div className="p-2 text-center">
            <span className="text-lg">{midPrice.toPrecision(8) || "-"} </span>
            <br />
            <span className="text-sm">
              (Spread: {spread ? (spread * 100).toFixed(3) : "-"}%)
            </span>
          </div>
        )}
        <table className="text-xs w-full">
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
      <div className="flex justify-between p-2">
        <div className="text-xs">Online</div>
        <div className="text-xs">
          Speed: {speed ? speed.toFixed(2) : "-"}/min
        </div>
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
        className={classNames("w-24 pl-2 text-right", {
          "text-green-400": side === "bids",
          "text-red-600": side === "asks"
        })}
      >
        {order[0]}
      </td>
      <td className="w-32 pr-2 text-right">{order[1][0]}</td>
    </tr>
  );
});

export default React.memo(OrderBook);

function useOrderBook({ symbol }) {
  const [loading, setLoading] = React.useState(true);
  const [speed, setSpeed] = React.useState();
  const [asks, setAsks] = React.useState([]);
  const [bids, setBids] = React.useState([]);
  const [lastPos, setLastPos] = React.useState();

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
    const connection = io(process.env.API_URL, {
      forceNew: false,
      transports: ["websocket"]
    });

    connection.on(`${symbol}:book_snapshot`, onSnapshot);
    connection.on(`${symbol}:book_update`, onUpdate);
    connection.on(`${symbol}:speed_update`, onSpeedUpdate);
    connection.emit("subscribe", { symbol: symbol });
    connection.on("disconnect", onDisconnect);

    return () => {
      connection.off(`${symbol}:book_snapshot`, onSnapshot);
      connection.off(`${symbol}:book_update`, onUpdate);
      connection.off(`${symbol}:speed_update`, onSpeedUpdate);
      connection.off("disconnect", onDisconnect);
    };

    function onUpdate({ pos, asks, bids }) {
      if (!lastPos || (lastPos && pos === nextPos(lastPos))) {
        setLastPos(pos);
        if (asks) {
          updateOrders(asks, setAsks);
        }
        if (bids) {
          updateOrders(bids, setBids);
        }
      } else {
        // if the order is not correct
        // it means that we lost an update
        // so we should try to get a snapshot
      }
    }

    function onSnapshot(snapshot) {
      console.log("snapshot received");
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
    }

    function onSpeedUpdate(data) {
      setSpeed(data);
    }

    function onDisconnect() {
      console.log("disconnected");
    }
  }, []);

  return { loading, speed, bids, asks };
}

// this should be shared between server and client
const RANGE = 10;

function nextPos(lastPos) {
  return (lastPos + 1) % RANGE;
}
