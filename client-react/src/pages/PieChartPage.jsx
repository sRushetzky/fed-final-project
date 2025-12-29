// PieChartPage.jsx
// Responsible for rendering a monthly pie chart (by category) in a selected currency

// React hooks for state, side effects, and request-cancellation pattern
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

// Recharts components for pie chart rendering
import {
    PieChart,
    Pie,
    Tooltip,
    Legend,
    Cell,
    ResponsiveContainer
} from "recharts";

// IndexedDB API wrapper (our project DB layer)
import { openCostsDB } from "../lib/idb";

// Supported currencies for the project
const currencies = ["USD", "ILS", "GBP", "EURO"];

// Pie slice colors (cycled if there are more categories than colors)
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

// Formats numbers as "123.45 USD" (used for labels + tooltip)
function formatMoney(value, currency) {
    const num = Number(value);

    // If value is not a number, return it as-is with currency suffix
    if (Number.isNaN(num)) {
        return `${value} ${currency}`;
    }

    // Always format to 2 decimals for financial display
    return `${num.toFixed(2)} ${currency}`;
}

// PieChartPage component – displays totals per category for a selected month/year/currency
export default function PieChartPage() {
    // Use current date as default selections
    const now = new Date();

    // Holds the opened DB API object (getPieChartData, etc.)
    const [db, setDb] = useState(null);

    // Controlled inputs for year, month, and currency selection
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [currency, setCurrency] = useState("USD");

    // Data shown in the pie (entries: { name: category, value: sum })
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

    // Loads pie chart data for a given year + month + currency
    async function loadPie(selectedYear, selectedMonth, selectedCurrency) {
        // Do nothing until DB is ready
        if (!db) {
            return;
        }

        // Increase request id to invalidate any previous pending request
        const myReqId = ++reqIdRef.current;

        // Clear previous status message
        setStatus({ type: "", msg: "" });

        try {
            // Request pie data from DB layer (already converted to selected currency)
            const res = await db.getPieChartData(
                Number(selectedYear),
                Number(selectedMonth),
                selectedCurrency
            );

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

    // Auto-refresh the chart whenever DB/year/month/currency changes (like clicking "Show")
    useEffect(() => {
        // Wait until DB is ready
        if (!db) {
            return;
        }

        // Load chart data based on current selections
        loadPie(year, month, currency);

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db, year, month, currency]);

    return (
        // Page container with top margin
        <Container sx={{ mt: 4 }}>
            {/* Paper provides a card-like surface for the chart and controls */}
            <Paper sx={{ p: 3 }}>
                {/* Page title */}
                <Typography variant="h5" sx={{ mb: 2 }}>
                    Pie Chart by Category
                </Typography>

                {/* Show error only when a message exists */}
                {status.msg && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {status.msg}
                    </Alert>
                )}

                {/* Controls row: year, month, currency, and optional manual refresh */}
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

                    {/* Optional "Show" button (manual refresh) */}
                    <Button
                        variant="contained"
                        onClick={() => loadPie(year, month, currency)}
                        disabled={!db}
                    >
                        Show
                    </Button>
                </Stack>

                {/* If there is no data, show a simple message instead of an empty chart */}
                {data.length === 0 ? (
                    <Typography>No data for this month.</Typography>
                ) : (
                    <div style={{ width: "100%", height: 380 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                {/* Pie chart by category (value is already in selected currency) */}
                                <Pie
                                    data={data}
                                    dataKey="value"
                                    nameKey="name"
                                    outerRadius={125}
                                    labelLine={false}
                                    // Show the money value directly on each slice
                                    label={({ value }) => formatMoney(value, currency)}
                                >
                                    {/* Color each slice */}
                                    {data.map((_, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                    ))}
                                </Pie>

                                {/* Tooltip shows formatted value on hover */}
                                <Tooltip formatter={(value) => formatMoney(value, currency)} />

                                {/* Legend shows category names colored like their slices */}
                                <Legend
                                    layout="vertical"
                                    align="right"
                                    verticalAlign="middle"
                                    formatter={(name, entry) => (
                                        <span style={{ color: entry.color }}>{name}</span>
                                    )}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </Paper>
        </Container>
    );
}
