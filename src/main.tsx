import React from "react";
import ReactDOM from "react-dom/client";
import { EditorApp } from "./editor/EditorApp";

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <EditorApp />
    </React.StrictMode>
  );
}
