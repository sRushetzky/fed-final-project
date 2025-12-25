import { useEffect, useState } from "react";
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
import { openCostsDB } from "../lib/idb";

export default function AddCostPage() {
    const [db, setDb] = useState(null);

    const [sum, setSum] = useState("");
    const [currency, setCurrency] = useState("USD");
    const [category, setCategory] = useState("FOOD");
    const [description, setDescription] = useState("");

    const [status, setStatus] = useState({ type: "", msg: "" });

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

    async function handleSubmit(e) {
        e.preventDefault();
        setStatus({ type: "", msg: "" });

        if (!db) {
            setStatus({ type: "error", msg: "DB not ready yet." });
            return;
        }

        const numSum = Number(sum);
        if (!Number.isFinite(numSum) || numSum <= 0) {
            setStatus({ type: "error", msg: "Sum must be a positive number." });
            return;
        }

        try {
            await db.addCost({
                sum: numSum,
                currency,
                category,
                description
            });

            setStatus({ type: "success", msg: "Cost item added successfully." });
            setSum("");
            setDescription("");
        } catch (e2) {
            setStatus({ type: "error", msg: e2.message });
        }
    }

    return (
        <Container sx={{ mt: 4 }}>
            <Paper sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ mb: 2 }}>
                    Add Cost
                </Typography>

                {status.msg ? (
                    <Alert severity={status.type === "error" ? "error" : "success"} sx={{ mb: 2 }}>
                        {status.msg}
                    </Alert>
                ) : null}

                <form onSubmit={handleSubmit}>
                    <Stack spacing={2}>
                        <TextField
                            label="Sum"
                            value={sum}
                            onChange={(e) => setSum(e.target.value)}
                            type="number"
                            inputProps={{ step: "0.01" }}
                            required
                        />

                        <TextField
                            select
                            label="Currency"
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                        >
                            {["USD", "ILS", "GBP", "EURO"].map((c) => (
                                <MenuItem key={c} value={c}>
                                    {c}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            label="Category"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            required
                        />

                        <TextField
                            label="Description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                        />

                        <Button type="submit" variant="contained" disabled={!db}>
                            Add
                        </Button>
                    </Stack>
                </form>
            </Paper>
        </Container>
    );
}
