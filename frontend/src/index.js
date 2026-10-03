import React from "react";
import ReactDOM from "react-dom/client";
import "@tabler/icons-webfont/dist/tabler-icons.min.css";
import "reactflow/dist/style.css";
import "./styles/lf.css";
import { watchChartTheme } from "./lib/chartDefaults";
import App from "./App";

watchChartTheme();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
