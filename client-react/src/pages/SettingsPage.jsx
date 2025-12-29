// SettingsPage.jsx
// Responsible for saving the exchange-rates URL into IndexedDB (settings store)

// React hooks for component state and side effects
import { useEffect, useState } from "react";

// Material UI components for layout and form controls
import {
    Container,
    Paper,
    Stack,
    TextField,
    Button,
    Typography,
    Alert
} from "@mui/material";

// IndexedDB API wrapper (our project DB layer)
import { openCostsDB } from "../lib/idb";

// SettingsPage component – lets the user configure the exchange rates URL
export default function SettingsPage() {
    // Holds the opened DB API object (setRatesUrl, etc.)
    const [db, setDb] = useState(null);

    // Controlled input for the exchange rates URL
    const [ratesUrl, setRatesUrl] = useState("");

    // Status message shown to the user (success / error)
    const [status, setStatus] = useState({ type: "", msg: "" });

    // Open the database once when the component is mounted
    useEffect(() => {
        // "alive" prevents setting state after unmount (avoids React warnings)
        let alive = true;

        // Use an IIFE to allow async/await inside useEffect
        (async () => {
            try {
                // Open (or create/upgrade) IndexedDB
                const opened = await openCostsDB("costsdb", 1);

                // Update state only if the component is still mounted
                if (alive) {
                    setDb(opened);
                }
            } catch (e) {
                // Show an error message if DB failed to open
                if (alive) {
                    setStatus({ type: "error", msg: e.message });
                }
            }
        })();

        // Cleanup runs when the component unmounts
        return () => {
            alive = false;
        };
    }, []);

    // Save the exchange rates URL into IndexedDB settings
    async function handleSave() {
        // Clear previous status message
        setStatus({ type: "", msg: "" });

        // Ensure DB is ready before saving
        if (!db) {
            setStatus({ type: "error", msg: "DB not ready yet." });
            return;
        }

        // Trim whitespace from the input value
        const trimmedUrl = ratesUrl.trim();

        // Validate that the user entered something
        if (!trimmedUrl) {
            setStatus({ type: "error", msg: "Please enter a URL." });
            return;
        }

        try {
            // Save the URL under the "ratesUrl" key (handled by idb.js)
            await db.setRatesUrl(trimmedUrl);

            // Notify success
            setStatus({ type: "success", msg: "Rates URL saved successfully." });
        } catch (e) {
            // Show any DB error to the user
            setStatus({ type: "error", msg: e.message });
        }
    }

    return (
        // Page container with top margin
        <Container sx={{ mt: 4 }}>
            {/* Paper provides a card-like surface for the settings form */}
            <Paper sx={{ p: 3 }}>
                {/* Page title */}
                <Typography variant="h5" sx={{ mb: 2 }}>
                    Settings
                </Typography>

                {/* Show success/error status message only when it exists */}
                {status.msg && (
                    <Alert
                        severity={status.type === "error" ? "error" : "success"}
                        sx={{ mb: 2 }}
                    >
                        {status.msg}
                    </Alert>
                )}

                {/* Settings form controls */}
                <Stack spacing={2}>
                    {/* Input for exchange rates JSON URL */}
                    <TextField
                        label="Exchange Rates URL"
                        placeholder="https://example.com/rates.json"
                        value={ratesUrl}
                        onChange={(event) => setRatesUrl(event.target.value)}
                        fullWidth
                    />

                    {/* Save button (disabled while DB is not ready) */}
                    <Button variant="contained" onClick={handleSave} disabled={!db}>
                        Save
                    </Button>
                </Stack>
            </Paper>
        </Container>
    );
}
