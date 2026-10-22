// Names are returned only by authorized database responses.
export function icelandMemberName(_id: string, fallback?: string | null): string { return fallback?.trim() || '姓名待設定' }
