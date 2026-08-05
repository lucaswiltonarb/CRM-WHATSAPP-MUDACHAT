import React from "react";
import ReactDOM from "react-dom/client";
import "@tabler/icons-webfont/dist/tabler-icons.min.css";
import "reactflow/dist/style.css";
import "./styles/alina-theme.css";
import "./styles/app.css";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
