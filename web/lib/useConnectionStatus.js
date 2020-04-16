import React from "react";
import io from "socket.io-client";

export function useConnectionStatus() {
  const [status, setStatus] = React.useState({
    connected: false,
    error: null,
  });

  React.useEffect(() => {
    const socket = io(process.env.API_URL, {
      forceNew: false,
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      setStatus({
        connected: true,
        erorr: null,
      });
    });

    socket.on("disconnect", (reason) => {
      setStatus({
        connected: false,
        error: reason,
      });
    });

    socket.on("connect_error", (error) => {
      setStatus({
        connected: false,
        error: error.message,
      });
    });

    return () => {
      socket.close();
    };
  }, []);

  return { status };
}
