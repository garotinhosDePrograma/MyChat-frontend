// js/push-notification.js - Web Push Manager (SEM Firebase)

class PushNotificationManager {
    constructor() {
        this.subscription = null;
        this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
        this.vapidPublicKey = null;
    }

    async init() {
        if (!this.isSupported) {
            console.warn('⚠️ Push Notifications não suportadas neste navegador');
            return false;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            this.subscription = await registration.pushManager.getSubscription();
            
            if (this.subscription) {
                console.log('✅ Push subscription já existe');
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
            console.log('📡 Obtendo VAPID key do backend...');
            const vapidKey = await this.getVapidPublicKey();
            
            console.log('🔑 VAPID key recebida:', vapidKey);
            console.log('📏 Tamanho da chave:', vapidKey?.length);
            console.log('🔤 Tipo:', typeof vapidKey);
            
            // ✅ VALIDAÇÃO ADICIONAL
            if (!vapidKey || typeof vapidKey !== 'string') {
                throw new Error('VAPID key inválida: não é uma string');
            }
            
            if (vapidKey.length < 60) {
                throw new Error(`VAPID key muito curta: ${vapidKey.length} caracteres`);
            }
            
            // Verificar se contém apenas caracteres base64url válidos
            if (!/^[A-Za-z0-9_-]+$/.test(vapidKey)) {
                throw new Error('VAPID key contém caracteres inválidos');
            }
            
            // Converter VAPID key para Uint8Array
            console.log('🔄 Convertendo VAPID key...');
            const convertedVapidKey = this.urlBase64ToUint8Array(vapidKey);
            console.log('✅ VAPID key convertida:', convertedVapidKey);
            
            // Criar subscription
            console.log('📝 Criando push subscription...');
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
            
            // ✅ MENSAGEM DE ERRO MAIS CLARA
            if (error.name === 'InvalidCharacterError') {
                console.error('🔴 A VAPID key do backend está em formato inválido!');
                console.error('💡 O backend precisa retornar a chave em formato base64url');
            }
            
            throw error;
        }
    }

    async getVapidPublicKey() {
        try {
            const url = `${CONFIG.API_URL}/api/push/vapid-public-key`;
            console.log('📡 Requisitando VAPID key de:', url);
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${Storage.getToken()}`
                }
            });
            
            console.log('📥 Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Erro na resposta:', errorText);
                throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            console.log('📦 Dados recebidos:', data);
            
            // ✅ VALIDAR ESTRUTURA DA RESPOSTA
            if (!data || !data.data || !data.data.publicKey) {
                console.error('🔴 Estrutura de resposta inválida:', data);
                throw new Error('Resposta do servidor não contém publicKey');
            }
            
            const publicKey = data.data.publicKey;
            
            // ✅ LOG DETALHADO
            console.log('✅ Public Key extraída:', publicKey);
            console.log('   Comprimento:', publicKey.length);
            console.log('   Primeiros 20 chars:', publicKey.substring(0, 20));
            console.log('   Últimos 20 chars:', publicKey.substring(publicKey.length - 20));
            
            return publicKey;
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
                const errorText = await response.text();
                throw new Error(`Erro ao enviar subscription: ${errorText}`);
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
            
            console.log('✅ Push subscription removida');
            return true;
        } catch (error) {
            console.error('❌ Erro ao remover subscription:', error);
            return false;
        }
    }

    // ✅ VERSÃO MELHORADA com mais logs
    urlBase64ToUint8Array(base64String) {
        try {
            console.log('🔄 Convertendo base64url para Uint8Array...');
            console.log('   Input:', base64String);
            console.log('   Tamanho:', base64String.length);
            
            // Adicionar padding se necessário
            const padding = '='.repeat((4 - base64String.length % 4) % 4);
            console.log('   Padding adicionado:', padding);
            
            // Substituir caracteres base64url por base64 padrão
            const base64 = (base64String + padding)
                .replace(/\-/g, '+')
                .replace(/_/g, '/');
            
            console.log('   Base64 padrão:', base64);
            
            // Decodificar
            const rawData = window.atob(base64);
            console.log('   Dados decodificados, tamanho:', rawData.length);
            
            // Converter para Uint8Array
            const outputArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; ++i) {
                outputArray[i] = rawData.charCodeAt(i);
            }
            
            console.log('✅ Conversão concluída, array size:', outputArray.length);
            return outputArray;
        } catch (error) {
            console.error('❌ Erro na conversão base64url:', error);
            console.error('   String problemática:', base64String);
            throw error;
        }
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
