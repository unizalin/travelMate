export const animations = {
    transition: {
        default: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
        fast: '100ms cubic-bezier(0.4, 0, 0.2, 1)',
        slow: '400ms cubic-bezier(0.4, 0, 0.2, 1)',
        premium: '500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
    keyframes: {
        fadeIn: {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' },
        },
        slideInRight: {
            '0%': { transform: 'translateX(100%)' },
            '100%': { transform: 'translateX(0)' },
        },
        bounceSubtle: {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-2px)' },
        }
    }
}
