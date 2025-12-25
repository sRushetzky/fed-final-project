// idb.js (Vanilla JS - synced structure with React version)
(function () {
    // Holds the opened IndexedDB instance
    let _db = null;

    /*
     * openCostsDB(databaseName, databaseVersion)
     * Takes a database name and version and returns a Promise that resolves
     * to an object representing the database API.
     */
    async function openCostsDB(databaseName, databaseVersion) {
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
                // event.target.result is the opened IDBDatabase instance
                // Save it in a private variable so other functions can access it
                _db = event.target.result;
                // Resolve with an object that exposes the required API
                resolve({ addCost, getReport, setRatesUrl });
            };

            request.onerror = function () {
                reject(request.error);
            };
        });
    }

    // ----------------------- Helpers (avoid duplication) -----------------------

    // Ensure the database was opened before any operation
    function requireOpenDb() {
        if (!_db) throw new Error("Database is not open. Call openCostsDB first.");
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
        return new Promise((res, rej) => {
            const req = settingsStore.get("ratesUrl");
            req.onsuccess = () => res(req.result ? req.result.value : null);
            req.onerror = () => rej(req.error);
        });
    }

    // Fetch exchange rates from the provided URL (as required)
    async function fetchRates(ratesUrl) {
        let rates = defaultRates();

        if (ratesUrl) {
            console.log(`Fetching exchange rates from ${ratesUrl}`);
            const response = await fetch(ratesUrl);

            // If HTTP response is not successful, treat as error
            if (!response.ok) throw new Error("Failed to fetch exchange rates");

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

            // Create a readwrite transaction on the "costs" object store
            const tx = _db.transaction(["costs"], "readwrite");

            // Get a reference to the "costs" object store inside the transaction
            const store = tx.objectStore("costs");

            // Add the record to the object store (asynchronous request)
            const request = store.add(record);

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

            request.onerror = function () {
                reject(request.error);
            };
        });
    }

    /*
     * getReport(year, month, currency)
     * Returns a Promise for a detailed monthly report in a specific currency.
     */
    async function getReport(year, month, currency) {
        return new Promise((resolve, reject) => {
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
            const costs = [];

            // Cursor is used to iterate over all records in the "costs" store
            const cursorReq = costsStore.openCursor();

            cursorReq.onerror = function () {
                reject(cursorReq.error);
            };

            cursorReq.onsuccess = function (event) {
                // event.target.result is either a cursor or null (end of store)
                const cursor = event.target.result;

                if (!cursor) {
                    // Cursor reached the end → all costs were read
                    // Now we can load exchange rates and calculate the report
                    build().catch(reject);
                    return;
                }

                const r = cursor.value;

                // Keep only records from the requested year and month
                if (r.year === year && r.month === month) {
                    costs.push({
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
                const rates = await fetchRates(ratesUrl);

                // Calculate total cost in the requested currency
                let total = 0;
                for (const c of costs) {
                    total += convert(c.sum, c.currency, currency, rates);
                }

                // Resolve the Promise with the final report structure
                resolve({
                    year,
                    month,
                    costs,
                    total: { currency, total }
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

            request.onsuccess = function () {
                resolve(true);
            };

            request.onerror = function () {
                reject(request.error);
            };
        });
    }

    // REQUIRED: expose idb on the global object
    window.idb = { openCostsDB };
})();
