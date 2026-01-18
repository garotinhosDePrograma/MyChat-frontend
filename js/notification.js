// Notification Manager - VERSÃO CORRIGIDA
class NotificationManager {
    constructor() {
        this.permission = 'default';
        this.isSupported = 'Notification' in window;
        this.enabled = false;
        this.soundEnabled = true;
        this.notificationSound = null;

        this.init();
    }

    async init() {
        if (!this.isSupported) {
            console.warn("⚠️ Notificações não suportadas neste navegador");
            return;
        }

        this.permission = Notification.permission;
        this.enabled = this.permission === 'granted';

        // Carregar configurações salvas
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
                this.showTestNotification();
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
        // Som de notificação simples
        this.notificationSound = new Audio();
        this.notificationSound.src = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiDcIF2m98OScTgwOUajk77RgGwU7k9nyw3ElBSl+zPLaizsKDlyx6OynUxQJQpzd8sFuHwU0iNDy04g2Bhltv/HgnE0MDU6m5O+zYBoGPJLY8sJ0JwUofcrx2Ys5CQ1bsufjpVIUB0CZ3fO/bR4ELobP8tmIPAcVbb/u45xNDA1OqOTusmAaBj2S2fHBcyYEKn7J8dmKOAkNW7Xn46VSFQZAmt3zv20eBiuFzvPaiTwHFWu/7uOcTQwNT6fk77NhGwU8k9nxwXMnBil9yfHajDgJDVux5uSlUhYGQJrd8r5sHgYugM/z2og7CBZrvuvjnE4MDlCo5e+zYRsGPJPa8sFtJwUpfM";
        this.notificationSound.volume = 0.5;
    }

    showTestNotification() {
        if (!this.enabled) {
            console.warn("⚠️ Notificações não estão ativadas");
            return;
        }

        console.log("📢 Mostrando notificação de teste...");

        try {
            const notification = new Notification("✅ Notificações Ativadas!", {
                body: "Você receberá notificações de novas mensagens",
                icon: "/assets/icons/icon-192.png",
                badge: "/assets/icons/icon-192.png",
                tag: "test-notification",
                requireInteraction: false,
                silent: !this.soundEnabled,
                timestamp: Date.now()
            });

            if (this.soundEnabled) {
                this.playSound();
            }

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            setTimeout(() => notification.close(), 4000);
            
            console.log("✅ Notificação de teste enviada!");
        } catch (error) {
            console.error("❌ Erro ao mostrar notificação:", error);
        }
    }

    showMessageNotification(message, senderName, senderAvatar = null) {
        if (!this.enabled) {
            console.log("⚠️ Notificações desativadas - não enviando notificação");
            return;
        }

        // CORRIGIDO: Verificação mais robusta de janela focada
        const isWindowFocused = document.hasFocus();
        const currentState = window.state || {};
        const isChatOpen = currentState.selectedContact?.contact_user_id === message.sender_id;

        console.log("📊 Estado da janela:", {
            isWindowFocused,
            isChatOpen,
            senderId: message.sender_id,
            currentContactId: currentState.selectedContact?.contact_user_id
        });

        // Se o usuário está vendo a conversa, NÃO mostrar notificação
        if (isWindowFocused && isChatOpen) {
            console.log("👁️ Usuário está vendo a conversa - notificação suprimida");
            return;
        }

        console.log("📢 Mostrando notificação de mensagem...");

        const body = message.content.length > 100
            ? message.content.substring(0, 100) + '...'
            : message.content;
        
        try {
            const notification = new Notification(`💬 ${senderName}`, {
                body: body,
                icon: senderAvatar || "/assets/icons/icon-192.png",
                badge: "/assets/icons/icon-192.png",
                tag: `message-${message.sender_id}`, // Agrupa notificações do mesmo remetente
                requireInteraction: false,
                silent: !this.soundEnabled,
                timestamp: Date.now(),
                data: {
                    messageId: message.id,
                    senderId: message.sender_id,
                    conversationId: message.sender_id
                }
            });

            if (this.soundEnabled) {
                this.playSound();
            }

            notification.onclick = (event) => {
                event.preventDefault();
                console.log("🖱️ Notificação clicada - abrindo conversa");

                window.focus();

                // Selecionar o contato se a função existir
                if (typeof selectContact === 'function' && event.target.data.senderId) {
                    selectContact(event.target.data.senderId);
                } else if (window.selectContact && event.target.data.senderId) {
                    window.selectContact(event.target.data.senderId);
                }

                notification.close();
            };

            // Auto-fechar após 5 segundos
            setTimeout(() => notification.close(), 5000);

            console.log(`✅ Notificação enviada para: ${senderName}`);
        } catch (error) {
            console.error("❌ Erro ao mostrar notificação:", error);
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

    // Método para debug
    getStatus() {
        return {
            isSupported: this.isSupported,
            permission: this.permission,
            enabled: this.enabled,
            soundEnabled: this.soundEnabled
        };
    }
}

// Instância global
const notificationManager = new NotificationManager();

// Expor no window para debug
window.notificationManager = notificationManager;

// Debug helper
window.testNotification = () => {
    console.log("🧪 Testando notificação...");
    console.log("Status:", notificationManager.getStatus());
    
    if (!notificationManager.isEnabled()) {
        console.error("❌ Notificações não estão ativadas!");
        notificationManager.requestPermission().then(() => {
            notificationManager.showTestNotification();
        });
    } else {
        notificationManager.showTestNotification();
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
}
