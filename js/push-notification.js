// js/push-notification.js - Web Push Manager (SEM Firebase)

class PushNotificationManager {
    constructor() {
        this.subscription = null;
        this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    }

    async init() {
        if (!this.isSupported) return false;

        try {
            const registration = await navigator.serviceWorker.ready;
            this.subscription = await registration.pushManager.getSubscription();

            if (this.subscription) {
                await this.sendSubscriptionToBackend(this.subscription);
            }

            return true;
        } catch (error) {
            console.error('Erro ao inicializar Push Manager:', error);
            return false;
        }
    }

    async requestPermission() {
        if (!this.isSupported) {
            throw new Error('Push Notifications não suportadas');
        }

        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            await this.subscribe();
            return true;
        }

        return false;
    }

    async subscribe() {
        try {
            const registration = await navigator.serviceWorker.ready;

            // 🔑 Obter VAPID public key
            const vapidPublicKey = await this.getVapidPublicKey();

            if (!vapidPublicKey || typeof vapidPublicKey !== 'string') {
                throw new Error('VAPID key inválida');
            }

            const applicationServerKey =
                this.urlBase64ToUint8Array(vapidPublicKey);

            this.subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey
            });

            await this.sendSubscriptionToBackend(this.subscription);
            return this.subscription;

        } catch (error) {
            console.error('Erro ao criar subscription:', error);

            if (error.name === 'InvalidCharacterError') {
                console.error(
                    'A VAPID key não está em Base64URL válido (backend)'
                );
            }

            throw error;
        }
    }

    async getVapidPublicKey() {
        const response = await fetch(
            `${CONFIG.API_URL}/api/push/vapid-public-key`,
            {
                headers: {
                    'Authorization': `Bearer ${Storage.getToken()}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data?.data?.publicKey) {
            throw new Error('Resposta não contém publicKey');
        }

        return data.data.publicKey;
    }

    async sendSubscriptionToBackend(subscription) {
        const response = await fetch(
            `${CONFIG.API_URL}/api/push/subscribe`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Storage.getToken()}`
                },
                body: JSON.stringify({
                    subscription: subscription.toJSON()
                })
            }
        );

        if (!response.ok) {
            throw new Error('Erro ao enviar subscription');
        }

        return true;
    }

    async unsubscribe() {
        if (!this.subscription) return false;

        try {
            await fetch(`${CONFIG.API_URL}/api/push/unsubscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Storage.getToken()}`
                },
                body: JSON.stringify({
                    endpoint: this.subscription.endpoint
                })
            });

            await this.subscription.unsubscribe();
            this.subscription = null;
            return true;
        } catch (error) {
            console.error('Erro ao remover subscription:', error);
            return false;
        }
    }

    // 🔄 Conversão padrão recomendada (MDN)
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; i++) {
            outputArray[i] = rawData.charCodeAt(i);
        }

        return outputArray;
    }

    isSubscribed() {
        return this.subscription !== null;
    }
}

// Instância global
window.pushNotificationManager = new PushNotificationManager();

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener(
        'DOMContentLoaded',
        () => pushNotificationManager.init()
    );
} else {
    pushNotificationManager.init();
}
