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
        state.dialogType = type as any;
        state.isOpen = true;

        return new Promise((resolve) => {
            state.resolve = () => resolve();
        });
    }

    const handleConfirm = () => {
        const resolve = state.resolve;
        state.isOpen = false;
        state.resolve = null;
        if (resolve) resolve(true);
    };

    const handleCancel = () => {
        const resolve = state.resolve;
        state.isOpen = false;
        state.resolve = null;
        if (resolve) resolve(false);
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
