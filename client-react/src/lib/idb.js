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
                setRatesUrl
            });
        };

        request.onerror = function () {
            reject(request.error);
        };
    });
}

/**
 * addCost(cost)
 * Adds a new cost item to IndexedDB and resolves to the added item.
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
 */
async function getReport(year, month, currency) {
    return new Promise((resolve, reject) => {
        if (!_db) {
            reject(new Error("Database is not open. Call openCostsDB first."));
            return;
        }

        const tx = _db.transaction(["costs", "settings"], "readonly");
        const costsStore = tx.objectStore("costs");
        const settingsStore = tx.objectStore("settings");

        const costs = [];
        const cursorReq = costsStore.openCursor();

        cursorReq.onerror = function () {
            reject(cursorReq.error);
        };

        cursorReq.onsuccess = function (event) {
            const cursor = event.target.result;

            if (!cursor) {
                loadRatesAndBuildReport().catch(reject);
                return;
            }

            const r = cursor.value;

            if (r.year === year && r.month === month) {
                costs.push({
                    sum: r.sum,
                    currency: r.currency,
                    category: r.category,
                    description: r.description,
                    Date: { day: r.day }
                });
            }

            cursor.continue();
        };

        async function loadRatesAndBuildReport() {
            const ratesUrl = await new Promise((res, rej) => {
                const req = settingsStore.get("ratesUrl");
                req.onsuccess = () => res(req.result ? req.result.value : null);
                req.onerror = () => rej(req.error);
            });

            let rates = { USD: 1, GBP: 0.6, EURO: 0.7, ILS: 3.4 };

            if (ratesUrl) {
                const response = await fetch(ratesUrl);
                if (!response.ok) throw new Error("Failed to fetch exchange rates");
                rates = await response.json();
            }

            function convert(sum, fromCur, toCur) {
                const usd = sum / rates[fromCur];
                return usd * rates[toCur];
            }

            let total = 0;
            for (const c of costs) {
                total += convert(c.sum, c.currency, currency);
            }

            resolve({
                year,
                month,
                costs,
                total: { currency, total }
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
        if (!_db) {
            reject(new Error("Database is not open. Call openCostsDB first."));
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
