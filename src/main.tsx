import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const container = document.getElementById("root");
if (!container) throw new Error("The landing page needs an element with the id 'root'.");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
