// js/push-notification.js - Web Push Manager (SEM Firebase)

class PushNotificationManager {
    constructor() {
        this.subscription = null;
        this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
        this.vapidPublicKey = null; // Será configurado no backend
    }

    async init() {
        if (!this.isSupported) {
            console.warn('⚠️ Push Notifications não suportadas neste navegador');
            return false;
        }

        try {
            // Aguardar Service Worker estar pronto
            const registration = await navigator.serviceWorker.ready;
            
            // Verificar se já existe subscription
            this.subscription = await registration.pushManager.getSubscription();
            
            if (this.subscription) {
                console.log('✅ Push subscription já existe');
                // Enviar para backend (pode ter expirado)
                await this.sendSubscriptionToBackend(this.subscription);
            }
            
            return true;
        } catch (error) {
            console.error('❌ Erro ao inicializar Push Manager:', error);
            return false;
        }
    }

    async requestPermission() {
        if (!this.isSupported) {
            throw new Error('Push Notifications não suportadas');
        }

        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            console.log('✅ Permissão de notificações concedida');
            await this.subscribe();
            return true;
        } else {
            console.log('❌ Permissão de notificações negada');
            return false;
        }
    }

    async subscribe() {
        try {
            const registration = await navigator.serviceWorker.ready;
            
            // Obter VAPID public key do backend
            const vapidKey = await this.getVapidPublicKey();
            
            // Converter VAPID key para Uint8Array
            const convertedVapidKey = this.urlBase64ToUint8Array(vapidKey);
            
            // Criar subscription
            this.subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });
            
            console.log('✅ Push subscription criada:', this.subscription);
            
            // Enviar para backend
            await this.sendSubscriptionToBackend(this.subscription);
            
            return this.subscription;
        } catch (error) {
            console.error('❌ Erro ao criar subscription:', error);
            throw error;
        }
    }

    async getVapidPublicKey() {
        try {
            // Requisitar chave VAPID do backend
            const response = await fetch(`${CONFIG.API_URL}/api/push/vapid-public-key`, {
                headers: {
                    'Authorization': `Bearer ${Storage.getToken()}`
                }
            });
            
            const data = await response.json();
            return data.data.publicKey;
        } catch (error) {
            console.error('❌ Erro ao obter VAPID key:', error);
            throw error;
        }
    }

    async sendSubscriptionToBackend(subscription) {
        try {
            const response = await fetch(`${CONFIG.API_URL}/api/push/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Storage.getToken()}`
                },
                body: JSON.stringify({
                    subscription: subscription.toJSON()
                })
            });
            
            if (!response.ok) {
                throw new Error('Erro ao enviar subscription');
            }
            
            console.log('✅ Subscription enviada para backend');
            return true;
        } catch (error) {
            console.error('❌ Erro ao enviar subscription:', error);
            return false;
        }
    }

    async unsubscribe() {
        if (!this.subscription) {
            console.warn('⚠️ Nenhuma subscription ativa');
            return false;
        }

        try {
            // Remover do backend
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
            
            // Remover localmente
            await this.subscription.unsubscribe();
            this.subscription = null;
            
            console.log('✅ Push subscription removida');
            return true;
        } catch (error) {
            console.error('❌ Erro ao remover subscription:', error);
            return false;
        }
    }

    // Converter VAPID key de base64 para Uint8Array
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    isSubscribed() {
        return this.subscription !== null;
    }

    getStatus() {
        return {
            isSupported: this.isSupported,
            isSubscribed: this.isSubscribed(),
            permission: Notification.permission,
            subscription: this.subscription ? {
                endpoint: this.subscription.endpoint,
                expirationTime: this.subscription.expirationTime
            } : null
        };
    }
}

// Instância global
const pushNotificationManager = new PushNotificationManager();

// Exportar
window.pushNotificationManager = pushNotificationManager;

// Auto-inicializar quando carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => pushNotificationManager.init());
} else {
    pushNotificationManager.init();
}
