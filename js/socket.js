// Socket Manager - VERSÃO CORRIGIDA
class SocketManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.currentConversation = null;
        this.typingTimeout = null;
        this.eventHandlers = {};
    }

    // Conectar ao servidor WebSocket
    connect(token) {
        if (this.socket && this.connected) {
            console.log('Já conectado ao WebSocket');
            return;
        }

        // CORRIGIDO: Verificar se io está disponível
        if (typeof io === 'undefined') {
            console.error('Socket.IO não está carregado!');
            if (typeof Utils !== 'undefined') {
                Utils.showToast('Erro ao conectar: Socket.IO não carregado', 'error');
            }
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

    // Configurar listeners de eventos
    setupEventListeners() {
        this.socket.on('connect', () => {
            console.log('✅ Conectado ao WebSocket');
            this.connected = true;
            
            // CORRIGIDO: Verificar se Utils existe
            if (typeof Utils !== 'undefined') {
                Utils.showToast('Conectado ao chat em tempo real', 'success', 2000);
            }
            
            // Se estava em uma conversa, reconectar
            if (this.currentConversation) {
                this.joinConversation(this.currentConversation);
            }
        });

        this.socket.on('disconnect', () => {
            console.log('🔌 Desconectado do WebSocket');
            this.connected = false;
            
            if (typeof Utils !== 'undefined') {
                Utils.showToast('Desconectado do servidor', 'warning');
            }
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ Erro de conexão:', error);
            
            if (typeof Utils !== 'undefined') {
                Utils.showToast('Erro ao conectar ao chat', 'error');
            }
        });

        // Nova mensagem recebida
        this.socket.on('new_message', (data) => {
            console.log('💬 Nova mensagem:', data);
            this.emit('newMessage', data);
        });

        // Notificação de mensagem (quando não está na conversa)
        this.socket.on('message_notification', (data) => {
            console.log('🔔 Notificação de mensagem:', data);
            this.emit('messageNotification', data);
            
            // Mostrar notificação do browser
            this.showBrowserNotification(data);
        });

        // Usuário começou a digitar
        this.socket.on('user_typing', (data) => {
            console.log('⌨️ Usuário digitando:', data);
            this.emit('userTyping', data);
        });

        // Usuário parou de digitar
        this.socket.on('user_stopped_typing', (data) => {
            this.emit('userStoppedTyping', data);
        });

        // Usuário ficou online
        this.socket.on('user_online', (data) => {
            console.log('🟢 Usuário online:', data);
            this.emit('userOnline', data);
        });

        // Usuário ficou offline
        this.socket.on('user_offline', (data) => {
            console.log('⚫ Usuário offline:', data);
            this.emit('userOffline', data);
        });

        // Mensagens foram lidas
        this.socket.on('messages_read', (data) => {
            console.log('✓✓ Mensagens lidas:', data);
            this.emit('messagesRead', data);
        });

        // Erro do servidor
        this.socket.on('error', (data) => {
            console.error('❌ Erro do servidor:', data);
            
            if (typeof Utils !== 'undefined') {
                Utils.showToast(data.message || 'Erro no servidor', 'error');
            }
        });
    }

    // Entrar em uma conversa
    joinConversation(contactUserId) {
        if (!this.connected) {
            console.warn('Não conectado ao WebSocket');
            return;
        }

        // Sair da conversa anterior
        if (this.currentConversation && this.currentConversation !== contactUserId) {
            this.leaveConversation(this.currentConversation);
        }

        this.currentConversation = contactUserId;
        this.socket.emit('join_conversation', { 
            contact_user_id: contactUserId 
        });

        console.log(`👥 Entrou na conversa com usuário ${contactUserId}`);
    }

    // Sair de uma conversa
    leaveConversation(contactUserId) {
        if (!this.connected) return;

        this.socket.emit('leave_conversation', { 
            contact_user_id: contactUserId 
        });

        if (this.currentConversation === contactUserId) {
            this.currentConversation = null;
        }

        console.log(`👥 Saiu da conversa com usuário ${contactUserId}`);
    }

    // Enviar mensagem
    sendMessage(receiverId, content) {
        if (!this.connected) {
            if (typeof Utils !== 'undefined') {
                Utils.showToast('Não conectado. Tentando enviar...', 'warning');
            }
            return false;
        }

        this.socket.emit('send_message', {
            receiver_id: receiverId,
            content: content
        });

        return true;
    }

    // Indicar que está digitando
    startTyping(contactUserId) {
        if (!this.connected) return;

        this.socket.emit('typing_start', {
            contact_user_id: contactUserId
        });
    }

    // Indicar que parou de digitar
    stopTyping(contactUserId) {
        if (!this.connected) return;

        this.socket.emit('typing_stop', {
            contact_user_id: contactUserId
        });
    }

    // Marcar mensagens como lidas
    markAsRead(senderId) {
        if (!this.connected) return;

        this.socket.emit('message_read', {
            sender_id: senderId
        });
    }

    // Desconectar
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
            this.currentConversation = null;
        }
    }

    // Sistema de eventos customizados
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

    // Mostrar notificação do navegador
    async showBrowserNotification(data) {
        if (!('Notification' in window)) return;
        
        if (Notification.permission === 'granted') {
            try {
                new Notification(`${data.from_user.name} te enviou uma mensagem`, {
                    body: data.message.content.substring(0, 100),
                    icon: '/assets/icons/icon-192.png',
                    badge: '/assets/icons/icon-192.png',
                    tag: `message-${data.message.id}`,
                    requireInteraction: false,
                    vibrate: [200, 100, 200]
                });
            } catch (error) {
                console.error('Erro ao mostrar notificação:', error);
            }
        }
    }
}

// Instância global
const socketManager = new SocketManager();
