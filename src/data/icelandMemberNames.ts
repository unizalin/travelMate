const names: Record<string, string> = { 'member-1': 'U', 'member-2': 'jinyo', 'member-3': 'Kevin Ho か', 'member-4': 'Rosanne 🌹', 'member-5': 'YU', 'member-6': '思辰' }
export function icelandMemberName(id: string, fallback?: string | null): string { return names[id] ?? fallback?.trim() ?? '姓名待設定' }
