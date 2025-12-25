import { useEffect, useState } from "react";
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
import { openCostsDB } from "../lib/idb";

const currencies = ["USD", "ILS", "GBP", "EURO"];

export default function ReportPage() {
    const [db, setDb] = useState(null);
    const [status, setStatus] = useState({ type: "", msg: "" });

    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [currency, setCurrency] = useState("USD");

    const [report, setReport] = useState(null);

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

    async function handleGetReport() {
        setStatus({ type: "", msg: "" });
        setReport(null);

        if (!db) {
            setStatus({ type: "error", msg: "DB not ready yet." });
            return;
        }

        try {
            const r = await db.getReport(Number(year), Number(month), currency);
            setReport(r);
            setStatus({ type: "success", msg: "Report loaded." });
        } catch (e) {
            setStatus({ type: "error", msg: e.message });
        }
    }

    return (
        <Container sx={{ mt: 4 }}>
            <Paper sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ mb: 2 }}>
                    Monthly Report
                </Typography>

                {status.msg && (
                    <Alert severity={status.type === "error" ? "error" : "success"} sx={{ mb: 2 }}>
                        {status.msg}
                    </Alert>
                )}

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
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

                    <Button variant="contained" onClick={handleGetReport} disabled={!db}>
                        Get Report
                    </Button>
                </Stack>

                <Divider sx={{ my: 2 }} />

                {report ? (
                    <div>
                        <Typography variant="subtitle1" sx={{ mb: 1 }}>
                            Total: {report.total.total.toFixed(2)} {report.total.currency}
                        </Typography>

                        <Stack spacing={1}>
                            {report.costs.length === 0 ? (
                                <Typography>No costs found for this month.</Typography>
                            ) : (
                                report.costs.map((c, idx) => (
                                    <Paper key={idx} variant="outlined" sx={{ p: 1.5 }}>
                                        <Typography>
                                            <b>{c.category}</b> — {c.description}
                                        </Typography>
                                        <Typography variant="body2">
                                            {c.sum} {c.currency} | Day: {c.Date?.day ?? "?"}
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
