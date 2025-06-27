import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
// Chessground CSS (Official Lichess)
import "./styles/chessground-base.css";
import "./styles/chessground-theme.css";
import "./styles/cburnett-pieces.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
