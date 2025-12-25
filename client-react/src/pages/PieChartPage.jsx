import { useEffect, useRef, useState } from "react";
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

import {
    PieChart,
    Pie,
    Tooltip,
    Legend,
    Cell,
    ResponsiveContainer
} from "recharts";

import { openCostsDB } from "../lib/idb";

const currencies = ["USD", "ILS", "GBP", "EURO"];

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

function formatMoney(v, currency) {
    const num = Number(v);
    if (Number.isNaN(num)) return `${v} ${currency}`;
    return `${num.toFixed(2)} ${currency}`;
}

export default function PieChartPage() {
    const now = new Date();

    const [db, setDb] = useState(null);
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [currency, setCurrency] = useState("USD");

    const [data, setData] = useState([]);
    const [status, setStatus] = useState({ type: "", msg: "" });

    const reqIdRef = useRef(0);

    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                const opened = await openCostsDB("costsdb", 1);
                if (alive) setDb(opened);
            } catch (e) {
                if (alive) setStatus({ type: "error", msg: e.message });
            }
        })();

        return () => {
            alive = false;
        };
    }, []);

    async function loadPie(y, m, cur) {
        if (!db) return;

        const myReqId = ++reqIdRef.current;
        setStatus({ type: "", msg: "" });

        try {
            const res = await db.getPieChartData(Number(y), Number(m), cur);

            // avoid race condition: only keep latest request result
            if (myReqId !== reqIdRef.current) return;

            setData(res || []);
        } catch (e) {
            if (myReqId !== reqIdRef.current) return;
            setData([]);
            setStatus({ type: "error", msg: e.message });
        }
    }

    // ✅ auto-refresh on change
    useEffect(() => {
        if (!db) return;
        loadPie(year, month, currency);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db, year, month, currency]);

    return (
        <Container sx={{ mt: 4 }}>
            <Paper sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ mb: 2 }}>
                    Pie Chart by Category
                </Typography>

                {status.msg && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {status.msg}
                    </Alert>
                )}

                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    sx={{ mb: 2 }}
                >
                    <TextField
                        label="Year"
                        type="number"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        fullWidth
                    />

                    <TextField
                        label="Month"
                        type="number"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        inputProps={{ min: 1, max: 12 }}
                        fullWidth
                    />

                    <TextField
                        select
                        label="Currency"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        fullWidth
                    >
                        {currencies.map((c) => (
                            <MenuItem key={c} value={c}>
                                {c}
                            </MenuItem>
                        ))}
                    </TextField>

                    {/* אפשר להשאיר את Show, הוא פשוט "ריענון ידני" */}
                    <Button
                        variant="contained"
                        onClick={() => loadPie(year, month, currency)}
                        disabled={!db}
                    >
                        Show
                    </Button>
                </Stack>

                {data.length === 0 ? (
                    <Typography>No data for this month.</Typography>
                ) : (
                    <div style={{ width: "100%", height: 380 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={data}
                                    dataKey="value"
                                    nameKey="name"
                                    outerRadius={125}
                                    labelLine={false}
                                    label={({ value }) => formatMoney(value, currency)}
                                >
                                    {data.map((_, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                    ))}
                                </Pie>

                                <Tooltip formatter={(value) => formatMoney(value, currency)} />

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
