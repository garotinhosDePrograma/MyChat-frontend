// Funções utilitárias - Versão 2.1 CORRIGIDA
const Utils = {
    // Mostrar toast/notificação com tipos - CORRIGIDO: aparece no topo
    showToast(message, type = 'success', duration = 3000) {
        // Remover toast anterior se existir
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type} fade-in`;
        
        // Ícones por tipo
        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };
        
        const icon = icons[type] || '';
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 18px; font-weight: bold;">${icon}</span>
                <span>${message}</span>
            </div>
        `;
        
        // CORRIGIDO: Adicionar no topo do body
        document.body.insertBefore(toast, document.body.firstChild);
        
        // Animação de saída
        setTimeout(() => {
            toast.style.animation = 'fadeOutTop 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
        
        // Fechar ao clicar
        toast.addEventListener('click', () => {
            toast.style.animation = 'fadeOutTop 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        });
    },
    
    // Formatar data relativa (ex: "há 5 min", "ontem")
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (seconds < 60) return 'Agora';
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        if (days === 1) return 'Ontem';
        if (days < 7) return `${days}d`;
        
        // Se for mais de 7 dias, mostrar data
        return date.toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit'
        });
    },
    
    // Formatar data completa com mais opções
    formatDateTime(dateString, options = {}) {
        const date = new Date(dateString);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();
        
        const timeFormat = {
            hour: '2-digit',
            minute: '2-digit'
        };
        
        if (isToday) {
            return date.toLocaleTimeString('pt-BR', timeFormat);
        }
        
        if (isYesterday) {
            return `Ontem ${date.toLocaleTimeString('pt-BR', timeFormat)}`;
        }
        
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
            ...timeFormat,
            ...options
        });
    },
    
    // Formatar apenas hora
    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    // Validar email com regex mais completo
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email.toLowerCase());
    },
    
    // Validar senha forte
    validatePassword(password) {
        const minLength = 6;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        let strength = 0;
        if (password.length >= minLength) strength++;
        if (password.length >= 8) strength++;
        if (hasUpperCase) strength++;
        if (hasLowerCase) strength++;
        if (hasNumbers) strength++;
        if (hasSpecialChar) strength++;
        
        return {
            valid: password.length >= minLength,
            strength: strength <= 2 ? 'weak' : strength <= 4 ? 'medium' : 'strong',
            score: strength
        };
    },
    
    // Mostrar loading em elemento
    showLoading(element, size = 'md') {
        const spinner = document.createElement('div');
        spinner.className = `spinner ${size === 'sm' ? 'spinner-sm' : ''}`;
        spinner.id = 'loading-spinner';
        element.appendChild(spinner);
    },
    
    // Esconder loading
    hideLoading() {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) spinner.remove();
    },
    
    // Truncar texto com opção de palavras completas
    truncateText(text, maxLength, useWords = false) {
        if (text.length <= maxLength) return text;
        
        if (useWords) {
            const truncated = text.substring(0, maxLength);
            const lastSpace = truncated.lastIndexOf(' ');
            return truncated.substring(0, lastSpace) + '...';
        }
        
        return text.substring(0, maxLength) + '...';
    },
    
    // Escapar HTML para prevenir XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // Parse de URLs em texto para links clicáveis
    linkify(text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, (url) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        });
    },
    
    // Criar elemento com classes e atributos
    createElement(tag, options = {}) {
        const element = document.createElement(tag);
        
        if (options.classes) {
            element.classList.add(...(Array.isArray(options.classes) ? options.classes : [options.classes]));
        }
        
        if (options.attributes) {
            Object.entries(options.attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
        }
        
        if (options.content) {
            element.textContent = options.content;
        }
        
        if (options.html) {
            element.innerHTML = options.html;
        }
        
        if (options.children) {
            options.children.forEach(child => element.appendChild(child));
        }
        
        return element;
    },
    
    // Debounce para otimizar eventos frequentes
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Throttle para limitar execuções
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // Scroll suave para elemento - CORRIGIDO
    scrollToBottom(element, behavior = 'smooth') {
        if (!element) return;
        
        // CORRIGIDO: Usar requestAnimationFrame para melhor performance
        requestAnimationFrame(() => {
            element.scrollTo({
                top: element.scrollHeight,
                behavior: behavior
            });
        });
    },
    
    // Verificar se está no bottom - CORRIGIDO
    isScrolledToBottom(element, threshold = 100) {
        if (!element) return false;
        
        // CORRIGIDO: Melhorar cálculo
        const scrollTop = element.scrollTop;
        const scrollHeight = element.scrollHeight;
        const clientHeight = element.clientHeight;
        
        return (scrollHeight - scrollTop - clientHeight) < threshold;
    },
    
    // Copiar texto para clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Copiado!', 'success', 1500);
            return true;
        } catch (err) {
            console.error('Erro ao copiar:', err);
            this.showToast('Erro ao copiar', 'error');
            return false;
        }
    },
    
    // Formatar número com separadores
    formatNumber(number) {
        return new Intl.NumberFormat('pt-BR').format(number);
    },
    
    // Gerar ID único
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },
    
    // Detectar dispositivo móvel
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    
    // Detectar dark mode do sistema
    prefersDarkMode() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    },
    
    // Vibrar dispositivo (se suportado)
    vibrate(pattern = 50) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    },
    
    // Confirmar ação com dialog nativo
    async confirm(message, title = 'Confirmar') {
        // Criar modal customizado
        return new Promise((resolve) => {
            const modal = this.createElement('div', {
                classes: 'modal',
                html: `
                    <div class="modal-content" style="max-width: 400px;">
                        <div class="modal-header">
                            <h3>${this.escapeHtml(title)}</h3>
                        </div>
                        <p style="margin: 20px 0;">${this.escapeHtml(message)}</p>
                        <div style="display: flex; gap: 12px; justify-content: flex-end;">
                            <button class="btn btn-secondary" id="confirm-cancel">Cancelar</button>
                            <button class="btn btn-primary" id="confirm-ok">Confirmar</button>
                        </div>
                    </div>
                `
            });
            
            document.body.appendChild(modal);
            
            modal.querySelector('#confirm-ok').addEventListener('click', () => {
                modal.remove();
                resolve(true);
            });
            
            modal.querySelector('#confirm-cancel').addEventListener('click', () => {
                modal.remove();
                resolve(false);
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve(false);
                }
            });
        });
    },
    
    // Skeleton loader
    createSkeleton(type = 'text', count = 1) {
        const skeletons = [];
        for (let i = 0; i < count; i++) {
            const skeleton = this.createElement('div', {
                classes: ['skeleton', `skeleton-${type}`]
            });
            skeletons.push(skeleton);
        }
        return count === 1 ? skeletons[0] : skeletons;
    },
    
    // Obter iniciais do nome
    getInitials(name) {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    },
    
    // Gerar cor aleatória consistente para avatar
    getColorFromString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const hue = hash % 360;
        return `hsl(${hue}, 65%, 55%)`;
    },
    
    // Formatar tamanho de arquivo
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    },
    
    // Detectar suporte a recursos
    supportsFeature(feature) {
        const features = {
            'notifications': 'Notification' in window,
            'serviceWorker': 'serviceWorker' in navigator,
            'clipboard': navigator.clipboard && navigator.clipboard.writeText,
            'vibrate': 'vibrate' in navigator,
            'share': navigator.share !== undefined
        };
        
        return features[feature] || false;
    },
    
    // Compartilhar (Web Share API)
    async share(data) {
        if (this.supportsFeature('share')) {
            try {
                await navigator.share(data);
                return true;
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Erro ao compartilhar:', err);
                }
                return false;
            }
        } else {
            this.showToast('Compartilhamento não suportado', 'error');
            return false;
        }
    }
};

// Polyfill para navegadores antigos
if (!Element.prototype.matches) {
    Element.prototype.matches = Element.prototype.msMatchesSelector || 
                                Element.prototype.webkitMatchesSelector;
}

if (!Element.prototype.closest) {
    Element.prototype.closest = function(s) {
        let el = this;
        do {
            if (el.matches(s)) return el;
            el = el.parentElement || el.parentNode;
        } while (el !== null && el.nodeType === 1);
        return null;
    };
}
