import { ref, computed, onMounted, watch } from 'vue'

type Theme = 'light' | 'dark' | 'system'

const THEME_KEY = 'theme'

const theme = ref<Theme>('system')
const isDark = computed(() => {
    if (theme.value === 'light') return false
    if (theme.value === 'dark') return true
    // system：跟隨系統偏好
    return window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
})

function applyTheme() {
    const root = document.documentElement
    if (isDark.value) {
        root.classList.add('dark')
    } else {
        root.classList.remove('dark')
    }
}

function loadTheme() {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') return

    const saved = localStorage.getItem(THEME_KEY) as Theme | null
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
        theme.value = saved
    } else {
        theme.value = 'system'
    }
    applyTheme()
}

function setTheme(next: Theme) {
    theme.value = next
    localStorage.setItem(THEME_KEY, next)
    applyTheme()
}

export function useTheme() {
    onMounted(() => {
        loadTheme()
        // 只有在選 system 時，才跟著系統變化
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        const handler = () => {
            if (theme.value === 'system') applyTheme()
        }

        mq.addEventListener('change', handler)
    })

    watch(theme, () => {
        localStorage.setItem(THEME_KEY, theme.value)
    })

    return { theme, isDark, setTheme }
}
