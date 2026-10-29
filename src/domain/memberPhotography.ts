import type { InjectionKey, Ref } from 'vue'
import { photoSceneForItem } from './photographyAdvice'
export type PhotoDevice = 'a7c' | 'a6400' | 'action5'
export const memberPhotoDeviceKey: InjectionKey<Ref<PhotoDevice>> = Symbol('member-photo-device')
export const photoDevices: { value: PhotoDevice; label: string }[] = [
  { value: 'a7c', label: 'Sony α7C II' }, { value: 'a6400', label: 'Sony α6400' }, { value: 'action5', label: 'DJI Action 5 Pro' },
]
export function memberPhotoAdvice(name: string, device: PhotoDevice, slowAllowed: boolean) {
  const scene = photoSceneForItem(name)
  const waterfall = /foss|瀑布/i.test(name)
  const beach = /diamond|reynisfjara|沙灘/i.test(name)
  const water = waterfall || beach
  const composition = waterfall ? '拍法：瀑布全景、側面水霧與人物尺度各留一段；先擦乾鏡面水滴。'
    : beach ? '拍法：冰塊或黑沙作前景，定點拍浪的進退；保持退路，遵守封閉線。'
    : scene === 'moving' ? '拍法：船上定點拍冰山與人物尺度，固定器材並依船員指示。'
    : scene === 'low-light' ? '拍法：洞口亮部與冰層紋理，慢慢移動；依嚮導指示停留。'
    : scene === 'night' ? '拍法：固定構圖保留地景，先確認星點對焦，再拍極光變化。'
    : /峽谷|gljufur|þingvellir/i.test(name) ? '拍法：在正式步道平台拍直幅深度，另留一段緩慢平移的全景。'
    : '拍法：全景、主體細節與人物尺度各留一張；錄影先定點，再緩慢移動。'
  const night = scene === 'night'
  const moving = scene === 'moving' || /strokkur|間歇泉/i.test(name)
  let title = device === 'a7c' ? '轉盤 1 · 風景' : 'MR1 · 長焦風景'
  let settings = `A／${device === 'a7c' ? 'F8' : 'F5.6'}／Auto ISO／AF-S；手持先檢查快門，長焦與風吹主體時加快。`
  const notes: string[] = []
  if (moving) {
    title = device === 'a7c' ? '轉盤 2 · 動態' : 'MR2 · 人物與動物'
    settings = 'S／1/1000 秒／Auto ISO／AF-C；依主體速度與亮度調整。'
  } else if (night) {
    title = device === 'a7c' ? '轉盤 3 · 極光' : 'M · 夜景／極光（手動設定）'
    settings = device === 'a7c' ? 'M／F4／4 秒／ISO 3200／MF；腳架固定，放大星點確認對焦。' : 'M／鏡頭可用最大光圈／4 秒／ISO 3200／MF 起拍；腳架固定，放大星點確認對焦。'
    notes.push('極光亮或移動快就縮短曝光；取下 ND64 與 CPL。')
  } else if (scene === 'low-light') {
    title = '晨昏／冰洞 · 手動調整基本設定'
    settings = 'A／鏡頭可用最大光圈／Auto ISO；留意手持快門，人物移動時優先拍清楚。'
  }
  if (!slowAllowed) notes.push('區域日預報風勢偏強：先定點拍攝、縮低腳架；器材晃動時停止長曝，以現場狀況為準。')
  if (device === 'action5') {
    title = 'Action 5 · 旅途錄影'
    settings = '4K／30fps／RockSteady 起拍；曝光先用自動。光線足夠且想慢放時再改 60fps。'
    notes.push('ND64／CPL 視為相機用，不直接套用到 Action 5；移動防震拍攝先不用 ND。')
    if (night || scene === 'low-light') notes.push('低光先用 30fps、減少移動並試錄檢查拖影；極光照片優先用相機與腳架。')
  }
  return { title, settings, composition, notes,
    nd: night || scene === 'low-light' ? 'ND64：先取下，保留進光量。' : water ? 'ND64：想延長曝光、固定低 ISO 後仍太亮才裝；不是每次到瀑布都要用。' : 'ND64：一般手持風景先不用；需要慢快門時再裝。',
    cpl: night || scene === 'low-light' ? 'CPL：先取下，保留進光量。' : waterfall ? 'CPL：旋轉比較濕岩反光；想保留彩虹時先取下比較。' : 'CPL：旋轉比較水面、冰塊或玻璃反光，保留想要的質感；廣角天空留意明暗不均。',
    water: water ? slowAllowed ? '腳架＋M／F8／ISO 100，快門從 0.3–2 秒試拍；固定低 ISO，太亮才裝 ND64。浪區不為慢門靠近水線。' : '風勢偏強，先不套用 ND64 慢門；穩定站位拍清楚，現場安全且器材穩固再評估。' : null,
  }
}
