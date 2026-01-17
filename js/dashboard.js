// Dashboard Logic - VERSÃO CORRIGIDA

// Estado global
const state = {
    currentUser: Storage.getUser(),
    contacts: [],
    selectedContact: null,
    messages: [],
    pendingMessages: new Map(),
    userMenuOpen: false
};

// Elementos DOM
const elements = {
    contactsList: document.getElementById('contacts-list'),
    chatMessages: document.getElementById('chat-messages'),
    chatInput: document.getElementById('chat-input'),
    chatForm: document.getElementById('chat-form'),
    userMenuBtn: document.getElementById('user-menu-btn'),
    userMenuDropdown: document.getElementById('user-menu-dropdown'),
    logoutBtn: document.getElementById('logout-btn'),
    addContactBtn: document.getElementById('add-contact-btn'),
    modal: document.getElementById('add-contact-modal'),
    closeModal: document.getElementById('close-modal'),
    searchInput: document.getElementById('search-input'),
    searchResults: document.getElementById('search-results'),
    chatArea: document.getElementById('chat-area'),
    emptyState: document.getElementById('empty-state')
};

// Variáveis globais para controle
let typingTimeout;
let eventListenersSetup = false;

(async function() {
    const isAuth = await Storage.requireAuth('index.html');

    if (!isAuth) {
        return;
    }

    state.currentUser = Storage.getUser();

    if (!state.currentUser) {
        console.error("Erro: Usuário não encontrado no Storage");
        Storage.clear();
        window.location.href = "index.html";
        return;
    }

    await init();
})();

// Inicialização
async function init() {
    setupEventListeners();
    await loadContacts();
    
    // CORRIGIDO: Verificar se socketManager existe
    const token = Storage.getToken();
    if (token && typeof socketManager !== 'undefined') {
        socketManager.connect(token);
        setupSocketHandlers();
    } else if (!socketManager) {
        console.warn('SocketManager não está disponível');
    }
}

// Configurar handlers do WebSocket - CORRIGIDO
function setupSocketHandlers() {
    if (typeof socketManager === 'undefined') {
        console.warn('SocketManager não disponível');
        return;
    }

    // Nova mensagem recebida
    socketManager.on('newMessage', (message) => {
        if (state.selectedContact && 
            (message.sender_id === state.selectedContact.contact_user_id ||
             message.receiver_id === state.selectedContact.contact_user_id)) {
            
            state.messages.push(message);
            renderMessages();
            Utils.scrollToBottom(elements.chatMessages);
            
            if (message.receiver_id === state.currentUser.id) {
                socketManager.markAsRead(message.sender_id);
            }
        }
        
        loadContacts();
    });

    // Notificação de mensagem
    socketManager.on('messageNotification', (data) => {
        Utils.showToast(`${data.from_user.name}: ${data.message.content.substring(0, 50)}`, 'info', 5000);
        loadContacts();
    });

    // Usuário digitando
    socketManager.on('userTyping', (data) => {
        if (state.selectedContact && data.user_id === state.selectedContact.contact_user_id) {
            showTypingIndicator(data.name);
        }
    });

    // Usuário parou de digitar
    socketManager.on('userStoppedTyping', (data) => {
        if (state.selectedContact && data.user_id === state.selectedContact.contact_user_id) {
            hideTypingIndicator();
        }
    });

    socketManager.on('userOnline', (data) => {
        updateContactStatus(data.user_id, true);
    });

    socketManager.on('userOffline', (data) => {
        updateContactStatus(data.user_id, false);
    });
}

// Event Listeners - CORRIGIDO: prevenir setup duplo
function setupEventListeners() {
    if (eventListenersSetup) return;
    eventListenersSetup = true;

    // Logout
    elements.logoutBtn?.addEventListener('click', handleLogout);
    
    // Menu do usuário
    elements.userMenuBtn?.addEventListener('click', toggleUserMenu);
    
    // Fechar menu ao clicar fora
    document.addEventListener('click', (e) => {
        if (state.userMenuOpen && !e.target.closest('.user-menu')) {
            closeUserMenu();
        }
    });
    
    // Enviar mensagem
    elements.chatForm?.addEventListener('submit', handleSendMessage);
    
    // Auto-resize do textarea + digitação
    elements.chatInput?.addEventListener('input', () => {
        autoResizeTextarea();
        handleTypingIndicator();
    });
    
    // Enter para enviar (Shift+Enter para quebra de linha)
    elements.chatInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            elements.chatForm?.requestSubmit();
        }
    });
    
    // Adicionar contato
    elements.addContactBtn?.addEventListener('click', openAddContactModal);
    elements.closeModal?.addEventListener('click', closeAddContactModal);
    
    // Fechar modal ao clicar fora
    elements.modal?.addEventListener('click', (e) => {
        if (e.target === elements.modal) {
            closeAddContactModal();
        }
    });
    
    // Buscar usuários (com debounce)
    elements.searchInput?.addEventListener('input', 
        Utils.debounce(handleSearchUsers, 500)
    );

    // Listener de resize para ajustes responsivos
    window.addEventListener('resize', Utils.debounce(() => {
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
        }
        
        if (elements.chatInput) {
            autoResizeTextarea();
        }
    }, 250));
}

// Carregar contatos
async function loadContacts() {
    try {
        const response = await API.getContacts();
        state.contacts = response.data.contacts;
        renderContacts();
    } catch (error) {
        console.error('Erro ao carregar contatos:', error);
    }
}

// Renderizar lista de contatos
function renderContacts() {
    if (!elements.contactsList) return;
    
    if (state.contacts.length === 0) {
        elements.contactsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">😊</div>
                <p>Sem conversas</p>
                <p class="text-muted">Adicione um contato para começar</p>
                <button class="btn btn-primary btn-sm add-contact-btn" id="add-contact-btn-empty">
                    Adicionar Contato
                </button>
            </div>
        `;
        
        document.getElementById('add-contact-btn-empty')?.addEventListener('click', openAddContactModal);
        return;
    }
    
    elements.contactsList.innerHTML = state.contacts.map(contact => `
        <div class="contact-item ${state.selectedContact?.contact_user_id === contact.contact_user_id ? 'active' : ''}" 
             data-contact-id="${contact.contact_user_id}">
            <div class="contact-avatar">
                ${getInitials(contact.contact_name || contact.user_name)}
            </div>
            <div class="contact-info">
                <div class="contact-name">
                    <span>${Utils.escapeHtml(contact.contact_name || contact.user_name)}</span>
                    ${contact.last_message_time ? `<span class="contact-time">${Utils.formatDate(contact.last_message_time)}</span>` : ''}
                </div>
                ${contact.last_message ? `
                    <div class="contact-last-message">
                        ${Utils.escapeHtml(Utils.truncateText(contact.last_message, 40))}
                    </div>
                ` : ''}
            </div>
            ${contact.unread_count > 0 ? `
                <span class="contact-badge">${contact.unread_count}</span>
            ` : ''}
        </div>
    `).join('');
    
    // Adicionar event listeners
    document.querySelectorAll('.contact-item').forEach(item => {
        item.addEventListener('click', () => {
            const contactId = parseInt(item.dataset.contactId);
            selectContact(contactId);
        });
    });
}

// Selecionar contato - CORRIGIDO
function selectContact(contactUserId) {
    const contact = state.contacts.find(c => c.contact_user_id === contactUserId);
    if (!contact) return;
    
    // Limpar timeout de digitação anterior
    if (typingTimeout) {
        clearTimeout(typingTimeout);
        typingTimeout = null;
    }
    
    // Parar indicador de digitação da conversa anterior
    if (state.selectedContact && typeof socketManager !== 'undefined') {
        socketManager.stopTyping(state.selectedContact.contact_user_id);
    }
    
    state.selectedContact = contact;
    renderContacts();
    loadConversation(contactUserId);
    
    // Entrar na sala da conversa
    if (typeof socketManager !== 'undefined' && socketManager.connected) {
        socketManager.joinConversation(contactUserId);
        socketManager.markAsRead(contactUserId);
    }
    
    // Mostrar chat area
    if (elements.chatArea) {
        elements.chatArea.style.display = 'flex';
    }
    if (elements.emptyState) {
        elements.emptyState.style.display = 'none';
    }
    
    // Atualizar header do chat
    const chatHeaderName = document.getElementById('chat-header-name');
    const chatHeaderAvatar = document.getElementById('chat-header-avatar');
    
    if (chatHeaderName) {
        chatHeaderName.textContent = contact.contact_name || contact.user_name;
    }
    
    if (chatHeaderAvatar) {
        chatHeaderAvatar.textContent = getInitials(contact.contact_name || contact.user_name);
    }
    
    // Em mobile, esconder sidebar
    if (window.innerWidth <= 768) {
        document.querySelector('.sidebar')?.classList.add('hidden');
    }
}

const conversationCache = new Map();

// Carregar conversa - CORRIGIDO
async function loadConversation(contactUserId) {
    try {
        const cached = conversationCache.get(contactUserId);
        if (cached) {
            state.messages = [...cached];
            renderMessages();
            setTimeout(() => {
                Utils.scrollToBottom(elements.chatMessages, 'auto');
            }, 50);
        } else {
            showMessagesLoading();
        }

        const response = await API.getConversation(contactUserId);
        const serverMessages = response.data.messages.reverse();

        conversationCache.set(contactUserId, serverMessages);
        state.messages = serverMessages;
        renderMessages();

        setTimeout(() => {
            if (elements.chatMessages) {
                elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
            }
        }, 100);
    } catch (erro) {
        console.error("Erro ao carregar conversas:", error);
        Utils.showToast("Erro ao carregar mensagens", "error");
    }
}

function showMessagesLoading() {
    if (!elements.chatMessages) return;

    const skeletons = Array(8).fill(0).map((_, i) => {
        const isSent = i % 2 === 0;
        return `
            <div class="message ${isSent ? 'sent': 'received'}">
                <div class="skeleton" style="
                    width: ${60 + Math.random() * 30}%;
                    height: 40px;
                    border-radius: 18px;
                "></div>
            </div>
        `;
    }).join('');

    elements.chatMessages.innerHTML = skeletons;
}

function updateContactListOnNewMessage(message) {
    const contactIndex = state.contacts.findIndex(
        c => c.contact_user_id === message.sender_id || 
             c.contact_user_id === message.receiver_id
    );
    
    if (contactIndex !== -1) {
        const contact = state.contacts[contactIndex];
        
        // Atualizar última mensagem
        contact.last_message = message.content;
        contact.last_message_time = message.created_at;
        
        // Mover para o topo
        state.contacts.splice(contactIndex, 1);
        state.contacts.unshift(contact);
        
        renderContacts();
    }
}

// Renderizar mensagens - CORRIGIDO
function renderMessages() {
    if (!elements.chatMessages) return;

    const wasAtButton = Utils.isScrolledToBottom(elements.chatMessages, 100);

    elements.chatMessages.innerHTML = state.messages.map(msg => {
        const isSent = msg.sender_id === state.currentUser.id;

        let statusIcon = '';
        if (isSent) {
            if (msg.status === 'sending') {
                statusIcon = '<span class="message-status sending">⏳</span>';
            } else if (msg.status === 'sent') {
                statusIcon = '<span class="message-status sent">✓</span>';
            } else if (msg.status === 'delivered') {
                statusIcon = '<span class="message-status delivered">✓✓</span>';
            } else if (msg.status === 'error') {
                statusIcon = '<span class="message-status error" title="Falha. Toque para reenviar.">(!)</span>';
            }
        }

        return `
            <div class="message ${isSent ? 'sent' : 'received'} ${msg.status || ''}"
                data-message-id="${msg.id}"
                ${msg.status === 'error' ? 'onclick="retryMessage(\'' + msg.id + '\')"' : ''}>
                <div class="message-bubble">
                    ${Utils.escapeHtml(msg.content)}
                </div>
                <div class="message-time">
                    ${Utils.formatDateTime(msg.created_at)}
                    ${statusIcon}
                </div>
            </div>
        `;
    }).join('');

    if (wasAtButton || state.messages.length <= 10) {
        setTimeout(() => {
            Utils.scrollToBottom(elements.chatMessages, 'auto');
        }, 50);
    }
}

async function retryMessage(messageId) {
    const message = state.messages.find(m => m.id === messageId);
    if (!message || message.status !== 'error') return;

    const index = state.messages.indexOf(message);
    if (index > -1) {
        state.messages.splice(index, 1);
    }

    elements.chatInput.value = message.content;
    await handleSendMessage({ preventDefault: () => {} });
}

// Enviar mensagem - CORRIGIDO
async function handleSendMessage(e) {
    e.preventDefault();

    if (!state.selectedContact) return;

    const content = elements.chatInput.value.trim();
    if (!content) return;

    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const optimisticMessage = {
        id: tempId,
        sender_id: state.currentUser.id,
        receiver_id: state.selectedContact.contact_user_id,
        content: content,
        is_read: false,
        created_at: new Date.toISOString(),
        status: 'sending',
        isOptimistic: true
    };

    state.message.push(optimisticMessage);
    state.pendingMessages.set(tempId, optimisticMessage);

    renderMessages();
    Utils.scrollToBottom(elements.chatMessages, 'auto');

    elements.chatInput.value = '';
    elements.chatInput.style.height = 'auto';
    elements.chatInput.disabled = false;
    elements.chatInput.focus();

    if (typeof socketManager !== 'undefined') {
        socketManager.stopTyping(state.selectedContact.contact_user_id);
    }

    try {
        let serverMessage = null;

        if (typeof socketManager !== 'undefined' && socketManager.connected) {
            serverMessage = await sendMessageViaWebSocket(
                state.selectedContact.contact_user_id,
                content,
                tempId
            );
        }

        if (!serverMessage) {
            const response = await API.sendMessage(
                state.selectedContact.contact_user_id,
                content
            );
            serverMessage = response.data.message;
        }

        const index = state.messages.findIndex(m => m.id === tempId);
        if (index !== -1) {
            state.messages[index] = {
                ...serverMessage,
                status: 'sent'
            };
            state.pendingMessages.delete(tempId);
            renderMessages();
        }
    } catch (error) {
        console.error("Erro ao enviar mensagem:", error);

        const index = state.messages.findIndex(m => m.id === tempId);
        if (index !== -1) {
            state.messages[index].status = 'error';
            renderMessages();
        }

        Utils.showToast("Erro ao enviar. Toque para reenviar.", "error", 5000);
    }
}

function sendMessageViaWebSocket(receiverId, content, tempId) {
    return new Promise((resolve, reject) => {
        if (!socketManager || !socketManager.connected) {
            reject(new Error('Web Socket não conectado'));
            return;
        }

        const timeout = setTimeout(() => {
            reject(new Error('timeout ao enviar mensagem'));
        }, 5000);

        const listener = (data) => {
            if (data.temp_id === tempId) {
                clearTimeout(timeout);
                socketManager.off('message_confirmed', listener);
                resolve(data.message);
            }
        };

        socketManager.on('message_confirmed', listener);

        socketManager.socket.emit('send_message', {
            receiver_id: receiverId,
            content: content,
            temp_id: tempId
        });
    });
}

// Auto-resize do textarea - CORRIGIDO
function autoResizeTextarea() {
    const textarea = elements.chatInput;
    if (!textarea) return;
    
    // Reset height para calcular corretamente
    textarea.style.height = 'auto';
    
    // Calcular nova altura
    const newHeight = Math.min(textarea.scrollHeight, 120);
    textarea.style.height = newHeight + 'px';
}

// Handler de indicador de digitação - CORRIGIDO
function handleTypingIndicator() {
    if (!state.selectedContact) return;
    if (typeof socketManager === 'undefined' || !socketManager.connected) return;
    
    const content = elements.chatInput.value.trim();
    
    if (content) {
        socketManager.startTyping(state.selectedContact.contact_user_id);
        
        // Auto-parar após 3 segundos
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            socketManager.stopTyping(state.selectedContact.contact_user_id);
        }, 3000);
    } else {
        // CORRIGIDO: Parar imediatamente se apagar tudo
        clearTimeout(typingTimeout);
        socketManager.stopTyping(state.selectedContact.contact_user_id);
    }
}

// Mostrar/esconder indicador de digitação
function showTypingIndicator(userName) {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.classList.remove('hidden');
    }
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.classList.add('hidden');
    }
}

// Atualizar status online/offline
function updateContactStatus(userId, isOnline) {
    const contactItem = document.querySelector(`[data-contact-id="${userId}"]`);
    if (contactItem) {
        if (isOnline) {
            contactItem.classList.add('online');
        } else {
            contactItem.classList.remove('online');
        }
    }
}

// Toggle user menu
function toggleUserMenu() {
    state.userMenuOpen = !state.userMenuOpen;
    if (elements.userMenuDropdown) {
        elements.userMenuDropdown.classList.toggle('hidden', !state.userMenuOpen);
    }
}

function closeUserMenu() {
    state.userMenuOpen = false;
    if (elements.userMenuDropdown) {
        elements.userMenuDropdown.classList.add('hidden');
    }
}

// Logout - CORRIGIDO
function handleLogout() {
    // Desconectar WebSocket
    if (typeof socketManager !== 'undefined') {
        socketManager.disconnect();
    }
    
    Storage.clear();
    window.location.href = 'index.html';
}

// Modal de adicionar contato - CORRIGIDO
function openAddContactModal() {
    if (elements.modal) {
        elements.modal.classList.remove('hidden');
        document.body.classList.add('modal-open');
        elements.searchInput.value = '';
        elements.searchResults.innerHTML = '';
        
        // Focus com delay para mobile
        setTimeout(() => {
            elements.searchInput.focus();
        }, 300);
    }
}

function closeAddContactModal() {
    if (elements.modal) {
        elements.modal.classList.add('hidden');
        document.body.classList.remove('modal-open');
    }
}

// Buscar usuários
async function handleSearchUsers(e) {
    const query = e.target.value.trim();
    
    if (query.length < 2) {
        elements.searchResults.innerHTML = '';
        return;
    }
    
    try {
        const response = await API.searchUsers(query);
        renderSearchResults(response.data.users);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        elements.searchResults.innerHTML = '<p class="text-muted text-center">Erro ao buscar</p>';
    }
}

// Renderizar resultados da busca
function renderSearchResults(users) {
    if (users.length === 0) {
        elements.searchResults.innerHTML = '<p class="text-muted text-center">Nenhum usuário encontrado</p>';
        return;
    }
    
    elements.searchResults.innerHTML = users.map(user => `
        <div class="search-result-item">
            <div class="search-result-info">
                <h4>${Utils.escapeHtml(user.name)}</h4>
                <p>${Utils.escapeHtml(user.email)}</p>
            </div>
            <button class="btn btn-primary btn-sm" onclick="addContact(${user.id}, '${Utils.escapeHtml(user.name).replace(/'/g, "\\'")}')">
                Adicionar
            </button>
        </div>
    `).join('');
}

// Adicionar contato
async function addContact(userId, name) {
    try {
        const tempId = `temp_${Date.now()}`;
        const optimisticContact = {
            contact_id: tempId,
            contact_user_id: userId,
            contact_name: name,
            user_name: name,
            user_email: '',
            last_message: null,
            last_message_time: null,
            unread_count: 0,
            isOptimistic: true
        };

        state.contacts.unshift(optimisticContact);
        renderContacts();

        const response = await API.addContact(userId, name);

        const index = state.contacts.findIndex(c => c.contact_id === tempId);
        if (index !== -1) {
            state.contacts[index] = {
                ...response.data.contact,
                contact_id: response.data.contact_id
            };
            renderContacts();
        }

        Utils.showToast("Contato adicionado!", "success");
        closeAddContactModal();
    } catch (error) {
        state.contacts = state.contacts.filter(c => c.contact_id !== tempId);
        renderContacts();

        console.error("Erro ao adicionar contato:", error);
        Utils.showToast(data.message || "Erro ao adicionar contato", "error");
    }
}

const statusStyles = `
<style>
.message-status {
    font-size: 12px;
    margin-left: 4px;
}

.message-status.sending {
    opacity: 0.6;
    animation: pulse 1.5s infinite;
}

.message-status.sent {
    color: var(--text-light);
}

.message-status.delivered {
    color: var(--primary-color);
}

.message-status.error {
    color: var(--danger-color);
    cursor: pointer;
    animation: shake 0.5s;
}

message.sending {
    opacity: 0.7;
}

.message.error {
    border-left: 3px solid var(--danger-color);
    cursor: pointer;
}

@keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
}
</style>
`;

if (!document.getElementById('message-status-styles')) {
    const style = document.createElement('style');
    style.id = 'message-status-styles';
    style.textContent = statusStyles;
    document.head.appendChild(style);
}

// Obter iniciais do nome
function getInitials(name) {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

// Fix para iOS Safari
if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    // Prevenir zoom no focus do input
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.style.fontSize = '16px';
        });
    });
    
    // Fix para teclado que cobre o input
    window.addEventListener('resize', () => {
        if (document.activeElement.tagName === 'INPUT' || 
            document.activeElement.tagName === 'TEXTAREA') {
            setTimeout(() => {
                document.activeElement.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }, 300);
        }
    });
}

// Iniciar aplicação
init();
