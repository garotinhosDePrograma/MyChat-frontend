// Gerenciador de Temas (Light/Dark Mode)
const ThemeManager = {
    STORAGE_KEY: 'mychat_theme',
    THEMES: {
        LIGHT: 'light',
        DARK: 'dark'
    },

    // Inicializar tema
    init() {
        const savedTheme = this.getTheme();
        this.applyTheme(savedTheme);
        this.createToggleButton();
    },

    // Obter tema salvo ou detectar preferência do sistema
    getTheme() {
        const savedTheme = localStorage.getItem(this.STORAGE_KEY);
        
        if (savedTheme) {
            return savedTheme;
        }

        // Detectar preferência do sistema
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return this.THEMES.DARK;
        }

        return this.THEMES.LIGHT;
    },

    // Aplicar tema
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(this.STORAGE_KEY, theme);
        
        // Atualizar meta theme-color
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute(
                'content', 
                theme === this.THEMES.DARK ? '#18191a' : '#0084ff'
            );
        }

        // Dispatch event para outras partes da aplicação
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
    },

    // Alternar tema
    toggleTheme() {
        const currentTheme = this.getTheme();
        const newTheme = currentTheme === this.THEMES.LIGHT 
            ? this.THEMES.DARK 
            : this.THEMES.LIGHT;
        
        this.applyTheme(newTheme);
        
        // Animação suave
        document.body.style.transition = 'none';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 50);
    },

    // Criar botão de toggle (pode ser customizado)
    createToggleButton() {
        // Verificar se já existe
        if (document.getElementById('theme-toggle-btn')) {
            return;
        }

        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'theme-toggle-btn';
        toggleBtn.className = 'theme-toggle';
        toggleBtn.setAttribute('aria-label', 'Alternar tema');
        toggleBtn.title = 'Alternar tema claro/escuro';
        
        toggleBtn.addEventListener('click', () => this.toggleTheme());
        
        return toggleBtn;
    },

    // Adicionar toggle ao elemento específico
    addToggleTo(parentElement) {
        const toggleBtn = this.createToggleButton();
        if (toggleBtn && parentElement) {
            parentElement.appendChild(toggleBtn);
        }
    }
};

// Ouvir mudanças na preferência do sistema
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        // Só atualizar se o usuário não tiver preferência salva
        if (!localStorage.getItem(ThemeManager.STORAGE_KEY)) {
            ThemeManager.applyTheme(e.matches ? ThemeManager.THEMES.DARK : ThemeManager.THEMES.LIGHT);
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
} else {
    ThemeManager.init();
}
