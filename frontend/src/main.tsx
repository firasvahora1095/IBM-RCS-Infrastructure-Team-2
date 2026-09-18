import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// Order matters: Carbon first, then Tailwind utilities, so a Tailwind class
// only wins where we explicitly add one.
import "./index.scss";
import "./tailwind.css";

// createRoot is the React 18+ way to mount an app. The `!` tells TypeScript
// "#root definitely exists" because it's hard-coded in index.html.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
