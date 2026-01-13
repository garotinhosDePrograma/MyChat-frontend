// Gerenciamento de armazenamento local
const Storage = {
    // Salvar token
    setToken(token) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
    },
    
    // Obter token
    getToken() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    },
    
    // Remover token
    removeToken() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    },
    
    // Salvar dados do usuário
    setUser(user) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
    },
    
    // Obter dados do usuário
    getUser() {
        const user = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
        return user ? JSON.parse(user) : null;
    },
    
    // Remover dados do usuário
    removeUser() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    },
    
    // Verificar se está autenticado
    isAuthenticated() {
        return !!this.getToken();
    },
    
    // Limpar tudo (logout)
    clear() {
        this.removeToken();
        this.removeUser();
    }
};