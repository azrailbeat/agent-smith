import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Ensure API key is available if needed
const apiKey = import.meta.env.VITE_OPENAI_API_KEY || "";
if (!apiKey && import.meta.env.MODE === 'development') {
  console.warn("Warning: OPENAI_API_KEY environment variable is not set. Some AI features may not work.");
}

createRoot(document.getElementById("root")!).render(<App />);
