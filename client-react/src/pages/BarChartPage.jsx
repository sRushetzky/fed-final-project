import { useEffect, useState } from "react";
import { Container, Paper, Stack, TextField, MenuItem, Button, Typography, Alert } from "@mui/material";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { openCostsDB } from "../lib/idb";

const currencies = ["USD", "ILS", "GBP", "EURO"];

export default function BarChartPage() {
    const now = new Date();
    const [db, setDb] = useState(null);
    const [year, setYear] = useState(now.getFullYear());
    const [currency, setCurrency] = useState("USD");
    const [data, setData] = useState([]);
    const [status, setStatus] = useState({ type: "", msg: "" });

    useEffect(() => {
        (async () => {
            try {
                const opened = await openCostsDB("costsdb", 1);
                setDb(opened);
            } catch (e) {
                setStatus({ type: "error", msg: e.message });
            }
        })();
    }, []);

    async function load() {
        setStatus({ type: "", msg: "" });
        try {
            const res = await db.getBarChartData(Number(year), currency);
            setData(res);
            setStatus({ type: "success", msg: "Bar chart data loaded." });
        } catch (e) {
            setStatus({ type: "error", msg: e.message });
        }
    }

    return (
        <Container sx={{ mt: 4 }}>
            <Paper sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ mb: 2 }}>Bar Chart by Month</Typography>

                {status.msg && (
                    <Alert severity={status.type === "error" ? "error" : "success"} sx={{ mb: 2 }}>
                        {status.msg}
                    </Alert>
                )}

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
                    <TextField label="Year" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
                    <TextField select label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                        {currencies.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </TextField>
                    <Button variant="contained" onClick={load} disabled={!db}>Show</Button>
                </Stack>

                <BarChart width={640} height={320} data={data}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" />
                </BarChart>
            </Paper>
        </Container>
    );
}
