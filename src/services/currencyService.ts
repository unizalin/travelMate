/**
 * Currency Service
 * Handles exchange rates with 24-hour caching and memory caching.
 * Uses ExchangeRate-API (Free Tier)
 */

interface ExchangeRateData {
    base_code: string;
    rates: Record<string, number>;
    time_last_update_unix: number;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const STORAGE_KEY_PREFIX = 'travelmate_exchange_rates_';
const MAX_CACHE_ENTRIES = 20; // Limit cache entries to prevent localStorage overflow

// Memory cache for performance
const memoryCache: Record<string, { data: ExchangeRateData; timestamp: number }> = {};

// Fallback rates (Hardcoded estimates if API fails)
const FALLBACK_RATES: Record<string, Record<string, number>> = {
    TWD: { JPY: 4.85, KRW: 42.5, USD: 0.031, CNY: 0.22, EUR: 0.029, HKD: 0.24, SGD: 0.042, GBP: 0.025, AUD: 0.047, CAD: 0.042, THB: 1.12 },
    JPY: { TWD: 0.206, USD: 0.0064, EUR: 0.0059, HKD: 0.05, CNY: 0.046, KRW: 8.76 },
    USD: { TWD: 32.25, JPY: 156.4, EUR: 0.92, CNY: 7.24, KRW: 1375, HKD: 7.8, GBP: 0.79 }
};

export const currencyService = {
    /**
     * Get exchange rates for a base currency
     */
    async getExchangeRates(baseCurrency: string): Promise<ExchangeRateData> {
        const now = Date.now();
        const storageKey = `${STORAGE_KEY_PREFIX}${baseCurrency}`;

        // 1. Check Memory Cache
        if (memoryCache[baseCurrency] && (now - memoryCache[baseCurrency].timestamp < CACHE_DURATION)) {
            return memoryCache[baseCurrency].data;
        }

        // 2. Check LocalStorage
        const cachedStr = localStorage.getItem(storageKey);
        if (cachedStr) {
            try {
                const cached = JSON.parse(cachedStr);
                if (now - cached.timestamp < CACHE_DURATION) {
                    memoryCache[baseCurrency] = { data: cached.data, timestamp: cached.timestamp };
                    return cached.data;
                }
            } catch (e) {
                console.error('Failed to parse cached currency data', e);
            }
        }

        // 3. Fetch from API
        try {
            const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
            if (!response.ok) throw new Error('API request failed');

            const data: ExchangeRateData = await response.json();

            // Clean old cache entries before saving new one
            this.cleanOldCacheEntries();

            // Save to cache
            const cacheValue = { data, timestamp: now };
            localStorage.setItem(storageKey, JSON.stringify(cacheValue));
            memoryCache[baseCurrency] = cacheValue;

            return data;
        } catch (error) {
            console.warn(`Falling back to hardcoded rates for ${baseCurrency}`, error);
            return this.getFallbackRates(baseCurrency);
        }
    },

    /**
     * Clean oldest cache entries to prevent localStorage overflow
     */
    cleanOldCacheEntries() {
        try {
            const cacheKeys = Object.keys(localStorage)
                .filter(key => key.startsWith(STORAGE_KEY_PREFIX))
                .map(key => {
                    try {
                        const cached = JSON.parse(localStorage.getItem(key) || '{}');
                        return { key, timestamp: cached.timestamp || 0 };
                    } catch {
                        return { key, timestamp: 0 };
                    }
                })
                .sort((a, b) => a.timestamp - b.timestamp);

            // Remove oldest entries if exceeding limit
            if (cacheKeys.length >= MAX_CACHE_ENTRIES) {
                const toRemove = cacheKeys.slice(0, cacheKeys.length - MAX_CACHE_ENTRIES + 1);
                toRemove.forEach(({ key }) => localStorage.removeItem(key));
            }
        } catch (e) {
            console.error('Failed to clean cache entries', e);
        }
    },

    /**
     * Provide fallback rates structure
     */
    getFallbackRates(baseCurrency: string): ExchangeRateData {
        return {
            base_code: baseCurrency,
            rates: FALLBACK_RATES[baseCurrency] || {},
            time_last_update_unix: Math.floor(Date.now() / 1000)
        };
    },

    /**
     * Convert amount from one currency to another
     */
    async convertCurrency(amount: number, from: string, to: string): Promise<number> {
        if (from === to) return amount;
        const data = await this.getExchangeRates(from);
        const rate = data.rates[to];
        if (!rate) {
            // Try reverse if possible
            const reverseData = await this.getExchangeRates(to);
            const reverseRate = reverseData.rates[from];
            if (reverseRate) return amount / reverseRate;
            throw new Error(`Rate not found from ${from} to ${to}`);
        }
        return amount * rate;
    },

    /**
     * Batch convert expenses to a target currency
     */
    async convertMultiple(items: { amount: number; currency: string }[], targetCurrency: string) {
        // Group by currency to minimize API calls
        const currencies = [...new Set(items.map(i => i.currency))];
        const rateMaps: Record<string, Record<string, number>> = {};

        for (const cur of currencies) {
            if (cur === targetCurrency) {
                rateMaps[cur] = { [targetCurrency]: 1 };
            } else {
                const data = await this.getExchangeRates(cur);
                rateMaps[cur] = data.rates;
            }
        }

        return items.map(item => {
            const rate = rateMaps[item.currency]?.[targetCurrency];
            return {
                ...item,
                convertedAmount: rate ? item.amount * rate : 0
            };
        });
    },

    /**
     * Format currency for display
     */
    formatCurrency(amount: number, currency: string, locale: string = 'zh-TW') {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount);
    },

    /**
     * Clear cache
     */
    clearCache() {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(STORAGE_KEY_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
        // Clear memory cache
        for (const key in memoryCache) delete memoryCache[key];
    }
};
