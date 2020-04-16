import React from "react";
import OrderBook from "../components/order_book";
import MarketList from "../components/market_list";
import { useConnectionStatus } from "../lib/useConnectionStatus";

export default function IndexPage() {
  const [markets, setMarkets] = React.useState([]);
  const [showMarkerSelector, setShowMarketSelector] = React.useState(false);
  const { status } = useConnectionStatus();

  return (
    <div className="flex flex-col h-screen">
      <div className="flex flex-grow">
        <header className="flex" style={{ backgroundColor: "#1c2938" }}>
          <nav className="flex flex-col items-center mt-4 w-16">
            <button
              onClick={() => setShowMarketSelector(!showMarkerSelector)}
              className={
                !status.connected ? "opacity-25 cursor-not-allowed" : ""
              }
              style={{
                backgroundColor: showMarkerSelector ? "#3d5466" : undefined,
              }}
              disabled={!status.connected}
            >
              <AddIcon className="w-10 h-10 text-white" />
            </button>
          </nav>
          {showMarkerSelector && (
            <MarketList excludedMarkets={markets} onSelect={handleAddMarket} />
          )}
        </header>
        <div
          className="text-white flex w-full overflow-x-auto p-2"
          style={{ background: "#10171e" }}
        >
          {markets.map((market, idx) => {
            return (
              <OrderBook key={`${market.wsname}`} symbol={market.wsname} />
            );
          })}
        </div>
      </div>
      <StatusBar status={status} />
    </div>
  );

  function handleAddMarket(market) {
    setMarkets((markets) => [market].concat(markets));
    setShowMarketSelector(false);
  }
}

function StatusBar({ status }) {
  return (
    <div className="h-6 bg-blue-500 flex items-center px-2">
      {!status.connected && !status.error && (
        <div className="text-white text-xs">Connecting...</div>
      )}
      {status.connected && <div className="text-white text-xs">Connected</div>}
      {status.error && (
        <div className="text-xs" style={{ color: "#9D0000" }}>
          Connection failed ({status.error})
        </div>
      )}
    </div>
  );
}

function AddIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      className={className}
    >
      <path
        fill="currentColor"
        d="M17 11a1 1 0 0 1 0 2h-4v4a1 1 0 0 1-2 0v-4H7a1 1 0 0 1 0-2h4V7a1 1 0 0 1 2 0v4h4z"
      />
    </svg>
  );
}
