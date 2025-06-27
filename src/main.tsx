import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
// Chessground CSS (Official Lichess)
import "./styles/chessground-base.css";
import "./styles/cburnett-pieces.css";
// Debug CSS rimosso per produzione

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
