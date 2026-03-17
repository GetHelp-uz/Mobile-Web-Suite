import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Inject token into customFetch calls
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  const token = localStorage.getItem('gethelp_token');
  if (token && input.toString().startsWith('/api')) {
    init = init || {};
    init.headers = {
      ...init.headers,
      Authorization: `Bearer ${token}`
    };
  }
  return originalFetch(input, init);
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
