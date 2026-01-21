# MyChat Frontend - Progressive Web App

Interface moderna de chat em tempo real com suporte offline e notificações push.

---

## 🚀 Tecnologias Utilizadas

### Core
- **HTML5** + **CSS3** + **Vanilla JavaScript**
- **Socket.IO Client** - WebSockets em tempo real
- **Service Worker** - Funcionalidade offline (PWA)
- **Web Push API** - Notificações nativas

### Features Modernas
- ✅ **Progressive Web App (PWA)** - Instalável
- ✅ **Dark Mode** - Tema claro/escuro automático
- ✅ **Responsive Design** - Mobile-first
- ✅ **Offline Support** - Cache de assets
- ✅ **Push Notifications** - Alertas em tempo real
- ✅ **Real-time Chat** - WebSockets bidirecionais

---

## 📁 Estrutura do Projeto

```
mychat-frontend/
├── index.html                      # Landing page
├── login.html                      # Página de login
├── register.html                   # Página de cadastro
├── dashboard.html                  # Interface do chat
├── manifest.json                   # PWA manifest
├── service-worker.js               # Service Worker (offline + push)
│
├── css/
│   ├── global.css                  # Estilos globais + variáveis CSS
│   ├── landing.css                 # Landing page
│   ├── auth.css                    # Login/Registro
│   └── dashboard.css               # Chat interface
│
├── js/
│   ├── config.js                   # Configurações da API
│   ├── storage.js                  # LocalStorage manager
│   ├── utils.js                    # Funções utilitárias
│   ├── api.js                      # Requisições HTTP
│   ├── auth.js                     # Lógica de login/registro
│   ├── theme.js                    # Dark mode toggle
│   ├── socket.js                   # SocketManager (WebSockets)
│   ├── notification.js             # NotificationManager (in-app)
│   ├── push-notification.js        # PushNotificationManager (Web Push)
│   ├── sw-register.js              # Registro do Service Worker
│   └── dashboard.js                # Lógica do chat
│
└── assets/
    ├── icons/
    │   ├── icon-192.png            # PWA icon (192x192)
    │   ├── icon-512.png            # PWA icon (512x512)
    │   ├── apple-touch-icon.png    # iOS icon
    │   └── favicon.ico             # Favicon
    └── screenshots/
        ├── mobile-1.png            # Screenshot mobile (540x720)
        └── desktop-1.png           # Screenshot desktop (1280x720)
```

---

## ⚙️ Configuração Inicial

### 1. Clonar o Repositório
```bash
git clone <seu-repositorio>
cd mychat-frontend
```

### 2. Configurar URL da API

Edite `js/config.js`:

```javascript
const CONFIG = {
    // Altere para a URL do seu backend
    API_URL: 'https://seu-backend.onrender.com',
    
    VERSION: '1.0.27',
    APP_NAME: 'MyChat',
    
    // ... resto das configurações
};
```

### 3. Criar Ícones PWA

Você precisa criar ícones PNG nos seguintes tamanhos:

- **192x192** → `assets/icons/icon-192.png`
- **512x512** → `assets/icons/icon-512.png`
- **180x180** → `assets/icons/apple-touch-icon.png`
- **favicon.ico** → `assets/icons/favicon.ico`

**Ferramentas recomendadas:**
- [Favicon Generator](https://www.favicon-generator.org/)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

### 4. Screenshots (Opcional)

Para melhor aparência na instalação do PWA:

- **Mobile:** 540x720px → `assets/screenshots/mobile-1.png`
- **Desktop:** 1280x720px → `assets/screenshots/desktop-1.png`

---

## 🏃 Executar Localmente

### Opção 1: Servidor Python
```bash
# Python 3
python -m http.server 8000

# Acesse: http://localhost:8000
```

### Opção 2: Live Server (VS Code)
```
1. Instale extensão "Live Server"
2. Clique direito em index.html
3. Selecione "Open with Live Server"
```

### Opção 3: Node.js (http-server)
```bash
npx http-server -p 8000
```

---

## 🚀 Deploy no Render

### Opção 1: Static Site (Recomendado)

1. **Criar Static Site no Render:**
   - Acesse [render.com](https://render.com)
   - New → Static Site
   - Conecte seu repositório GitHub

2. **Configurações:**
   - **Build Command:** (deixe vazio)
   - **Publish Directory:** `.` (raiz do projeto)
   - **Branch:** main

3. **Deploy Automático:**
   - Cada push no `main` faz deploy automático
   - URL gerada: `https://seu-app.onrender.com`

4. **Atualizar API_URL:**
   - Edite `js/config.js` com a URL do backend
   - Commit e push

### Opção 2: Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Opção 3: Netlify

```bash
# Instalar Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=.
```

---

## ✨ Funcionalidades Implementadas

### 🔐 Autenticação
- ✅ Registro de usuário com validação
- ✅ Login com JWT
- ✅ Armazenamento seguro de token
- ✅ Auto-logout ao expirar token
- ✅ Redirecionamento automático

### 💬 Chat em Tempo Real
- ✅ WebSocket bidirecionais (Socket.IO)
- ✅ Envio/recebimento de mensagens instantâneo
- ✅ Indicador de digitação ("Usuário está digitando...")
- ✅ Status online/offline
- ✅ Confirmação de entrega (✓✓)
- ✅ Scroll automático para mensagens novas
- ✅ Auto-resize do textarea

### 👥 Gerenciamento de Contatos
- ✅ Buscar usuários por nome/email
- ✅ Adicionar contatos
- ✅ Editar nome de contato
- ✅ Remover contatos
- ✅ Lista com última mensagem e timestamp
- ✅ Contador de mensagens não lidas

### 🔔 Notificações

#### In-App Notifications
- ✅ Toasts para ações (success/error/warning/info)
- ✅ Som de notificação customizável
- ✅ Notificações de novas mensagens

#### Push Notifications (Web Push)
- ✅ Solicitação de permissão
- ✅ Subscription via Service Worker
- ✅ Notificações mesmo com app fechado
- ✅ Clique abre conversa específica
- ✅ Suporte offline

### 🎨 Interface
- ✅ Design moderno e responsivo
- ✅ Dark mode / Light mode automático
- ✅ Animações suaves
- ✅ Skeleton loaders
- ✅ Empty states informativos
- ✅ Mobile-first design
- ✅ Avatares com iniciais coloridas

### 📱 PWA
- ✅ Instalável em desktop e mobile
- ✅ Funciona offline (cache de assets)
- ✅ Splash screen
- ✅ Manifest.json configurado
- ✅ Service Worker com cache estratégico

---

## 🎨 Personalização

### Cores (Theme Variables)

Edite `css/global.css`:

```css
:root {
    /* Light Theme */
    --primary-color: #0084ff;        /* Azul principal */
    --primary-dark: #0066cc;         /* Azul escuro */
    --accent-color: #7c3aed;         /* Roxo */
    --secondary-color: #f0f2f5;      /* Cinza claro */
    
    /* Text Colors */
    --text-primary: #050505;
    --text-secondary: #65676b;
    --text-light: #8a8d91;
    
    /* Background Colors */
    --bg-primary: #ffffff;
    --bg-secondary: #f8f9fa;
    --bg-tertiary: #e4e6eb;
    
    /* Status Colors */
    --success-color: #42b72a;        /* Verde */
    --danger-color: #e4163a;         /* Vermelho */
    --warning-color: #f7b928;        /* Amarelo */
    --info-color: #0084ff;           /* Azul */
}

/* Dark Theme */
[data-theme="dark"] {
    --primary-color: #4da3ff;
    --bg-primary: #18191a;
    --bg-secondary: #242526;
    --text-primary: #e4e6eb;
    /* ... */
}
```

### Logo

Substitua o emoji 💬 por:

```html
<!-- index.html, dashboard.html, etc. -->
<div class="logo">
    <img src="assets/logo.svg" alt="MyChat" />
    <h1>MyChat</h1>
</div>
```

### Fontes

Adicione fontes customizadas em `css/global.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}
```

---

## 🔧 Arquitetura Técnica

### WebSocket Flow

```
Cliente                    Servidor
  |                           |
  |------ connect() --------->|
  |<---- connected ---------- |
  |                           |
  |-- join_conversation ----->|
  |                           |
  |-- send_message ---------->|
  |<---- message_sent --------| (confirmação)
  |<---- new_message ---------| (broadcast)
  |                           |
  |-- typing_start ---------->|
  |<---- user_typing ---------| (para outros)
  |                           |
  |-- message_read ---------->|
  |<---- messages_read -------| (para remetente)
```

### Storage Strategy

```javascript
// LocalStorage
{
  "mychat_token": "eyJhbGc...",           // JWT token
  "mychat_user": {                        // User data
    "id": 1,
    "name": "João Silva",
    "email": "joao@example.com"
  },
  "notification_config": {                // Notification settings
    "soundEnabled": true
  },
  "mychat_theme": "dark"                  // Theme preference
}
```

### Service Worker Cache Strategy

```javascript
// Network First (API calls)
/api/* → Tenta rede → Fallback erro offline

// Cache First (Static assets)
*.html, *.css, *.js → Cache → Fallback rede

// Stale While Revalidate (Images)
*.png, *.jpg → Cache → Update em background
```

---

## 📊 Performance

### Lighthouse Scores (Objetivos)

- **Performance:** 90+
- **Accessibility:** 95+
- **Best Practices:** 90+
- **SEO:** 95+
- **PWA:** 100

### Otimizações Implementadas

- ✅ CSS minificado (em produção)
- ✅ Lazy loading de imagens
- ✅ Debounce em buscas
- ✅ Throttle em scroll events
- ✅ Connection pooling (WebSocket)
- ✅ Cache estratégico (Service Worker)
- ✅ Compressão Gzip (via CDN)

---

## 🐛 Troubleshooting

### Erro: "API URL inválida"
**Solução:** Verifique `js/config.js` e confirme que `API_URL` está correto.

### Erro: "CORS blocked"
**Solução:** No backend, adicione a URL do frontend em `FRONTEND_URL`.

### Push Notifications não funcionam
1. Verifique se HTTPS está habilitado (obrigatório)
2. Confirme que Service Worker foi registrado
3. Teste `/api/push/vapid-public-key` no backend
4. Veja logs do console

### Chat não atualiza em tempo real
1. Verifique conexão WebSocket no console
2. Confirme que backend está rodando
3. Teste endpoint `/health` do backend
4. Reinicie Service Worker

### Dark mode não salva
**Solução:** Verifique LocalStorage no DevTools (Application → Local Storage).

---

## 🔒 Segurança

### Implementações
- ✅ Escape de HTML (previne XSS)
- ✅ Token JWT em LocalStorage
- ✅ Validação de inputs
- ✅ HTTPS obrigatório em produção
- ✅ Content Security Policy (via headers)

### Recomendações Adicionais
- [ ] Implementar CAPTCHA no registro
- [ ] Rate limiting visual (feedback ao usuário)
- [ ] 2FA (autenticação em dois fatores)
- [ ] Criptografia end-to-end (E2EE)

---

## 🚧 Melhorias Futuras

### Planejadas
- [ ] Envio de imagens e arquivos
- [ ] Emojis picker
- [ ] Busca em mensagens
- [ ] Grupos de conversa
- [ ] Chamadas de voz/vídeo (WebRTC)
- [ ] Mensagens de voz
- [ ] Reações a mensagens (👍 ❤️ 😂)
- [ ] Editar/deletar mensagens
- [ ] Confirmação de leitura avançada
- [ ] Modo ghost (invisível)

### Em Consideração
- [ ] Stickers customizados
- [ ] Temas personalizados
- [ ] E2E encryption
- [ ] Backup de conversas
- [ ] Integração com Google Drive
- [ ] Modo apresentação (compartilhamento de tela)

---

## 📝 Comandos Úteis

### Debug no Console

```javascript
// Status do WebSocket
window.debugSocket();

// Status de notificações
window.debugNotificationState();

// Testar notificação
window.testNotification();

// Limpar cache
caches.keys().then(keys => keys.forEach(key => caches.delete(key)));

// Ver LocalStorage
console.log(localStorage);
```

### Service Worker

```javascript
// Ver Service Workers registrados
navigator.serviceWorker.getRegistrations().then(regs => console.log(regs));

// Desregistrar Service Worker
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister());
});
```

---

## 📞 Suporte

- **Email:** l8758711@gmail.com
- **Docs Backend:** Ver README do backend

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-feature`
3. Commit: `git commit -m 'Adiciona nova feature'`
4. Push: `git push origin feature/nova-feature`
5. Abra um Pull Request

---

## 📄 Licença

MIT License - Sinta-se livre para usar em projetos pessoais e comerciais.
