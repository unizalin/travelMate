import { ref, onMounted, watch } from 'vue'

export function useTheme() {
    const theme = ref<'light' | 'dark'>(
        (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
    )

    const toggleTheme = () => {
        theme.value = theme.value === 'light' ? 'dark' : 'light'
    }

    const applyTheme = () => {
        if (theme.value === 'dark') {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
        localStorage.setItem('theme', theme.value)
    }

    onMounted(() => {
        applyTheme()
    })

    watch(theme, () => {
        applyTheme()
    })

    return {
        theme,
        toggleTheme
    }
}
