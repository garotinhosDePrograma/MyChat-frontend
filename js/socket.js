class SocketManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.currentConversation = null;
        this.typingTimeout = null;
        this.eventHandlers = {};
    }

    connect(token) {
        if (this.socket && this.connected) {
            console.log("Já está conectado ao WebSocket");
            return;
        }

        this.socket = io(CONFIG.API_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.socket.on('connect', () => {
            console.log("Conectado ao WebSocket");
            this.connected = true;
            Utils.showToast("Conectado ao chat", "success", 2000);

            if (this.currentConversation) {
                this.joinConversation(this.currentConversation);
            }
        });

        this.socket.on('disconnect', () => {
            console.log("Desconectado do WebSocket");
            this.connected = false;
            Utils.showToast("Desconectado do servidor", "warning");
        });

        this.socket.on('connect_error', (error) => {
            console.error("Erro de conexão:", error);
            Utils.showToast("Erro ao conectar ao chat", "error");
        });

        this.socket.on('new_message', (data) => {
            console.log("Nova mensagem:", data);
            this.emit('newMessage', data);
        });

        this.socket.on('message_notification', (data) => {
            console.log("Notificação de mensagem:", data);
            this.emit("messageNotification", data);

            this.showBrowserNotification(data);
        });

        this.socket.on('user_typing', (data) => {
            console.log("Usuário digitando:", data);
            this.emit("userTyping", data);
        });

        this.socket.on('user_stopped_typing', (data) => {
            this.emit("userStoppedTyping", data);
        });

        this.socket.on('user_online', (data) => {
            console.log("Usuário online:", data);
            this.emit("userOnline", data);
        });

        this.socket.on('user_offline', (data) => {
            console.log("Usuário offline:", data);
            this.emit("userOffline", data);
        });

        this.socket.on('messages_read', (data) => {
            console.log("Mensagem lidas:", data);
            this.emit("messagesRead", data);
        });

        this.socket.on('error', (data) => {
            console.error("Erro no servidor:", data);
            Utils.showToast(data.message || "Erro no servidor", "error");
        });
    }

    joinConversation(contactUserId) {
        if (!this.connected) {
            console.warn("Não conectado ao WebSocket");
            return;
        }

        if (this.currentConversation && this.currentConversation !== contactUserId) {
            this.leaveConversation(this.currentConversation);
        }

        this.currentConversation = contactUserId;
        this.socket.emit('join_conversation', {
            contact_user_id: contactUserId
        });

        console.log(`Entrou na conversa com usuário ${contactUserId}`);
    }

    leaveConversation(contactUserId) {
        if (!this.connected) return;

        this.socket.emit('leave_conversation', {
            contact_user_id: contactUserId
        });

        if (this.currentConversation === contactUserId) {
            this.currentConversation = null;
        }

        console.log(`Saiu da conversa com usuário ${contactUserId}`);
    }

    sendMessage(receiverId, content) {
        if (!this.connected) {
            Utils.showToast('Não conectado. Tentando enviar...', 'warning');
            return false;
        }

        this.socket.emit('send_message', {
            receiver_id: receiverId,
            content: content
        });

        return true;
    }

    startTyping(contactUserId) {
        if (!this.connected) return;

        this.socket.emit('typing_start', {
            contact_user_id: contactUserId
        });
    }

    stopTyping(contactUserId) {
        if (!this.connected) return;

        this.socket.emit('typing_stop', {
            contact_user_id: contactUserId
        });
    }

    markAsRead(senderId) {
        if (!this.connected) return;

        this.socket.emit('message_read', {
            sender_id: senderId
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
            this.currentConversation = null;
        }
    }

    on(event, handler) {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
        }
        this.eventHandlers[event].push(handler);
    }

    off(event, handler) {
        if (!this.eventHandlers[event]) return;
        
        const index = this.eventHandlers[event].indexOf(handler);
        if (index > -1) {
            this.eventHandlers[event].splice(index, 1);
        }
    }

    emit(event, data) {
        if (!this.eventHandlers[event]) return;
        
        this.eventHandlers[event].forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error(`Erro no handler de ${event}:`, error);
            }
        });
    }

    async showBrowserNotification(data) {
        if (!('Notification' in window)) return;
        
        if (Notification.permission === 'granted') {
            new Notification(`${data.from_user.name} te enviou uma mensagem`, {
                body: data.message.content.substring(0, 100),
                icon: '/assets/icons/icon-192.png',
                badge: '/assets/icons/icon-192.png',
                tag: `message-${data.message.id}`,
                requireInteraction: false,
                vibrate: [200, 100, 200]
            });
        }
    }
}

const socketManager = new SocketManager();