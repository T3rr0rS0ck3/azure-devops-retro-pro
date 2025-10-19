import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const SDK = (window as any).VSS || (window as any).SDK;

(async () => {
  const inDevOps = window.self !== window.top && !!SDK;
  if (inDevOps) {
    try {
      SDK.init({ loaded: false });
      await SDK.ready();
      SDK.notifyLoadSucceeded();
      console.log("✅ Azure DevOps SDK ready", SDK.getExtensionContext());
    } catch (err) {
      console.error("❌ SDK initialization failed:", err);
    }
  } else {
    console.warn("⚠️ Running outside Azure DevOps (local dev mode)");
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
})();
