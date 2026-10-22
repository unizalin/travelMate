export type PackingCategory = '出發前' | '必帶' | '衣服' | '盥洗' | '其他'

export type PackingTemplateCategory = {
  category: PackingCategory
  items: string[]
}

export type PackingItem = {
  id: string
  tripId: string
  category: PackingCategory
  title: string
  isShared: boolean
  ownerId: string | null
  orderIndex: number
  completed: boolean
}

export const DEPARTURE_CHECKLIST_ITEMS = ['護照、駕照、國際駕照與電子票券', '租車保險與還車規定', '本人測試推播並下載離線行程', 'Sky Lagoon 訂位與入場時間']

export const PACKING_TEMPLATE: PackingTemplateCategory[] = [
  { category: '必帶', items: ['家裡鑰匙', '充電器（瓦數/轉接）/線', '行動電源', '耳機', '護照/備用照片', '行李秤', '申請資料/簽證', 'SIM卡', '筆', '預辦登機', '現金/信用卡'] },
  { category: '衣服', items: ['耳環/手鍊/手錶', '眼鏡/太陽眼鏡', '外出鞋/襪子', '拖鞋', '外套', '睡衣', '外出服', '內褲/內衣'] },
  { category: '盥洗', items: ['乳液/化妝水', '棉花棒/毛巾/衛生棉/ok繃', '浴球', '頭痛藥/胃藥/過敏藥', '指甲剪/刮鬍刀/剪刀/梳子', '洗/潤髮乳/沐浴乳', '牙刷/牙膏/漱口水', '保養液/隱形眼鏡', '衛生紙/濕紙巾', '化妝包', '卸妝/洗面乳'] },
  { category: '其他', items: ['防蚊液/防曬乳', '自拍桿', '泳衣', '圍巾/毛帽', '雨傘', '頸枕', '國際駕照', '本地汽車駕照', '筆電', '水瓶', '手機掛繩', '酵素/中藥', '手機防水袋', '口罩', '室內拖鞋'] },
]

export function mergePackingItems(items: PackingItem[], ownerId: string | null): PackingItem[] {
  const categoryOrder = new Map(PACKING_TEMPLATE.map((category, index) => [category.category, index]))
  return items
    .filter(item => item.isShared || (ownerId !== null && item.ownerId === ownerId))
    .sort((a, b) => (categoryOrder.get(a.category) ?? Infinity) - (categoryOrder.get(b.category) ?? Infinity) || a.orderIndex - b.orderIndex || a.title.localeCompare(b.title, 'zh-TW'))
}
