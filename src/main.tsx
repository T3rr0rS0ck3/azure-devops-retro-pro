import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import * as SDK from "azure-devops-extension-sdk";

(window as any).__AzureSDK = SDK;
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
