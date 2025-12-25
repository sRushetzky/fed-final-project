import express from "express";
import cors from "cors";

const app = express();
app.use(cors({ origin: "*" }));

app.get("/rates.json", (req, res) => {
    res.json({ USD: 1, GBP: 0.6, EURO: 0.7, ILS: 3.4 });
});

const port = process.env.PORT || 3000;
app.listen(port);
