import React from "react";
import io from "socket.io-client";
import { useIsMounted } from "../lib/useIsMounted";
import debug from "debug";

const log = debug("orderbook");

export function useOrderBook({ symbol }) {
  const isMounted = useIsMounted();
  const connectionRef = React.useRef(null);
  const [loading, setLoading] = React.useState(true);
  const [speed, setSpeed] = React.useState();
  const [asks, setAsks] = React.useState([]);
  const [bids, setBids] = React.useState([]);
  const lastPos = React.useRef();

  const refresh = React.useCallback(() => {
    if (connectionRef.current) {
      connectionRef.current.close();
    }
    setLoading(true);
  }, []);

  function updateOrders(orderUpdates, setOrders) {
    setOrders((orders) => {
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
    if (loading) {
      connectionRef.current = io(process.env.API_URL, {
        forceNew: false,
        transports: ["websocket"],
      });

      connectionRef.current.on(`${symbol}:book_snapshot`, onSnapshot);
      connectionRef.current.on(`${symbol}:book_update`, onUpdate);
      connectionRef.current.on(`${symbol}:speed_update`, onSpeedUpdate);
      connectionRef.current.emit("subscribe", { symbol: symbol });
      connectionRef.current.on("disconnect", onDisconnect);
    }

    function onUpdate({ pos, asks, bids }) {
      log(`got update with pos ${pos}`);
      if (!isMounted.current) {
        return;
      }
      if (loading) {
        if (
          !lastPos.current ||
          (lastPos.current && pos === nextPos(lastPos.current))
        ) {
          lastPos.current = pos;
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
          log("got an invalid update", pos, lastPos);
          // force reconnection
          refresh();
        }
      }
    }

    function onSnapshot(snapshot) {
      if (!isMounted.current) {
        return;
      }
      log("snapshot received");
      setAsks(
        snapshot.asks.map(([price, vol, timestamp]) => [
          price,
          [vol, timestamp],
        ])
      );
      setBids(
        snapshot.bids.map(([price, vol, timestamp]) => [
          price,
          [vol, timestamp],
        ])
      );
      setLoading(false);
      lastPos.current = snapshot.pos;
    }

    function onSpeedUpdate(data) {
      if (!isMounted.current) {
        return;
      }
      setSpeed(data);
    }

    function onDisconnect() {
      log("disconnected");
    }
  }, [loading]);

  return { loading, speed, bids, asks, refresh };
}

// this should be shared between server and client
const RANGE = 100;

function nextPos(lastPos) {
  return (lastPos + 1) % RANGE;
}
