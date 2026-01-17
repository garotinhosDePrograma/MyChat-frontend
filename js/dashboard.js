// Dashboard Logic - VERSÃO CORRIGIDA

// Estado global
const state = {
    currentUser: Storage.getUser(),
    contacts: [],
    selectedContact: null,
    messages: [],
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

// Carregar conversa - CORRIGIDO
async function loadConversation(contactUserId) {
    try {
        const response = await API.getConversation(contactUserId);
        state.messages = response.data.messages.reverse();
        renderMessages();
        
        // CORRIGIDO: Garantir scroll no fim
        setTimeout(() => {
            if (elements.chatMessages) {
                elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
            }
        }, 150);
        
    } catch (error) {
        console.error('Erro ao carregar conversa:', error);
        Utils.showToast('Erro ao carregar mensagens', 'error');
    }
}

// Renderizar mensagens - CORRIGIDO
function renderMessages() {
    if (!elements.chatMessages) return;
    
    // Verificar se estava no fim antes de renderizar
    const wasAtBottom = Utils.isScrolledToBottom(elements.chatMessages, 100);
    
    elements.chatMessages.innerHTML = state.messages.map(msg => {
        const isSent = msg.sender_id === state.currentUser.id;
        return `
            <div class="message ${isSent ? 'sent' : 'received'}">
                <div class="message-bubble">
                    ${Utils.escapeHtml(msg.content)}
                </div>
                <div class="message-time">
                    ${Utils.formatDateTime(msg.created_at)}
                </div>
            </div>
        `;
    }).join('');
    
    // CORRIGIDO: Só fazer scroll se estava no fim OU se for primeira carga
    if (wasAtBottom || state.messages.length <= 10) {
        setTimeout(() => {
            Utils.scrollToBottom(elements.chatMessages, 'auto');
        }, 100);
    }
}

// Enviar mensagem - CORRIGIDO
async function handleSendMessage(e) {
    e.preventDefault();
    
    if (!state.selectedContact) return;
    
    const content = elements.chatInput.value.trim();
    if (!content) return;
    
    // Desabilitar input
    elements.chatInput.disabled = true;
    
    try {
        // CORRIGIDO: Tentar enviar via WebSocket primeiro
        let sent = false;
        if (typeof socketManager !== 'undefined' && socketManager.connected) {
            sent = socketManager.sendMessage(state.selectedContact.contact_user_id, content);
        }
        
        // CORRIGIDO: Fallback para API REST se WebSocket falhar
        if (!sent) {
            await API.sendMessage(state.selectedContact.contact_user_id, content);
            await loadConversation(state.selectedContact.contact_user_id);
        }
        
        // Limpar input
        elements.chatInput.value = '';
        elements.chatInput.style.height = 'auto';
        
        // Parar indicador de digitação
        if (typeof socketManager !== 'undefined') {
            socketManager.stopTyping(state.selectedContact.contact_user_id);
        }
        
        // Limpar timeout
        if (typingTimeout) {
            clearTimeout(typingTimeout);
            typingTimeout = null;
        }
        
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        Utils.showToast('Erro ao enviar mensagem', 'error');
    } finally {
        elements.chatInput.disabled = false;
        elements.chatInput.focus();
    }
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
        await API.addContact(userId, name);
        Utils.showToast('Contato adicionado com sucesso!', 'success');
        closeAddContactModal();
        await loadContacts();
    } catch (error) {
        console.error('Erro ao adicionar contato:', error);
        Utils.showToast(error.message || 'Erro ao adicionar contato', 'error');
    }
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
