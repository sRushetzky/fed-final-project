// src/lib/idb.js (React / ES Modules)

let _db = null;

/**
 * openCostsDB(databaseName, databaseVersion)
 * Returns a Promise that resolves to an object representing the database API.
 */
export async function openCostsDB(databaseName, databaseVersion) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(databaseName, databaseVersion);

        request.onupgradeneeded = function (event) {
            const db = event.target.result;

            if (!db.objectStoreNames.contains("costs")) {
                db.createObjectStore("costs", { keyPath: "id", autoIncrement: true });
            }
            if (!db.objectStoreNames.contains("settings")) {
                db.createObjectStore("settings", { keyPath: "key" });
            }
        };

        request.onsuccess = function (event) {
            _db = event.target.result;

            // keep same API style you used before
            resolve({
                addCost,
                getReport,
                setRatesUrl,
                getPieChartData,
                getBarChartData
            });
        };

        request.onerror = function () {
            reject(request.error);
        };
    });
}

/* ----------------------- Helpers (avoid duplication) ----------------------- */

function requireOpenDb() {
    if (!_db) throw new Error("Database is not open. Call openCostsDB first.");
}

function defaultRates() {
    return { USD: 1, GBP: 0.6, EURO: 0.7, ILS: 3.4 };
}

function convert(sum, fromCur, toCur, rates) {
    const usd = sum / rates[fromCur];
    return usd * rates[toCur];
}

async function readRatesUrl(settingsStore) {
    return new Promise((res, rej) => {
        const req = settingsStore.get("ratesUrl");
        req.onsuccess = () => res(req.result ? req.result.value : null);
        req.onerror = () => rej(req.error);
    });
}

async function fetchRates(ratesUrl) {
    let rates = defaultRates();

    if (ratesUrl) {
        const response = await fetch(ratesUrl);
        if (!response.ok) throw new Error("Failed to fetch exchange rates");
        rates = await response.json();
    }

    return rates;
}

/* ------------------------------ API methods ------------------------------ */

/**
 * addCost(cost)
 * Adds a new cost item to IndexedDB and resolves to the added item.
 */
async function addCost(cost) {
    return new Promise((resolve, reject) => {
        try {
            requireOpenDb();
        } catch (e) {
            reject(e);
            return;
        }

        const now = new Date();
        const record = {
            sum: cost.sum,
            currency: cost.currency,
            category: cost.category,
            description: cost.description,
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            day: now.getDate()
        };

        const tx = _db.transaction(["costs"], "readwrite");
        const store = tx.objectStore("costs");
        const request = store.add(record);

        request.onsuccess = function () {
            resolve({
                sum: record.sum,
                currency: record.currency,
                category: record.category,
                description: record.description,
                Date: { day: record.day }
            });
        };

        request.onerror = function () {
            reject(request.error);
        };
    });
}

/**
 * getReport(year, month, currency)
 * Returns a Promise resolving to a detailed report object.
 *
 * IMPORTANT (for charts):
 * This React version returns costs with sum already converted to the requested currency,
 * so the UI can safely aggregate by category without extra conversion.
 */
async function getReport(year, month, currency) {
    return new Promise((resolve, reject) => {
        try {
            requireOpenDb();
        } catch (e) {
            reject(e);
            return;
        }

        const tx = _db.transaction(["costs", "settings"], "readonly");
        const costsStore = tx.objectStore("costs");
        const settingsStore = tx.objectStore("settings");

        const rawCosts = [];
        const cursorReq = costsStore.openCursor();

        cursorReq.onerror = function () {
            reject(cursorReq.error);
        };

        cursorReq.onsuccess = function (event) {
            const cursor = event.target.result;

            if (!cursor) {
                build().catch(reject);
                return;
            }

            const r = cursor.value;
            if (r.year === year && r.month === month) {
                rawCosts.push({
                    sum: r.sum,
                    currency: r.currency,
                    category: r.category,
                    description: r.description,
                    Date: { day: r.day }
                });
            }

            cursor.continue();
        };

        async function build() {
            const ratesUrl = await readRatesUrl(settingsStore);
            const rates = await fetchRates(ratesUrl);

            const convertedCosts = rawCosts.map((c) => ({
                ...c,
                sum: Number(convert(c.sum, c.currency, currency, rates).toFixed(2)),
                currency
            }));

            let total = 0;
            for (const c of convertedCosts) total += c.sum;

            resolve({
                year,
                month,
                costs: convertedCosts,
                total: { currency, total: Number(total.toFixed(2)) }
            });
        }
    });
}

/**
 * setRatesUrl(url)
 * Saves exchange-rates URL in IndexedDB settings.
 */
async function setRatesUrl(url) {
    return new Promise((resolve, reject) => {
        try {
            requireOpenDb();
        } catch (e) {
            reject(e);
            return;
        }

        const tx = _db.transaction(["settings"], "readwrite");
        const store = tx.objectStore("settings");
        const request = store.put({ key: "ratesUrl", value: url });

        request.onsuccess = function () {
            resolve(true);
        };

        request.onerror = function () {
            reject(request.error);
        };
    });
}

/**
 * getPieChartData(year, month, currency)
 * Returns: [{ name: <category>, value: <sumInSelectedCurrency> }, ...]
 * Uses getReport (which already converts costs in this React version).
 */
async function getPieChartData(year, month, currency) {
    const report = await getReport(year, month, currency);

    const map = new Map();
    for (const c of report.costs) {
        map.set(c.category, (map.get(c.category) || 0) + c.sum);
    }

    return Array.from(map.entries()).map(([name, value]) => ({
        name,
        value: Number(value.toFixed(2))
    }));
}

/**
 * getBarChartData(year, currency)
 * Returns: [{ month: 1..12, total: <sumInSelectedCurrency> }, ...]
 * Single DB scan + single rates fetch (no 12x getReport).
 */
async function getBarChartData(year, currency) {
    return new Promise((resolve, reject) => {
        try {
            requireOpenDb();
        } catch (e) {
            reject(e);
            return;
        }

        const tx = _db.transaction(["costs", "settings"], "readonly");
        const costsStore = tx.objectStore("costs");
        const settingsStore = tx.objectStore("settings");

        // collect raw items per month (to convert after we load rates once)
        const perMonth = Array.from({ length: 12 }, () => []);
        const cursorReq = costsStore.openCursor();

        cursorReq.onerror = function () {
            reject(cursorReq.error);
        };

        cursorReq.onsuccess = function (event) {
            const cursor = event.target.result;

            if (!cursor) {
                build().catch(reject);
                return;
            }

            const r = cursor.value;
            if (r.year === year && r.month >= 1 && r.month <= 12) {
                perMonth[r.month - 1].push({ sum: r.sum, currency: r.currency });
            }

            cursor.continue();
        };

        async function build() {
            const ratesUrl = await readRatesUrl(settingsStore);
            const rates = await fetchRates(ratesUrl);

            const data = [];
            for (let m = 1; m <= 12; m++) {
                let total = 0;
                for (const item of perMonth[m - 1]) {
                    total += convert(item.sum, item.currency, currency, rates);
                }
                data.push({ month: m, total: Number(total.toFixed(2)) });
            }

            resolve(data);
        }
    });
}
