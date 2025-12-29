// ReportPage.jsx
// Responsible for fetching and displaying a detailed monthly report (list of costs + total)

// React hooks for component state and side effects
import { useEffect, useState } from "react";

// Material UI components for layout and UI elements
import {
    Container,
    Paper,
    Stack,
    TextField,
    MenuItem,
    Button,
    Typography,
    Alert,
    Divider
} from "@mui/material";

// IndexedDB API wrapper (our project DB layer)
import { openCostsDB } from "../lib/idb";

// Supported currencies for the project
const currencies = ["USD", "ILS", "GBP", "EURO"];

// ReportPage component – displays a monthly report in a selected currency
export default function ReportPage() {
    // Holds the opened DB API object (getReport, etc.)
    const [db, setDb] = useState(null);

    // Status message shown to the user (success / error)
    const [status, setStatus] = useState({ type: "", msg: "" });

    // Use current date as default year/month selections
    const now = new Date();

    // Controlled inputs for year/month/currency
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [currency, setCurrency] = useState("USD");

    // Holds the loaded report object (null until "Get Report" is clicked)
    const [report, setReport] = useState(null);

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

    // Fetch report from DB layer based on current input values
    async function handleGetReport() {
        // Clear previous status and previous report
        setStatus({ type: "", msg: "" });
        setReport(null);

        // Ensure DB is ready before requesting the report
        if (!db) {
            setStatus({ type: "error", msg: "DB not ready yet." });
            return;
        }

        try {
            // Request the report in the selected currency
            const r = await db.getReport(Number(year), Number(month), currency);

            // Save the report into state so UI can render it
            setReport(r);

            // Notify success
            setStatus({ type: "success", msg: "Report loaded." });
        } catch (e) {
            // Show any DB error to the user
            setStatus({ type: "error", msg: e.message });
        }
    }

    return (
        // Page container with top margin
        <Container sx={{ mt: 4 }}>
            {/* Paper provides a card-like surface for controls + report */}
            <Paper sx={{ p: 3 }}>
                {/* Page title */}
                <Typography variant="h5" sx={{ mb: 2 }}>
                    Monthly Report
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

                {/* Controls row: year, month, currency, and fetch button */}
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    sx={{ mb: 2 }}
                >
                    {/* Year input */}
                    <TextField
                        label="Year"
                        type="number"
                        value={year}
                        onChange={(event) => setYear(event.target.value)}
                        fullWidth
                    />

                    {/* Month input (1..12) */}
                    <TextField
                        label="Month"
                        type="number"
                        value={month}
                        onChange={(event) => setMonth(event.target.value)}
                        inputProps={{ min: 1, max: 12 }}
                        fullWidth
                    />

                    {/* Currency dropdown (supported currencies only) */}
                    <TextField
                        select
                        label="Currency"
                        value={currency}
                        onChange={(event) => setCurrency(event.target.value)}
                        fullWidth
                    >
                        {currencies.map((cur) => (
                            <MenuItem key={cur} value={cur}>
                                {cur}
                            </MenuItem>
                        ))}
                    </TextField>

                    {/* Manual fetch button */}
                    <Button variant="contained" onClick={handleGetReport} disabled={!db}>
                        Get Report
                    </Button>
                </Stack>

                {/* Visual separator between controls and report results */}
                <Divider sx={{ my: 2 }} />

                {/* Render report only after it was loaded */}
                {report ? (
                    <div>
                        {/* Report total (already in selected currency) */}
                        <Typography variant="subtitle1" sx={{ mb: 1 }}>
                            Total: {report.total.total.toFixed(2)} {report.total.currency}
                        </Typography>

                        {/* List of costs for this month */}
                        <Stack spacing={1}>
                            {report.costs.length === 0 ? (
                                <Typography>No costs found for this month.</Typography>
                            ) : (
                                report.costs.map((costItem, idx) => (
                                    // One “card” per cost item
                                    <Paper key={idx} variant="outlined" sx={{ p: 1.5 }}>
                                        {/* Main line: category + description */}
                                        <Typography>
                                            <b>{costItem.category}</b> — {costItem.description}
                                        </Typography>

                                        {/* Secondary line: sum + currency + day */}
                                        <Typography variant="body2">
                                            {costItem.sum} {costItem.currency} | Day:{" "}
                                            {costItem.Date?.day ?? "?"}
                                        </Typography>
                                    </Paper>
                                ))
                            )}
                        </Stack>
                    </div>
                ) : null}
            </Paper>
        </Container>
    );
}
