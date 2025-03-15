import React from "react";
import ReactDOM from "react-dom/client"; // Import createRoot
import { BrowserRouter } from "react-router-dom"; // Import BrowserRouter
import App from "./App"; // Import your main app component
import "bootstrap/dist/css/bootstrap.min.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
