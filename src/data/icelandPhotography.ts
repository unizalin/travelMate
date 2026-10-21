import type { PhotoSpot } from '@/domain/tripJourney'

/** Reference values from the Iceland UI preview; these are suggestions, not camera presets. */
export const cameraSettingsByPhotoSpotId: Record<string, string> = {
  'photo-seljalandsfoss-low-angle': 'CPL 濾鏡；快門 1/4–1 秒，使用腳架。',
  'photo-skogafoss-scale': 'ND64 濾鏡；快門 1/4–2 秒，使用腳架。',
  'photo-reynisfjara-waves': 'ND 濾鏡；快門 1/4–1 秒。腳架只放安全區。',
}

/**
 * Static suggestions transcribed from the supplied winter photo travel book.
 * The book is a dated reference, not a live opening, road, weather, or safety source.
 */
export const icelandPhotoSpots: Record<string, PhotoSpot[]> = {
  'Kirkjufellsfoss': [
    { id: 'photo-kirkjufellsfoss-classic', title: '瀑布與教堂山經典位', device: 'both', composition: '瀑布作前景、山峰作背景；橫幅與直幅各留一張。', suggestedTime: '上午', safetyNote: '依當日風雪與步道開放狀況調整，不越過封鎖線。', sourceLabel: '2026 Iceland Winter Photo Travel Book' },
  ],
  'Þingvellir': [
    { id: 'photo-thingvellir-rift', title: '裂谷與湖面晨光', device: 'both', composition: '先拍裂谷與湖面層次，再沿正式步道取景。', suggestedTime: '晨光', safetyNote: '只走開放步道，依當日冰雪狀況調整。', sourceLabel: '2026 Iceland Winter Photo Travel Book' },
  ],
  'Brúarfoss': [
    { id: 'photo-bruarfoss-blue-water', title: '藍色水流匯聚', device: 'camera', composition: '從橋中央讓水流向畫面中心匯聚；慢速快門僅作拍攝建議。', suggestedTime: '上午', safetyNote: '冬季步道濕滑時不要勉強前進。', sourceLabel: '2026 Iceland Winter Photo Travel Book' },
  ],
  'Strokkur': [
    { id: 'photo-strokkur-eruption', title: '間歇泉噴發瞬間', device: 'camera', composition: '先觀察一輪噴發，預留上方空間再連拍。', suggestedTime: '中午前', safetyNote: '留在指定觀景範圍。', sourceLabel: '2026 Iceland Winter Photo Travel Book' },
  ],
  'Gullfoss': [
    { id: 'photo-gullfoss-rainbow', title: '瀑布、峽谷與水霧', device: 'both', composition: '上層平台取兩段瀑布與峽谷；有陽光時留意彩虹。', suggestedTime: '午後', safetyNote: '依平台開放與風雪狀況調整。', sourceLabel: '2026 Iceland Winter Photo Travel Book' },
  ],
  'Seljalandsfoss': [
    { id: 'photo-seljalandsfoss-low-angle', title: '瀑布河道低角度', device: 'both', composition: '正面偏左、河道低角度與人物比例。', suggestedTime: '早上', safetyNote: '後方步道僅在開放且無嚴重結冰時進入。', sourceLabel: '2026 Iceland Winter Photo Travel Book' },
  ],
  'Skógafoss': [
    { id: 'photo-skogafoss-scale', title: '瀑布與人物尺度', device: 'both', composition: '正中央對稱與側面人物尺度各一張。', suggestedTime: '早上', safetyNote: '結冰時不勉強登階梯。', sourceLabel: '2026 Iceland Winter Photo Travel Book' },
  ],
  'Reynisfjara': [
    { id: 'photo-reynisfjara-waves', title: '黑沙與白浪幾何', device: 'both', composition: '以白浪、黑沙與海蝕柱組成幾何畫面。', suggestedTime: '午後', safetyNote: '面向海並遵守警示燈與封閉線，不站在退路會被浪包圍的位置。', sourceLabel: '2026 Iceland Winter Photo Travel Book' },
  ],
  'Fjaðrárgljúfur': [
    { id: 'photo-fjadrargljufur-depth', title: '峽谷直幅深度', device: 'camera', composition: '沿正式步道前兩至三個平台，以直幅突出峽谷深度。', suggestedTime: '上午', safetyNote: '依步道與天候公告調整。', sourceLabel: '2026 Iceland Winter Photo Travel Book' },
  ],
  'Diamond Beach': [
    { id: 'photo-diamond-beach-long-exposure', title: '冰塊與拖曳浪線', device: 'camera', composition: '先觀察橋兩側冰塊分布，再以冰塊作前景拍浪線。', suggestedTime: '黃昏', safetyNote: '腳架不要放在會被浪包圍的位置。', sourceLabel: '2026 Iceland Winter Photo Travel Book' },
  ],
  'Hali Blue Ice Cave Adventure': [
    { id: 'photo-ice-cave-entrance', title: '冰洞洞口剪影', device: 'both', composition: '人物站在亮部，保留冰拱門的尺度。', suggestedTime: '票面行程內', safetyNote: '只跟隨嚮導，不越過繩線或自行探索側洞。', sourceLabel: '2026 Iceland Winter Photo Travel Book' },
    { id: 'photo-ice-cave-texture', title: '藍冰紋理', device: 'camera', composition: '稍降曝光保留氣泡、裂紋與火山灰層次。', suggestedTime: '票面行程內', safetyNote: '以嚮導指示與當日條件為準。', sourceLabel: '2026 Iceland Winter Photo Travel Book' },
  ],
  'Zodiac Boat Tour': [
    { id: 'photo-zodiac-iceberg-scale', title: '船上冰山尺度', device: 'camera', composition: '讓另一艘船或乘客進畫面，呈現冰山尺度。', suggestedTime: '票面行程內', safetyNote: '上船後依船員指示，避免航程中更換器材。', sourceLabel: '2026 Iceland Winter Photo Travel Book' },
  ],
  'Hallgrímskirkja': [
    { id: 'photo-hallgrimskirkja-symmetry', title: '教堂正面對稱', device: 'both', composition: '正面對稱或側邊極簡線條；Rainbow Street 可作引導線。', suggestedTime: '城市散步', sourceLabel: '2026 Iceland Winter Photo Travel Book' },
  ],
  'Blue Lagoon': [
    { id: 'photo-blue-lagoon-steam', title: '熔岩、水面與蒸氣剪影', device: 'phone', composition: '乳藍水面、黑色熔岩與藍調時刻的蒸氣人物剪影。', suggestedTime: '藍調時刻', safetyNote: '以場地方規與不影響他人為前提。', sourceLabel: '2026 Iceland Winter Photo Travel Book' },
  ],
}
