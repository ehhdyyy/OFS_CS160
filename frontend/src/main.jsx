import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";
import 'leaflet/dist/leaflet.css';

window.GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
window.__GOOGLE_MAPS_API_KEY__ = window.GOOGLE_MAPS_API_KEY;
window.__OFS_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);