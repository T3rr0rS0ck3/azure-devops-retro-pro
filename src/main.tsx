import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

(async () => {
    const SDK = (window as any).VSS || (window as any).SDK;
    SDK.init({ loaded: false });
    await SDK.ready();
    SDK.notifyLoadSucceeded();

    ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
})();
