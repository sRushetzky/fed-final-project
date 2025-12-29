// AddCostPage.jsx
// Responsible for rendering the "Add Cost" form and saving a new cost item into IndexedDB

// React hooks for managing component state and side effects
import { useEffect, useState } from "react";

// Material UI components for layout and form UI
import {
    Container,
    Paper,
    Stack,
    TextField,
    MenuItem,
    Button,
    Typography,
    Alert
} from "@mui/material";

// IndexedDB API wrapper (our project DB layer)
import { openCostsDB } from "../lib/idb";

// AddCostPage component – allows the user to create a new cost item
export default function AddCostPage() {
    // Holds the opened DB API object (addCost, getReport, etc.)
    const [db, setDb] = useState(null);

    // Controlled inputs for the form fields
    const [sum, setSum] = useState("");
    const [currency, setCurrency] = useState("USD");
    const [category, setCategory] = useState("FOOD");
    const [description, setDescription] = useState("");

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

    // Handle form submit (validate inputs, then call db.addCost)
    async function handleSubmit(e) {
        // Prevent the browser from reloading the page on submit
        e.preventDefault();

        // Clear previous status message
        setStatus({ type: "", msg: "" });

        // Ensure DB is ready before trying to add a cost
        if (!db) {
            setStatus({ type: "error", msg: "DB not ready yet." });
            return;
        }

        // Convert the sum input from string to number
        const numSum = Number(sum);

        // Validate that sum is a positive number
        if (!Number.isFinite(numSum) || numSum <= 0) {
            setStatus({ type: "error", msg: "Sum must be a positive number." });
            return;
        }

        try {
            // Save the cost item into IndexedDB (date fields are added in idb.js)
            await db.addCost({
                sum: numSum,
                currency,
                category,
                description
            });

            // Notify the user that the cost was saved successfully
            setStatus({ type: "success", msg: "Cost item added successfully." });

            // Clear only the fields we want to reset after submit
            setSum("");
            setDescription("");
        } catch (e2) {
            // Show any DB error to the user
            setStatus({ type: "error", msg: e2.message });
        }
    }

    return (
        // Page container with top margin
        <Container sx={{ mt: 4 }}>
            {/* Paper provides a card-like surface for the form */}
            <Paper sx={{ p: 3 }}>
                {/* Page title */}
                <Typography variant="h5" sx={{ mb: 2 }}>
                    Add Cost
                </Typography>

                {/* Show success/error status message only when there's a message */}
                {status.msg ? (
                    <Alert
                        severity={status.type === "error" ? "error" : "success"}
                        sx={{ mb: 2 }}
                    >
                        {status.msg}
                    </Alert>
                ) : null}

                {/* HTML form element so Enter key triggers submit */}
                <form onSubmit={handleSubmit}>
                    {/* Stack lays out fields vertically with consistent spacing */}
                    <Stack spacing={2}>
                        {/* Sum input (numeric) */}
                        <TextField
                            label="Sum"
                            value={sum}
                            onChange={(event) => setSum(event.target.value)}
                            type="number"
                            inputProps={{ step: "0.01" }}
                            required
                        />

                        {/* Currency select (supported currencies for the project) */}
                        <TextField
                            select
                            label="Currency"
                            value={currency}
                            onChange={(event) => setCurrency(event.target.value)}
                        >
                            {["USD", "ILS", "GBP", "EURO"].map((cur) => (
                                <MenuItem key={cur} value={cur}>
                                    {cur}
                                </MenuItem>
                            ))}
                        </TextField>

                        {/* Category input (can be free text or aligned to your categories list) */}
                        <TextField
                            label="Category"
                            value={category}
                            onChange={(event) => setCategory(event.target.value)}
                            required
                        />

                        {/* Description input */}
                        <TextField
                            label="Description"
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            required
                        />

                        {/* Submit button (disabled while DB is not ready) */}
                        <Button type="submit" variant="contained" disabled={!db}>
                            Add
                        </Button>
                    </Stack>
                </form>
            </Paper>
        </Container>
    );
}
