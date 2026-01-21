// Notification Manager - VERSÃO COM DESIGN SYSTEM V2.0
class NotificationManager {
    constructor() {
        this.permission = 'default';
        this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
        this.enabled = false;
        this.soundEnabled = true;
        this.notificationSound = null;
        this.serviceWorkerReady = false;
        this.notificationsShown = [];

        this.init();
        this.injectStyles(); // ✅ NOVO: Injetar estilos do design system
    }

    // ✅ NOVO: Injetar estilos CSS seguindo o design system v2.0
    injectStyles() {
        if (document.getElementById('notification-manager-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'notification-manager-styles';
        styles.textContent = `
            /* ================================================================
               NOTIFICATION BANNER - Design System v2.0
               ================================================================ */
            
            .notification-banner {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: linear-gradient(135deg, var(--primary-400) 0%, var(--primary-600) 100%);
                color: white;
                padding: var(--space-4) var(--space-5);
                box-shadow: var(--shadow-lg);
                z-index: var(--z-fixed);
                animation: slideDownBanner 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            @keyframes slideDownBanner {
                from {
                    transform: translateY(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            
            .notification-banner-content {
                max-width: 75rem;
                margin: 0 auto;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--space-5);
                flex-wrap: wrap;
            }
            
            .notification-banner-content span {
                font-weight: var(--font-weight-medium);
                display: flex;
                align-items: center;
                gap: var(--space-3);
                font-size: var(--font-base);
            }
            
            .notification-banner-content div {
                display: flex;
                gap: var(--space-3);
            }
            
            .notification-banner .btn {
                padding: var(--space-2) var(--space-5);
                border: none;
                border-radius: var(--radius-lg);
                cursor: pointer;
                font-weight: var(--font-weight-semibold);
                font-size: var(--font-sm);
                transition: all var(--transition-fast);
                white-space: nowrap;
            }
            
            .notification-banner .btn-primary {
                background: white;
                color: var(--primary-500);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            }
            
            .notification-banner .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }
            
            .notification-banner .btn-secondary {
                background: rgba(255, 255, 255, 0.2);
                color: white;
                backdrop-filter: blur(10px);
            }
            
            .notification-banner .btn-secondary:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            /* Responsividade */
            @media (max-width: 768px) {
                .notification-banner {
                    padding: var(--space-3) var(--space-4);
                }
                
                .notification-banner-content {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: var(--space-3);
                }
                
                .notification-banner-content div {
                    width: 100%;
                    flex-direction: column;
                }
                
                .notification-banner .btn {
                    width: 100%;
                    justify-content: center;
                }
            }
            
            /* Dark mode adjustments */
            [data-theme="dark"] .notification-banner {
                background: linear-gradient(135deg, var(--primary-500) 0%, var(--primary-700) 100%);
            }
        `;
        
        document.head.appendChild(styles);
        console.log("✅ Estilos do Notification Manager injetados (Design System v2.0)");
    }

    async init() {
        if (!this.isSupported) {
            console.warn("⚠️ Notificações não suportadas neste navegador");
            return;
        }

        this.permission = Notification.permission;
        this.enabled = this.permission === 'granted';

        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.ready;
                this.serviceWorkerReady = true;
                console.log("✅ Service Worker pronto para notificações");
            } catch (error) {
                console.error("❌ Erro ao aguardar Service Worker:", error);
            }
        }

        const savedConfig = localStorage.getItem('notification_config');
        if (savedConfig) {
            try {
                const config = JSON.parse(savedConfig);
                this.soundEnabled = config.soundEnabled !== false;
            } catch (e) {
                console.error("Erro ao carregar config de notificações:", e);
            }
        }

        this.createSoundElement();

        console.log(`🔔 Notificações: ${this.enabled ? 'ATIVADAS ✅' : 'DESATIVADAS ❌'}`);
        console.log(`🔊 Som: ${this.soundEnabled ? 'ATIVADO ✅' : 'DESATIVADO ❌'}`);
        console.log(`⚙️ Service Worker: ${this.serviceWorkerReady ? 'PRONTO ✅' : 'NÃO PRONTO ❌'}`);
    }

    async requestPermission() {
        if (!this.isSupported) {
            throw new Error("Notificações não suportadas neste navegador");
        }

        if (this.permission === 'granted') {
            console.log("✅ Permissão já concedida anteriormente");
            return true;
        }

        if (this.permission === 'denied') {
            console.warn("⛔ Permissão de notificações foi negada anteriormente");
            alert("Você negou as notificações. Para ativá-las, acesse as configurações do navegador.");
            return false;
        }

        try {
            console.log("🔔 Solicitando permissão de notificações...");
            this.permission = await Notification.requestPermission();
            this.enabled = this.permission === 'granted';

            if (this.enabled) {
                console.log("✅ Permissão de notificações CONCEDIDA!");
                await this.showTestNotification();
                return true;
            } else {
                console.log("❌ Usuário negou a permissão");
                return false;
            }
        } catch (error) {
            console.error("❌ Erro ao solicitar permissão:", error);
            return false;
        }
    }

    createSoundElement() {
        this.notificationSound = new Audio();
        this.notificationSound.src = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiDcIF2m98OScTgwOUajk77RgGwU7k9nyw3ElBSl+zPLaizsKDlyx6OynUxQJQpzd8sFuHwU0iNDy04g2Bhltv/HgnE0MDU6m5O+zYBoGPJLY8sJ0JwUofcrx2Ys5CQ1bsufjpVIUB0CZ3fO/bR4ELobP8tmIPAcVbb/u45xNDA1OqOTusmAaBj2S2fHBcyYEKn7J8dmKOAkNW7Xn46VSFQZAmt3zv20eBiuFzvPaiTwHFWu/7uOcTQwNT6fk77NhGwU8k9nxwXMnBil9yfHajDgJDVux5uSlUhYGQJrd8r5sHgYugM/z2og7CBZrvuvjnE4MDlCo5e+zYRsGPJPa8sFtJwUpfM";
        this.notificationSound.volume = 0.5;
    }

    async showTestNotification() {
        if (!this.enabled) {
            console.warn("⚠️ Notificações não estão ativadas");
            return;
        }

        console.log("📢 Mostrando notificação de teste...");

        try {
            if (this.serviceWorkerReady) {
                const registration = await navigator.serviceWorker.ready;
                
                await registration.showNotification("✅ Notificações Ativadas!", {
                    body: "Você receberá notificações de novas mensagens",
                    icon: "/assets/icons/icon-192.png",
                    badge: "/assets/icons/icon-192.png",
                    tag: "test-notification",
                    requireInteraction: false,
                    silent: !this.soundEnabled,
                    timestamp: Date.now(),
                    data: {
                        type: 'test'
                    }
                });
                
                console.log("✅ Notificação de teste enviada via Service Worker!");
            } else {
                const notification = new Notification("✅ Notificações Ativadas!", {
                    body: "Você receberá notificações de novas mensagens",
                    icon: "/assets/icons/icon-192.png",
                    badge: "/assets/icons/icon-192.png",
                    tag: "test-notification",
                    requireInteraction: false,
                    silent: !this.soundEnabled,
                    timestamp: Date.now()
                });

                notification.onclick = () => {
                    window.focus();
                    notification.close();
                };

                setTimeout(() => notification.close(), 4000);
                
                console.log("✅ Notificação de teste enviada (fallback browser)!");
            }

            if (this.soundEnabled) {
                this.playSound();
            }
        } catch (error) {
            console.error("❌ Erro ao mostrar notificação:", error);
        }
    }

    async showMessageNotification(message, senderName, senderAvatar = null) {
        console.log("═══════════════════════════════════════════");
        console.log("🔔 showMessageNotification CHAMADO");
        console.log("═══════════════════════════════════════════");
        
        console.log("1️⃣ Notificações habilitadas?", this.enabled);
        if (!this.enabled) {
            console.error("❌ NOTIFICAÇÕES DESABILITADAS - Não enviando notificação");
            console.log("Permission:", this.permission);
            console.log("═══════════════════════════════════════════");
            return;
        }

        const isWindowFocused = document.hasFocus();
        console.log("2️⃣ Janela focada?", isWindowFocused);
        console.log("   document.hidden:", document.hidden);
        console.log("   document.visibilityState:", document.visibilityState);

        const currentState = window.state || {};
        const isChatOpen = currentState.selectedContact?.contact_user_id === message.sender_id;
        
        console.log("3️⃣ Chat aberto?", isChatOpen);
        console.log("   message.sender_id:", message.sender_id);
        console.log("   currentState.selectedContact:", currentState.selectedContact);
        console.log("   selectedContact?.contact_user_id:", currentState.selectedContact?.contact_user_id);

        const shouldSuppress = isWindowFocused && isChatOpen;
        console.log("4️⃣ Suprimir notificação?", shouldSuppress);

        console.log("✅ CONDIÇÕES ATENDIDAS - Mostrando notificação");

        const body = message.content.length > 100
            ? message.content.substring(0, 100) + '...'
            : message.content;
        
        const notificationData = {
            title: `💬 ${senderName}`,
            body: body,
            icon: senderAvatar || "/assets/icons/icon-192.png",
            badge: "/assets/icons/icon-192.png",
            tag: `message-${message.sender_id}`,
            timestamp: Date.now(),
            messageId: message.id,
            senderId: message.sender_id
        };

        console.log("5️⃣ Dados da notificação:", notificationData);

        try {
            if (this.serviceWorkerReady) {
                console.log("6️⃣ Usando Service Worker Registration");
                const registration = await navigator.serviceWorker.ready;
                
                await registration.showNotification(notificationData.title, {
                    body: notificationData.body,
                    icon: notificationData.icon,
                    badge: notificationData.badge,
                    tag: notificationData.tag,
                    requireInteraction: false,
                    silent: !this.soundEnabled,
                    timestamp: notificationData.timestamp,
                    data: {
                        messageId: notificationData.messageId,
                        senderId: notificationData.senderId,
                        conversationId: notificationData.senderId,
                        type: 'message'
                    }
                });
                
                console.log(`✅ NOTIFICAÇÃO ENVIADA VIA SERVICE WORKER`);
            } else {
                console.log("6️⃣ Usando Notification API (fallback)");
                const notification = new Notification(notificationData.title, {
                    body: notificationData.body,
                    icon: notificationData.icon,
                    badge: notificationData.badge,
                    tag: notificationData.tag,
                    requireInteraction: false,
                    silent: !this.soundEnabled,
                    timestamp: notificationData.timestamp,
                    data: {
                        messageId: notificationData.messageId,
                        senderId: notificationData.senderId,
                        conversationId: notificationData.senderId
                    }
                });

                notification.onclick = (event) => {
                    event.preventDefault();
                    console.log("🖱️ Notificação clicada - abrindo conversa");

                    window.focus();

                    if (typeof selectContact === 'function' && event.target.data.senderId) {
                        selectContact(event.target.data.senderId);
                    } else if (window.selectContact && event.target.data.senderId) {
                        window.selectContact(event.target.data.senderId);
                    }

                    notification.close();
                };

                setTimeout(() => notification.close(), 5000);
                
                console.log(`✅ NOTIFICAÇÃO ENVIADA VIA NOTIFICATION API`);
            }

            this.notificationsShown.push({
                time: new Date().toISOString(),
                sender: senderName,
                message: message.content.substring(0, 50),
                method: this.serviceWorkerReady ? 'ServiceWorker' : 'Notification API'
            });

            if (this.soundEnabled) {
                this.playSound();
            }

            console.log("═══════════════════════════════════════════");
        } catch (error) {
            console.error("❌ ERRO AO MOSTRAR NOTIFICAÇÃO:", error);
            console.log("═══════════════════════════════════════════");
        }
    }

    playSound() {
        if (!this.soundEnabled || !this.notificationSound) {
            console.log("🔇 Som desativado ou não disponível");
            return;
        }

        try {
            this.notificationSound.currentTime = 0;
            this.notificationSound.play()
                .then(() => console.log("🔊 Som reproduzido"))
                .catch(err => console.warn("⚠️ Não foi possível tocar som:", err));
        } catch (error) {
            console.error("❌ Erro ao tocar som:", error);
        }
    }

    toggleSound(enabled) {
        this.soundEnabled = enabled;
        this.saveConfig();
        console.log(`🔊 Som ${enabled ? 'ATIVADO' : 'DESATIVADO'}`);
    }

    async disable() {
        this.enabled = false;
        console.log("🔕 Notificações desativadas no app");
    }

    saveConfig() {
        try {
            localStorage.setItem('notification_config', JSON.stringify({
                soundEnabled: this.soundEnabled
            }));
        } catch (e) {
            console.error("Erro ao salvar config:", e);
        }
    }

    isEnabled() {
        return this.enabled;
    }

    getPermission() {
        return this.permission;
    }

    getStatus() {
        return {
            isSupported: this.isSupported,
            permission: this.permission,
            enabled: this.enabled,
            soundEnabled: this.soundEnabled,
            serviceWorkerReady: this.serviceWorkerReady,
            notificationsCount: this.notificationsShown.length
        };
    }

    getNotificationHistory() {
        return this.notificationsShown;
    }

    clearHistory() {
        this.notificationsShown = [];
        console.log("🗑️ Histórico de notificações limpo");
    }
}

// Instância global
const notificationManager = new NotificationManager();

// Expor no window para debug
window.notificationManager = notificationManager;

// Debug helpers
window.testNotification = async () => {
    console.log("🧪 Testando notificação...");
    console.log("Status:", notificationManager.getStatus());
    
    if (!notificationManager.isEnabled()) {
        console.error("❌ Notificações não estão ativadas!");
        const granted = await notificationManager.requestPermission();
        if (granted) {
            await notificationManager.showTestNotification();
        }
    } else {
        await notificationManager.showTestNotification();
    }
};

window.debugNotificationState = () => {
    console.log("═══════════════════════════════════════════");
    console.log("🔍 DEBUG DE ESTADO DE NOTIFICAÇÕES");
    console.log("═══════════════════════════════════════════");
    console.log("Status completo:", notificationManager.getStatus());
    console.log("window.state:", window.state);
    console.log("document.hasFocus():", document.hasFocus());
    console.log("document.hidden:", document.hidden);
    console.log("document.visibilityState:", document.visibilityState);
    console.log("Histórico de notificações:", notificationManager.getNotificationHistory());
    console.log("═══════════════════════════════════════════");
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
}
