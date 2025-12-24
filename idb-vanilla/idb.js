// idb.js (Vanilla JS)
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
                resolve({
                    addCost: addCost,
                    getReport: getReport,
                    setRatesUrl: setRatesUrl
                });
            };

            request.onerror = function () {
                reject(request.error);
            };
        });
    }

    /*
     * addCost(cost)
     * Adds a new cost item and returns a Promise for the added item.
     */
    async function addCost(cost) {
        return new Promise((resolve, reject) => {
            if (!_db) {
                reject(new Error("Database is not open. Call openCostsDB first."));
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
            if (!_db) {
                reject(new Error("Database is not open. Call openCostsDB first."));
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
                    loadRatesAndBuildReport().catch(reject);
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
            async function loadRatesAndBuildReport() {
                // Read the exchange rates URL from the "settings" object store
                const ratesUrl = await new Promise((res, rej) => {
                    const req = settingsStore.get("ratesUrl");
                    req.onsuccess = () => res(req.result ? req.result.value : null);
                    req.onerror = () => rej(req.error);
                });

                // Default exchange rates (used when no URL is set or for local testing)
                let rates = { USD: 1, GBP: 0.6, EURO: 0.7, ILS: 3.4 };

                // Fetch exchange rates from the provided URL (as required)
                if (ratesUrl) {
                    const response = await fetch(ratesUrl);

                    // If HTTP response is not successful, treat as error
                    if (!response.ok) {
                        throw new Error("Failed to fetch exchange rates");
                    }

                    // Parse the JSON response into the rates object
                    rates = await response.json();
                }

                // Convert an amount from one currency to another via USD
                function convert(sum, fromCur, toCur) {
                    const usd = sum / rates[fromCur];
                    return usd * rates[toCur];
                }

                // Calculate total cost in the requested currency
                let total = 0;
                for (const c of costs) {
                    total += convert(c.sum, c.currency, currency);
                }

                // Resolve the Promise with the final report structure
                resolve({
                    year: year,
                    month: month,
                    costs: costs,
                    total: { currency: currency, total: total }
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
            if (!_db) {
                reject(new Error("Database is not open. Call openCostsDB first."));
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

    // Expose only the required entry point
    window.idb = { openCostsDB: openCostsDB };

})();
