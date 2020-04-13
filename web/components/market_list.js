import React from "react";
import SearchIcon from "./icons/search_icon";

export default function MarketList({ onSelect, excludedMarkets }) {
  const [query, setQuery] = React.useState("");
  const [assetPairs, setAssetPairs] = React.useState([]);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    fetch(`${process.env.API_URL}/asset_pairs`)
      .then(res => res.json())
      .then(data => {
        setAssetPairs(Object.values(data));
      });
  }, []);

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div
      className="w-56 h-screen px-2 flex flex-col"
      style={{ backgroundColor: "#3d5466" }}
    >
      <div className="py-2 text-white">
        <h3>Select market</h3>
      </div>
      <div
        className="relative flex items-center h-8 px-2 rounded"
        style={{ border: "1px solid #000", backgroundColor: "#10171e" }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={evt => setQuery(evt.target.value.trim())}
          className="bg-transparent h-full outline-none text-white"
          placeholder="Search..."
        />
        <SearchIcon className="w-4 h-4 absolute right-0 mr-4 text-white" />
      </div>
      <div className="overflow-y-auto h-full my-4">
        <ul className="text-white ">
          {assetPairs
            .filter(isNotExcluded)
            .filter(market => market.altname.includes(query.toUpperCase()))
            .map(pair => {
              return (
                <li
                  key={pair.altname}
                  className="p-2 cursor-pointer my-1 hover:bg-blue-900"
                  style={{
                    background: "#15202b"
                  }}
                  onClick={() => onSelect(pair)}
                >
                  <div>{pair.altname}</div>
                  <div className="text-sm opacity-50">{pair.wsname}</div>
                </li>
              );
            })}
        </ul>
      </div>
    </div>
  );

  function isNotExcluded(market) {
    return !excludedMarkets.find(
      excludedMarket => excludedMarket.altname === market.altname
    );
  }
}
