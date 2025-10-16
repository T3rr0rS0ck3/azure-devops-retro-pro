import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import * as SDK from "azure-devops-extension-sdk";

(async () => {
    const isInIframe = window.self !== window.top;
    if (isInIframe) {
        try {
            console.log("🔄 Initializing Azure DevOps SDK...");
            SDK.init();
            await SDK.ready();
            console.log("✅ Azure DevOps SDK initialized and ready");
        } catch (err) {
            console.error("❌ SDK initialization failed:", err);
        }
    } else {
        console.log("💻 Running locally (no Azure DevOps SDK context)");
    }
    ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
})();
