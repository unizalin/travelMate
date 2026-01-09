import QRCode from 'qrcode';

export const shareService = {
    /**
     * Generates a shareable URL for a trip
     */
    generateShareUrl(tripId: string): string {
        const baseUrl = window.location.origin;
        return `${baseUrl}/shared-trip/${tripId}`;
    },

    /**
     * Generates a QR code as a Data URL
     */
    async generateQrCode(url: string): Promise<string> {
        try {
            const qrDataUrl = await QRCode.toDataURL(url, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#2563eb', // blue-600
                    light: '#ffffff'
                }
            });
            return qrDataUrl;
        } catch (err) {
            console.error('Error generating QR code:', err);
            throw err;
        }
    },

    /**
     * Copies text to clipboard
     */
    async copyToClipboard(text: string): Promise<void> {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            throw err;
        }
    }
};
