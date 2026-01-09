import { reactive } from 'vue';

interface ToastState {
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
}

const state = reactive<ToastState>({
    show: false,
    message: '',
    type: 'info'
});

export function useToast() {
    const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
        state.message = message;
        state.type = type;
        state.show = true;

        // Auto hide is handled by component watch, but we can also reset state here if multiple rapid calls
        // For simplicity, relying on component timer or overlapping is fine for simple toast.
        // A queue system is better for production, but single toast is requested.
        setTimeout(() => {
            state.show = false;
        }, 3000);
    };

    return {
        state,
        showToast
    };
}
