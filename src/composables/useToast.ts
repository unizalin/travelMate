import { reactive } from 'vue';

export interface ToastMessage {
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
}

const state = reactive<{
    toasts: ToastMessage[];
}>({
    toasts: []
});

export function useToast() {
    const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 3000) => {
        const id = Math.random().toString(36).substring(2, 9);
        const toast: ToastMessage = { id, message, type, duration };

        state.toasts.push(toast);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    };

    const removeToast = (id: string) => {
        const index = state.toasts.findIndex(t => t.id === id);
        if (index !== -1) {
            state.toasts.splice(index, 1);
        }
    };

    return {
        toasts: state.toasts,
        showToast,
        removeToast
    };
}
