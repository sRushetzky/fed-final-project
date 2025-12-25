import { useEffect, useState } from "react";
import {
    Container,
    Paper,
    Stack,
    TextField,
    Button,
    Typography,
    Alert
} from "@mui/material";
import { openCostsDB } from "../lib/idb";

export default function SettingsPage() {
    const [db, setDb] = useState(null);
    const [ratesUrl, setRatesUrl] = useState("");
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

    async function handleSave() {
        setStatus({ type: "", msg: "" });

        if (!db) {
            setStatus({ type: "error", msg: "DB not ready yet." });
            return;
        }

        if (!ratesUrl.trim()) {
            setStatus({ type: "error", msg: "Please enter a URL." });
            return;
        }

        try {
            await db.setRatesUrl(ratesUrl.trim());
            setStatus({ type: "success", msg: "Rates URL saved successfully." });
        } catch (e) {
            setStatus({ type: "error", msg: e.message });
        }
    }

    return (
        <Container sx={{ mt: 4 }}>
            <Paper sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ mb: 2 }}>
                    Settings
                </Typography>

                {status.msg && (
                    <Alert severity={status.type === "error" ? "error" : "success"} sx={{ mb: 2 }}>
                        {status.msg}
                    </Alert>
                )}

                <Stack spacing={2}>
                    <TextField
                        label="Exchange Rates URL"
                        placeholder="https://example.com/rates.json"
                        value={ratesUrl}
                        onChange={(e) => setRatesUrl(e.target.value)}
                        fullWidth
                    />

                    <Button variant="contained" onClick={handleSave} disabled={!db}>
                        Save
                    </Button>
                </Stack>
            </Paper>
        </Container>
    );
}
