// OpenCage 地理編碼服務
export interface AddressSearchResult {
    name: string;
    formatted_address: string;
    latitude: number;
    longitude: number;
    country_code?: string;
    city?: string;
}

async function geocodeWithOpenCage(address: string) {
    const apiKey = import.meta.env.VITE_OPENCAGE_API_KEY;

    if (!apiKey) {
        console.error('❌ 未設定 VITE_OPENCAGE_API_KEY');
        console.log('請在 .env.local 中加入: VITE_OPENCAGE_API_KEY=你的API金鑰');
        return null;
    }

    try {
        const response = await fetch(
            `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${apiKey}&language=ja&no_annotations=1`,
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            console.error(`OpenCage API Error: ${response.status}`);
            return null;
        }

        const data = await response.json();

        if (data.results && data.results.length > 0) {
            const result = data.results[0];
            const location = result.geometry;
            console.log(`✅ OpenCage 找到座標: ${location.lat}, ${location.lng}`);
            console.log(`   地址: ${address}`);
            console.log(`   格式化地址: ${result.formatted}`);

            return {
                latitude: location.lat,
                longitude: location.lng
            };
        }

        console.warn(`⚠️ OpenCage 找不到結果: ${address}`);
        return null;

    } catch (error) {
        console.error('OpenCage Geocoding error:', error);
        return null;
    }
}

async function searchWithOpenCage(query: string): Promise<AddressSearchResult[]> {
    const apiKey = import.meta.env.VITE_OPENCAGE_API_KEY;
    if (!apiKey) return [];

    try {
        const response = await fetch(
            `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${apiKey}&language=ja&limit=10`,
        );

        if (!response.ok) return [];

        const data = await response.json();
        return data.results.map((result: any) => ({
            name: result.components.unknown || result.components.building || result.components.house || result.formatted.split(',')[0],
            formatted_address: result.formatted,
            latitude: result.geometry.lat,
            longitude: result.geometry.lng,
            country_code: result.components['ISO_3166-1_alpha-2']?.toLowerCase(),
            city: result.components.city || result.components.town || result.components.village || result.components.state
        }));
    } catch (error) {
        console.error('OpenCage Search error:', error);
        return [];
    }
}

// Nominatim 備用方案（免費但對日文支援較差）
async function geocodeWithNominatim(address: string) {
    try {
        // 嘗試不同的地址格式
        const addressVariations = [
            address,
            address + ', Japan',
            // 移除括號內容
            address.split('（')[0].split('(')[0].trim()
        ];

        for (const addr of addressVariations) {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1&accept-language=ja`,
                {
                    headers: {
                        'User-Agent': 'TravelMate App/1.0'
                    }
                }
            );

            if (!response.ok) {
                continue;
            }

            const data = await response.json();

            if (data.length > 0) {
                console.log(`✅ Nominatim 找到座標 (使用地址: ${addr})`);
                return {
                    latitude: parseFloat(data.lat),
                    longitude: parseFloat(data.lon)
                };
            }

            // 延遲 1 秒避免超過 API 限制
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return null;
    } catch (error) {
        console.error('Nominatim error:', error);
        return null;
    }
}

async function searchWithNominatim(query: string): Promise<AddressSearchResult[]> {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&addressdetails=1&accept-language=ja`,
            {
                headers: { 'User-Agent': 'TravelMate App/1.0' }
            }
        );

        if (!response.ok) return [];

        const data = await response.json();
        return data.map((result: any) => ({
            name: result.name || result.display_name.split(',')[0],
            formatted_address: result.display_name,
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon),
            country_code: result.address.country_code,
            city: result.address.city || result.address.town || result.address.village || result.address.state
        }));
    } catch (error) {
        console.error('Nominatim Search error:', error);
        return [];
    }
}

// 主要地理編碼函數
export async function geocodeAddress(address: string) {
    if (!address || address.trim() === '') {
        console.warn('⚠️ 地址為空，無法查詢座標');
        return null;
    }

    console.log(`🔍 正在查詢座標: ${address}`);

    // 優先使用 OpenCage（對日文支援較好）
    let coords = await geocodeWithOpenCage(address);
    if (coords) {
        return coords;
    }

    // 備用方案：使用 Nominatim
    console.log('💡 嘗試備用服務 Nominatim...');
    coords = await geocodeWithNominatim(address);
    if (coords) {
        return coords;
    }

    console.warn(`❌ 所有地理編碼服務都找不到座標: ${address}`);
    console.log('💡 建議：請確認地址是否正確，或手動輸入座標');

    return null;
}

export async function searchAddress(query: string): Promise<AddressSearchResult[]> {
    if (!query || query.trim().length < 2) return [];

    // Try OpenCage first if key exists
    if (import.meta.env.VITE_OPENCAGE_API_KEY) {
        const results = await searchWithOpenCage(query);
        if (results.length > 0) return results;
    }

    // Fallback to Nominatim
    return await searchWithNominatim(query);
}

// 批次地理編碼（帶進度顯示）
export async function geocodeAddresses(addresses: string[]) {
    const results = [];
    const total = addresses.length;

    console.log(`🚀 開始批次查詢 ${total} 個地址的座標...`);

    for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i];
        console.log(`\n[${i + 1}/${total}] 處理中...`);

        const coords = await geocodeAddress(address);
        results.push(coords);

        // 延遲 1.5 秒避免超過 API 限制
        if (i < addresses.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
    }

    const successCount = results.filter(r => r !== null).length;
    console.log(`\n✨ 批次查詢完成！成功: ${successCount}/${total}`);

    return results;
}
