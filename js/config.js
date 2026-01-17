// Configurações da aplicação
const CONFIG = {
    // URL da API (altere para sua URL do Render)
    API_URL: 'https://mychat-backend-m7el.onrender.com',
    
    // Versão da aplicação
    VERSION: '1.0.12',
    
    // Nome da aplicação
    APP_NAME: 'MyChat',
    
    // Chaves de armazenamento local
    STORAGE_KEYS: {
        TOKEN: 'mychat_token',
        USER: 'mychat_user'
    },
    
    // Endpoints da API
    ENDPOINTS: {
        // Auth
        REGISTER: '/api/auth/register',
        LOGIN: '/api/auth/login',
        ME: '/api/auth/me',
        VERIFY: '/api/auth/verify',
        
        // Contacts
        CONTACTS: '/api/contacts',
        ADD_CONTACT: '/api/contacts/add',
        UPDATE_CONTACT: (id) => `/api/contacts/${id}`,
        DELETE_CONTACT: (id) => `/api/contacts/${id}`,
        SEARCH_USERS: '/api/contacts/search',
        
        // Messages
        SEND_MESSAGE: '/api/messages/send',
        GET_CONVERSATION: (userId) => `/api/messages/conversation/${userId}`,
        MARK_READ: (senderId) => `/api/messages/mark-read/${senderId}`,
        UNREAD: '/api/messages/unread',
        DELETE_MESSAGE: (id) => `/api/messages/${id}`,
        DELETE_CONVERSATION: (userId) => `/api/messages/conversation/${userId}`
    },
    
    // Configurações de mensagens
    MESSAGE_CONFIG: {
        MAX_LENGTH: 5000,
        FETCH_LIMIT: 50
    }
};

// Detecta se está em ambiente de desenvolvimento
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    CONFIG.API_URL = 'http://localhost:5000';
}
