// Service Worker para MyChat PWA
const CACHE_NAME = 'mychat-v1';
const OFFLINE_URL = '/index.html';

// Arquivos para cache
const FILES_TO_CACHE = [
    '/',
    '/index.html',
    '/login.html',
    '/register.html',
    '/dashboard.html',
    '/css/global.css',
    '/css/landing.css',
    '/css/auth.css',
    '/css/dashboard.css',
    '/js/config.js',
    '/js/storage.js',
    '/js/utils.js',
    '/js/api.js',
    '/js/auth.js',
    '/js/dashboard.js',
    '/manifest.json'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Instalando...');
    
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[ServiceWorker] Fazendo cache dos arquivos');
            return cache.addAll(FILES_TO_CACHE);
        })
    );
    
    self.skipWaiting();
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Ativando...');
    
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[ServiceWorker] Removendo cache antigo:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    
    self.clients.claim();
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
    // Ignorar requisições que não são GET
    if (event.request.method !== 'GET') return;
    
    // Ignorar requisições para a API (sempre buscar da rede)
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return new Response(
                    JSON.stringify({ 
                        success: false, 
                        message: 'Você está offline. Algumas funcionalidades podem não estar disponíveis.' 
                    }),
                    {
                        headers: { 'Content-Type': 'application/json' },
                        status: 503
                    }
                );
            })
        );
        return;
    }
    
    // Estratégia: Network First, fallback para Cache
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clonar a resposta
                const responseToCache = response.clone();
                
                // Atualizar o cache com a nova resposta
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                
                return response;
            })
            .catch(() => {
                // Se falhar, buscar do cache
                return caches.match(event.request).then((response) => {
                    if (response) {
                        return response;
                    }
                    
                    // Se não tiver no cache, retornar página offline
                    if (event.request.mode === 'navigate') {
                        return caches.match(OFFLINE_URL);
                    }
                    
                    return new Response('Conteúdo não disponível offline', {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                });
            })
    );
});

// Sincronização em background (para mensagens pendentes)
self.addEventListener('sync', (event) => {
    console.log('[ServiceWorker] Sincronização em background:', event.tag);
    
    if (event.tag === 'sync-messages') {
        event.waitUntil(syncMessages());
    }
});

async function syncMessages() {
    // Aqui você pode implementar lógica para enviar mensagens pendentes
    // quando a conexão for restaurada
    console.log('[ServiceWorker] Sincronizando mensagens pendentes...');
}

// Notificações Push (preparado para futuro)
self.addEventListener('push', (event) => {
    console.log('[ServiceWorker] Push recebido:', event);
    
    const options = {
        body: event.data ? event.data.text() : 'Nova mensagem no MyChat',
        icon: '/assets/icons/icon-192.png',
        badge: '/assets/icons/icon-192.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Ver mensagem'
            },
            {
                action: 'close',
                title: 'Fechar'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('MyChat', options)
    );
});

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
    console.log('[ServiceWorker] Clique na notificação:', event);
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/dashboard.html')
        );
    }
});