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
            console.warn("Notificações não suportadas nesse navegador");
            return;
        }

        this.permission = Notification.permission;
        this.enabled = this.permission === 'granted';

        const savedConfig = localStorage.getItem('notification_config');
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            this.soundEnabled = config.soundEnabled !== false;
        }

        this.createSoundElement();

        console.log(`Notificações: ${this.enabled ? 'ATIVADAS' : 'DESATIVADAS'}`);
    }

    async requestPermission() {
        if (!this.isSupported) {
            throw new Error("Notificações não suportadas");
        }

        if (this.permission === 'granted') {
            return true;
        }

        try {
            this.permission = await Notification.requestPermission();
            this.enabled = this.permission === 'granted';

            if (this.enabled) {
                console.log("Permissão de notificações concedida");

                this.showTestNotification();

                return true;
            } else {
                console.log("Usuário negou a permissão");
                return false;
            }
        } catch (error) {
            console.error("Erro ao solicitar permissão:", error);
            return false;
        }
    }

    createSoundElement() {
        this.notificationSound = new Audio();

        this.notificationSound.src = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiDcIF2m98OScTgwOUajk77RgGwU7k9nyw3ElBSl+zPLaizsKDlyx6OynUxQJQpzd8sFuHwU0iNDy04g2Bhltv/HgnE0MDU6m5O+zYBoGPJLY8sJ0JwUofcrx2Ys5CQ1bsufjpVIUB0CZ3fO/bR4ELobP8tmIPAcVbb/u45xNDA1OqOTusmAaBj2S2fHBcyYEKn7J8dmKOAkNW7Xn46VSFQZAmt3zv20eBiuFzvPaiTwHFWu/7uOcTQwNT6fk77NhGwU8k9nxwXMnBil9yfHajDgJDVux5uSlUhYGQJrd8r5sHgYugM/z2og7CBZrvuvjnE4MDlCo5e+zYRsGPJPa8sFtJwUpfM";
        this.notificationSound.volume = 0.5;
    }

    showTestNotification() {
        if (!this.enabled) return;

        const notification = new Notification("Notificações ativadas!", {
            body: "Você receberá notificações de novas mensagens",
            icon: "/assets/icons/favicon.ico",
            badge: "/assets/icons/favicon.ico",
            tag: "test-notification",
            requireInteraction: false,
            silent: !this.soundEnabled
        });

        if (this.soundEnabled) {
            this.playSound();
        }

        setTimeout(() => notification.close(), 3000);
    }

    showMessageNotification(message, senderName, senderAvatar = null) {
        if (!this.enabled) return;

        const isWindowFocused = document.hasFocus();
        const isChatOpen = window.state?.selectedContact?.contact_user_id === message.sender_id;

        if (isWindowFocused && isChatOpen) {
            console.log("Notificação suprimida (usuário está vendo a conversa)");
            return;
        }

        const body = message.content.length > 100
            ? message.content.substring(0, 100) + '...'
            : message.content;
        
        const notification = new Notification(senderName, {
            body: body,
            icon: senderAvatar || "default-avatar.png",
            badge: "assets/icons/favicon.ico",
            tag: `message-${message.id}`,
            requireInteraction: false,
            silent: !this.soundEnabled,
            data: {
                messageId: message.id,
                senderId: message.sender_id,
                conversationId: message.sender_id
            },
            actions: [
                {
                    action: 'reply',
                    title: 'Responder',
                    icon: '/img/replay-icon.png'
                },
                {
                    action: 'view',
                    title: 'Ver',
                    icon: '/img/view-icon.png'
                }
            ]
        });

        if (this.soundEnabled) {
            this.playSound();
        }

        notification.onclick = (event) => {
            event.preventDefault();

            window.focus();

            if (window.selectContact && event.target.data.senderId) {
                window.selectContact(event.target.data.senderId);
            }

            notification.close();
        };

        setTimeout(() => notification.close(), 5000);

        console.log("Notificação enviada:", senderName);
    }

    playSound() {
        if (!this.soundEnabled || !this.notificationSound) return;

        try {
            this.notificationSound.currentTime = 0;
            this.notificationSound.play().catch(err => {
                console.warn("Não foi possível tocar som:", err);
            });
        } catch (error) {
            console.error("Erro ao tocar som:", error);
        }
    }

    toggleSound(enabled) {
        this.soundEnabled = enabled;
        this.saveConfig();
    }

    async disable() {
        this.enabled = false;
        console.log("Notificações desativadas (no app).");
    }

    saveConfig() {
        localStorage.setItem('notification_config', JSON.stringify({
            soundEnabled: this.soundEnabled
        }));
    }

    isEnabled() {
        return this.enabled;
    }

    getPermission() {
        return this.permission;
    }
}

const notificationManager = new NotificationManager();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
}