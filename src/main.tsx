import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import WebcamOverlay from "./WebcamOverlay";

const path = window.location.pathname;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {path === '/webcam' ? <WebcamOverlay /> :
      path === '/controls' ? <App mode="controls" /> :
        <App mode="overlay" />}
  </React.StrictMode>,
);
