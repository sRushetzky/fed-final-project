// server.js
// Simple Express server used to serve the exchange rates JSON file

// Import Express framework for creating the HTTP server
import express from "express";

// Import CORS middleware to allow cross-origin requests
import cors from "cors";

// Import path utilities for resolving file paths
import path from "path";

// Import helper to convert ES module URL to file path
import { fileURLToPath } from "url";

// Create an Express application instance
const app = express();

// Enable CORS for all origins (required so the React client can fetch rates.json)
app.use(
    cors({
        origin: "*",
    })
);

// Resolve __filename and __dirname equivalents (required in ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve the exchange rates JSON file at /rates.json
app.get("/rates.json", (req, res) => {
    // Send the rates.json file from the current directory
    res.sendFile(path.join(__dirname, "rates.json"));
});

// Use PORT from environment variables (Render/Heroku) or fallback to 3000
const port = process.env.PORT || 3000;

// Start the HTTP server
app.listen(port);
