import { reactive } from 'vue';

interface DialogState {
    isOpen: boolean;
    type: 'confirm' | 'alert';
    title: string;
    message: string;
    dialogType: 'info' | 'success' | 'warning' | 'error';
    confirmText?: string;
    cancelText?: string;
    resolve: ((value: boolean) => void) | null;
}

const state = reactive<DialogState>({
    isOpen: false,
    type: 'confirm',
    title: '',
    message: '',
    dialogType: 'info',
    resolve: null
});

export function useDialog() {
    const openConfirmDialog = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'warning', confirmText = '確認', cancelText = '取消'): Promise<boolean> => {
        state.type = 'confirm';
        state.title = title;
        state.message = message;
        state.dialogType = type;
        state.confirmText = confirmText;
        state.cancelText = cancelText;
        state.isOpen = true;

        return new Promise((resolve) => {
            state.resolve = resolve;
        });
    };

    const openDeleteDialog = (title: string, message: string): Promise<boolean> => {
        return openConfirmDialog(title, message, 'error', '刪除', '取消');
    };

    const openAlertDialog = (title: string, message: string, type: 'info' | 'success' | 'warning' = 'info'): Promise<void> => {
        state.type = 'alert';
        state.title = title;
        state.message = message;
        state.dialogType = type; // map 'info'|'success'|'warning' to 'info'|'success'|'warning'|'error' logic if needed, but AlertDialog supports subset
        state.isOpen = true;

        return new Promise((resolve) => {
            const oldResolve = state.resolve;
            state.resolve = (val) => {
                if (oldResolve) oldResolve(val);
                resolve();
            }
        });
    }

    const handleConfirm = () => {
        state.isOpen = false;
        if (state.resolve) {
            state.resolve(true);
            state.resolve = null;
        }
    };

    const handleCancel = () => {
        state.isOpen = false;
        if (state.resolve) {
            state.resolve(false);
            state.resolve = null;
        }
    };

    return {
        state,
        openConfirmDialog,
        openDeleteDialog,
        openAlertDialog,
        handleConfirm,
        handleCancel
    };
}
