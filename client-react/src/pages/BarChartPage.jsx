// BarChartPage.jsx
// Responsible for rendering a yearly bar chart (12 months) with totals in a selected currency

// React hooks for component state, side effects, and request-cancellation pattern
import { useEffect, useRef, useState } from "react";

// Material UI components for layout and form controls
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

// Recharts components for bar chart rendering
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    Cell,
    ResponsiveContainer,
    CartesianGrid,
    LabelList
} from "recharts";

// IndexedDB API wrapper (our project DB layer)
import { openCostsDB } from "../lib/idb";

// Supported currencies for the project (as required)
const currencies = ["USD", "ILS", "GBP", "EURO"];

// Month labels for X axis tick formatting
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// One color per month (cycled if needed)
const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#A78BFA",
    "#F472B6",
    "#34D399",
    "#F87171",
    "#60A5FA",
    "#F59E0B",
    "#10B981",
    "#EF4444"
];

// Formats numbers as "123.45 USD" (used for tooltip + labels)
function formatMoney(value, currency) {
    const num = Number(value);

    // If value is not a number, return it as-is with currency suffix
    if (Number.isNaN(num)) {
        return `${value} ${currency}`;
    }

    // Always format to 2 decimals for financial display
    return `${num.toFixed(2)} ${currency}`;
}

// BarChartPage component – displays totals per month for a selected year and currency
export default function BarChartPage() {
    // Use current year as the default input
    const now = new Date();

    // Holds the opened DB API object (getBarChartData, etc.)
    const [db, setDb] = useState(null);

    // Controlled inputs for year and currency selection
    const [year, setYear] = useState(now.getFullYear());
    const [currency, setCurrency] = useState("USD");

    // Data shown in the chart (12 items: month + total)
    const [data, setData] = useState([]);

    // Status message shown to the user (error only here)
    const [status, setStatus] = useState({ type: "", msg: "" });

    // Request id guard – prevents “old responses” from overriding new state
    const reqIdRef = useRef(0);

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

    // Loads bar chart data for a given year + currency
    async function loadBar(selectedYear, selectedCurrency) {
        // Do nothing until DB is ready
        if (!db) {
            return;
        }

        // Increase request id to invalidate any previous pending request
        const myReqId = ++reqIdRef.current;

        // Clear previous status message
        setStatus({ type: "", msg: "" });

        try {
            // Request chart data from DB layer (single scan + single rates fetch)
            const res = await db.getBarChartData(Number(selectedYear), selectedCurrency);

            // If a newer request was made, ignore this response
            if (myReqId !== reqIdRef.current) {
                return;
            }

            // Update chart data (fallback to [] if null/undefined)
            setData(res || []);
        } catch (e) {
            // If a newer request was made, ignore this error
            if (myReqId !== reqIdRef.current) {
                return;
            }

            // Reset data and show error message
            setData([]);
            setStatus({ type: "error", msg: e.message });
        }
    }

    // Auto-refresh the chart whenever DB/year/currency changes (like clicking "Show")
    useEffect(() => {
        // Wait until DB is ready
        if (!db) {
            return;
        }

        // Load chart data based on current selections
        loadBar(year, currency);

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db, year, currency]);

    return (
        // Page container with top margin
        <Container sx={{ mt: 4 }}>
            {/* Paper provides a card-like surface for the chart and controls */}
            <Paper sx={{ p: 3 }}>
                {/* Page title */}
                <Typography variant="h5" sx={{ mb: 2 }}>
                    Bar Chart by Month
                </Typography>

                {/* Show error only when a message exists */}
                {status.msg && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {status.msg}
                    </Alert>
                )}

                {/* Controls row: year, currency, and optional manual refresh */}
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

                    {/* Optional "Show" button (manual refresh) */}
                    <Button
                        variant="contained"
                        onClick={() => loadBar(year, currency)}
                        disabled={!db}
                    >
                        Show
                    </Button>
                </Stack>

                {/* Chart container with fixed height */}
                <div style={{ width: "100%", height: 380 }}>
                    <ResponsiveContainer>
                        {/* Bar chart that shows 12 months totals */}
                        <BarChart
                            data={data}
                            margin={{ top: 28, right: 20, left: 10, bottom: 5 }}
                        >
                            {/* Background grid for readability */}
                            <CartesianGrid strokeDasharray="3 3" />

                            {/* X axis shows month numbers but formatted into month names */}
                            <XAxis
                                dataKey="month"
                                tickFormatter={(m) => MONTHS[Number(m) - 1] || m}
                            />

                            {/* Y axis shows totals (rounded for display) */}
                            <YAxis tickFormatter={(v) => Number(v).toFixed(0)} />

                            {/* Tooltip shows month name + formatted money */}
                            <Tooltip
                                labelFormatter={(m) => MONTHS[Number(m) - 1] || m}
                                formatter={(value) => formatMoney(value, currency)}
                            />

                            {/* Legend is useful if you later add multiple series */}
                            <Legend />

                            {/* Single series: monthly total */}
                            <Bar dataKey="total">
                                {/* Color each bar (month) with a different color */}
                                {data.map((_, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                    />
                                ))}

                                {/* Show the numeric value above each bar */}
                                <LabelList
                                    dataKey="total"
                                    position="top"
                                    formatter={(v) => formatMoney(v, currency)}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Paper>
        </Container>
    );
}
