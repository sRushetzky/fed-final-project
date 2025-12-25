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

import { openCostsDB } from "../lib/idb";

const currencies = ["USD", "ILS", "GBP", "EURO"];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

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

export default function BarChartPage() {
    const now = new Date();

    const [db, setDb] = useState(null);
    const [year, setYear] = useState(now.getFullYear());
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

    async function loadBar(y, cur) {
        if (!db) return;

        const myReqId = ++reqIdRef.current;
        setStatus({ type: "", msg: "" });

        try {
            const res = await db.getBarChartData(Number(y), cur);

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
        loadBar(year, currency);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db, year, currency]);

    return (
        <Container sx={{ mt: 4 }}>
            <Paper sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ mb: 2 }}>
                    Bar Chart by Month
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

                    {/* עדיין אפשר להשאיר Show */}
                    <Button
                        variant="contained"
                        onClick={() => loadBar(year, currency)}
                        disabled={!db}
                    >
                        Show
                    </Button>
                </Stack>

                <div style={{ width: "100%", height: 380 }}>
                    <ResponsiveContainer>
                        <BarChart
                            data={data}
                            margin={{ top: 28, right: 20, left: 10, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />

                            <XAxis
                                dataKey="month"
                                tickFormatter={(m) => MONTHS[Number(m) - 1] || m}
                            />

                            <YAxis tickFormatter={(v) => Number(v).toFixed(0)} />

                            <Tooltip
                                labelFormatter={(m) => MONTHS[Number(m) - 1] || m}
                                formatter={(value) => formatMoney(value, currency)}
                            />

                            <Legend />

                            <Bar dataKey="total">
                                {data.map((_, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                    />
                                ))}

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
