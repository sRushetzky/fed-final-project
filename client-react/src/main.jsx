// main.jsx
// Application entry point – mounts the React app into the DOM

// React core library (required for JSX and StrictMode)
import React from "react";

// ReactDOM client for creating the root and rendering the app
import ReactDOM from "react-dom/client";

// Root application component
import App from "./App.jsx";

// Create a React root and render the application
ReactDOM.createRoot(
    // Get the root DOM element defined in index.html
    document.getElementById("root")
).render(
    // StrictMode helps detect potential problems during development
    <React.StrictMode>
        {/* Render the main App component */}
        <App />
    </React.StrictMode>
);
