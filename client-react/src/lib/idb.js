// src/lib/idb.js (React / ES Modules)

// Holds the opened IndexedDB instance (kept private in this module)
let _db = null;

/*
 * openCostsDB(databaseName, databaseVersion)
 * Takes a database name and version and returns a Promise that resolves
 * to an object representing the database API.
 */
export async function openCostsDB(databaseName, databaseVersion) {
    // Open (or create/upgrade) the IndexedDB database
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(databaseName, databaseVersion);

        // Runs when DB is first created or when version is bumped
        request.onupgradeneeded = function (event) {
            const db = event.target.result;

            // Create the "costs" store if it doesn't exist
            if (!db.objectStoreNames.contains("costs")) {
                db.createObjectStore("costs", { keyPath: "id", autoIncrement: true });
            }

            // Create the "settings" store if it doesn't exist
            if (!db.objectStoreNames.contains("settings")) {
                db.createObjectStore("settings", { keyPath: "key" });
            }
        };

        // Runs when the database is successfully opened
        request.onsuccess = function (event) {
            // event.target.result is the opened IDBDatabase instance
            // Save it in a private variable so other functions can access it
            _db = event.target.result;

            // Resolve with an object that exposes the required API
            resolve({
                addCost,
                getReport,
                setRatesUrl,
                getPieChartData,
                getBarChartData
            });
        };

        // Runs when opening the database fails
        request.onerror = function () {
            reject(request.error);
        };
    });
}

// ----------------------- Helpers (avoid duplication) -----------------------

// Ensure the database was opened before any operation
function requireOpenDb() {
    if (!_db) {
        throw new Error("Database is not open. Call openCostsDB first.");
    }
}

// Default exchange rates (used when no URL is set or for local testing)
function defaultRates() {
    return { USD: 1, GBP: 0.6, EURO: 0.7, ILS: 3.4 };
}

// Convert an amount from one currency to another via USD
function convert(sum, fromCur, toCur, rates) {
    const usd = sum / rates[fromCur];
    return usd * rates[toCur];
}

// Read the exchange rates URL from the "settings" object store
function readRatesUrl(settingsStore) {
    return new Promise((resolve, reject) => {
        const req = settingsStore.get("ratesUrl");

        // If a value exists, return its "value" property, otherwise null
        req.onsuccess = () => resolve(req.result ? req.result.value : null);
        req.onerror = () => reject(req.error);
    });
}

// Fetch exchange rates from the provided URL (as required)
async function fetchRates(ratesUrl) {
    // Start with defaults (used if no URL is configured)
    let rates = defaultRates();

    // If a URL is provided, load it with Fetch API
    if (ratesUrl) {
        const response = await fetch(ratesUrl);

        // If HTTP response is not successful, treat as error
        if (!response.ok) {
            throw new Error("Failed to fetch exchange rates");
        }

        // Parse the JSON response into the rates object
        rates = await response.json();
    }

    return rates;
}

// ------------------------------ API methods ------------------------------

/*
 * addCost(cost)
 * Adds a new cost item and returns a Promise for the added item.
 */
async function addCost(cost) {
    return new Promise((resolve, reject) => {
        // Validate DB is open before we start a transaction
        try {
            requireOpenDb();
        } catch (e) {
            reject(e);
            return;
        }

        // Attach today's date to the cost item
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

        // Create a readwrite transaction on the "costs" object store
        const tx = _db.transaction(["costs"], "readwrite");

        // Get a reference to the "costs" object store inside the transaction
        const store = tx.objectStore("costs");

        // Add the record to the object store (asynchronous request)
        const request = store.add(record);

        // When the add completes successfully, resolve with the added item shape
        request.onsuccess = function () {
            // Resolve with the newly added cost item structure
            resolve({
                sum: record.sum,
                currency: record.currency,
                category: record.category,
                description: record.description,
                Date: { day: record.day }
            });
        };

        // If the add fails, reject with the IndexedDB error
        request.onerror = function () {
            reject(request.error);
        };
    });
}

/*
 * getReport(year, month, currency)
 * Returns a Promise for a detailed monthly report in a specific currency.
 *
 * IMPORTANT (React version):
 * - costs are already converted to the requested currency
 * - this allows charts to aggregate values without extra conversion
 */
async function getReport(year, month, currency) {
    return new Promise((resolve, reject) => {
        // Validate DB is open before reading data
        try {
            requireOpenDb();
        } catch (e) {
            reject(e);
            return;
        }

        // Open a readonly transaction on both "costs" and "settings"
        const tx = _db.transaction(["costs", "settings"], "readonly");
        const costsStore = tx.objectStore("costs");
        const settingsStore = tx.objectStore("settings");

        // Will hold all costs matching the requested month/year
        const rawCosts = [];

        // Cursor is used to iterate over all records in the "costs" store
        const cursorReq = costsStore.openCursor();

        // Cursor error handler
        cursorReq.onerror = function () {
            reject(cursorReq.error);
        };

        // Cursor success handler (runs repeatedly until cursor is null)
        cursorReq.onsuccess = function (event) {
            // event.target.result is either a cursor or null (end of store)
            const cursor = event.target.result;

            // If cursor is null, we finished scanning all records
            if (!cursor) {
                // Cursor reached the end → all costs were read
                // Now we can load exchange rates and calculate the report
                build().catch(reject);
                return;
            }

            // Current record from the store
            const r = cursor.value;

            // Keep only records from the requested year and month
            if (r.year === year && r.month === month) {
                rawCosts.push({
                    sum: r.sum,
                    currency: r.currency,
                    category: r.category,
                    description: r.description,
                    Date: { day: r.day }
                });
            }

            // Continue to the next record
            cursor.continue();
        };

        // Loads exchange rates (via fetch if URL exists) and builds final report
        async function build() {
            // Read the exchange rates URL from the "settings" object store
            const ratesUrl = await readRatesUrl(settingsStore);

            // Fetch exchange rates (or use defaults if no URL is set)
            const rates = await fetchRates(ratesUrl);

            // Convert each record into the requested currency (React requirement for charts)
            const convertedCosts = rawCosts.map((c) => ({
                ...c,
                sum: Number(convert(c.sum, c.currency, currency, rates).toFixed(2)),
                currency
            }));

            // Calculate total cost in the requested currency
            let total = 0;
            for (const c of convertedCosts) {
                total += c.sum;
            }

            // Resolve the Promise with the final report structure
            resolve({
                year,
                month,
                costs: convertedCosts,
                total: { currency, total: Number(total.toFixed(2)) }
            });
        }
    });
}

/*
 * setRatesUrl(url)
 * Saves the exchange-rates URL in the database settings.
 */
async function setRatesUrl(url) {
    return new Promise((resolve, reject) => {
        // Validate DB is open before writing settings
        try {
            requireOpenDb();
        } catch (e) {
            reject(e);
            return;
        }

        // Open a readwrite transaction on the "settings" object store
        const tx = _db.transaction(["settings"], "readwrite");
        const store = tx.objectStore("settings");

        // Store the URL under the key "ratesUrl"
        const request = store.put({ key: "ratesUrl", value: url });

        // Resolve true when saved successfully
        request.onsuccess = function () {
            resolve(true);
        };

        // Reject if saving fails
        request.onerror = function () {
            reject(request.error);
        };
    });
}

/*
 * getPieChartData(year, month, currency)
 * Returns:
 * [{ name: <category>, value: <sumInSelectedCurrency> }, ...]
 */
async function getPieChartData(year, month, currency) {
    // Use getReport() because it already returns converted costs in React
    const report = await getReport(year, month, currency);

    // Aggregate sums by category
    const map = new Map();
    for (const c of report.costs) {
        map.set(c.category, (map.get(c.category) || 0) + c.sum);
    }

    // Convert Map into the shape expected by Recharts
    return Array.from(map.entries()).map(([name, value]) => ({
        name,
        value: Number(value.toFixed(2))
    }));
}

/*
 * getBarChartData(year, currency)
 * Returns:
 * [{ month: 1..12, total: <sumInSelectedCurrency> }, ...]
 *
 * Single DB scan + single rates fetch
 */
async function getBarChartData(year, currency) {
    return new Promise((resolve, reject) => {
        // Validate DB is open before reading data
        try {
            requireOpenDb();
        } catch (e) {
            reject(e);
            return;
        }

        // Open a readonly transaction on both "costs" and "settings"
        const tx = _db.transaction(["costs", "settings"], "readonly");
        const costsStore = tx.objectStore("costs");
        const settingsStore = tx.objectStore("settings");

        // Collect raw items per month (to convert after we load rates once)
        const perMonth = Array.from({ length: 12 }, () => []);

        // Cursor is used to iterate over all records in the "costs" store
        const cursorReq = costsStore.openCursor();

        // Cursor error handler
        cursorReq.onerror = function () {
            reject(cursorReq.error);
        };

        // Cursor success handler
        cursorReq.onsuccess = function (event) {
            const cursor = event.target.result;

            // If cursor is null, we finished scanning all records
            if (!cursor) {
                build().catch(reject);
                return;
            }

            // Current record from the store
            const r = cursor.value;

            // Keep only records from the requested year and valid month range
            if (r.year === year && r.month >= 1 && r.month <= 12) {
                perMonth[r.month - 1].push({ sum: r.sum, currency: r.currency });
            }

            // Continue to the next record
            cursor.continue();
        };

        // Loads exchange rates once and computes totals for all 12 months
        async function build() {
            // Read the exchange rates URL from the "settings" object store
            const ratesUrl = await readRatesUrl(settingsStore);

            // Fetch exchange rates (or use defaults if no URL is set)
            const rates = await fetchRates(ratesUrl);

            // Will hold the final bar chart data (one entry per month)
            const data = [];

            // Iterate over all 12 months (1 = January, 12 = December)
            for (let m = 1; m <= 12; m++) {
                // Accumulates the total cost for the current month
                let total = 0;

                // Iterate over all cost items that belong to the current month
                for (const item of perMonth[m - 1]) {
                    // Convert each item to the selected currency and add to the monthly total
                    total += convert(item.sum, item.currency, currency, rates);
                }

                // Push the aggregated monthly result (rounded to 2 decimals)
                data.push({ month: m, total: Number(total.toFixed(2)) });
            }

            // Resolve the Promise with the full yearly bar chart data
            resolve(data);
        }
    });
}
