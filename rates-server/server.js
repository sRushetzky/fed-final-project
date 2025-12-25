import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors({ origin: "*" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get("/rates.json", (req, res) => {
    res.sendFile(path.join(__dirname, "rates.json"));
});

const port = process.env.PORT || 3000;
app.listen(port);
