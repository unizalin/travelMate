const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY
const BASE_URL = 'https://api.openweathermap.org/data/2.5'

interface WeatherData {
    temp: number
    description: string
    icon: string
}

export const weatherService = {
    async getForecast(lat: number, lon: number): Promise<Record<string, WeatherData>> {
        if (!API_KEY) {
            console.warn('OpenWeatherMap API key is missing')
            return {}
        }

        // Check cache first (3 hours)
        const cacheKey = `weather_${lat}_${lon}`
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
            const { timestamp, data } = JSON.parse(cached)
            if (Date.now() - timestamp < 3 * 60 * 60 * 1000) {
                return data
            }
        }

        try {
            const response = await fetch(
                `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
            )

            if (!response.ok) throw new Error('Weather API failed')

            const data = await response.json()

            // Process data to get daily forecasts (midday)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const dailyForecasts: Record<string, WeatherData> = {}

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data.list.forEach((item: any) => {
                const date = item.dt_txt.split(' ')[0]
                // Prefer 12:00:00 forecast, or just take the first one found for that day
                if (!dailyForecasts[date] || item.dt_txt.includes('12:00:00')) {
                    dailyForecasts[date] = {
                        temp: Math.round(item.main.temp),
                        description: item.weather[0].description,
                        icon: item.weather[0].icon
                    }
                }
            })

            // Cache result
            localStorage.setItem(cacheKey, JSON.stringify({
                timestamp: Date.now(),
                data: dailyForecasts
            }))

            return dailyForecasts
        } catch (e) {
            console.error('Failed to fetch weather:', e)
            return {}
        }
    },

    async getCoordinates(city: string): Promise<{ lat: number; lon: number } | null> {
        if (!API_KEY) return null

        // Simple cache for geocoding
        const cacheKey = `geo_${city}`
        const cached = localStorage.getItem(cacheKey)
        if (cached) return JSON.parse(cached)

        try {
            const response = await fetch(
                `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`
            )
            if (!response.ok) return null

            const data = await response.json()
            if (data.length === 0) return null

            const result = { lat: data[0].lat, lon: data[0].lon }
            localStorage.setItem(cacheKey, JSON.stringify(result))
            return result
        } catch (e) {
            console.error('Geocoding failed:', e)
            return null
        }
    }
}
