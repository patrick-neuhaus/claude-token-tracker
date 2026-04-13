// ==UserScript==
// @name         Claude Token Tracker
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Intercepta uso de tokens no claude.ai e envia para servidor local
// @match        https://claude.ai/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      localhost
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // =============================================
    // URL DO SERVIDOR LOCAL
    // =============================================
    const WEBHOOK_URL = 'http://localhost:3001/api/webhook/track-tokens';
    const WEBHOOK_TOKEN = ''; // Cole seu webhook token aqui (encontre em Settings > Webhook Token)
    // =============================================

    if (!WEBHOOK_TOKEN) {
        console.warn('[Token Tracker] Configure o WEBHOOK_TOKEN primeiro!');
        return;
    }

    let currentMessage = {
        model: null,
        input_tokens: 0,
        output_tokens: 0,
        cache_read_tokens: 0,
        cache_write_tokens: 0,
        session_id: null
    };

    function sendToSheet(data) {
        const payload = {
            timestamp: new Date().toISOString(),
            source: 'claude.ai',
            model: data.model,
            input_tokens: data.input_tokens,
            output_tokens: data.output_tokens,
            cache_read_tokens: data.cache_read_tokens || 0,
            cache_write_tokens: data.cache_write_tokens || 0,
            session_id: data.session_id || '',
            conversation_url: window.location.href
        };

        GM_xmlhttpRequest({
            method: 'POST',
            url: WEBHOOK_URL,
            data: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Token': WEBHOOK_TOKEN
            },
            onload: function(response) {
                console.log('[Token Tracker] Enviado:', payload.model,
                    '| in:', payload.input_tokens,
                    '| out:', payload.output_tokens);
            },
            onerror: function(error) {
                console.error('[Token Tracker] Erro ao enviar:', error);
            }
        });
    }

    function parseSSELine(line) {
        if (!line.startsWith('data: ')) return null;
        try {
            return JSON.parse(line.slice(6));
        } catch {
            return null;
        }
    }

    async function processStream(response) {
        try {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            currentMessage = {
                model: null,
                input_tokens: 0,
                output_tokens: 0,
                cache_read_tokens: 0,
                cache_write_tokens: 0,
                session_id: null
            };

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const data = parseSSELine(line);
                    if (!data) continue;

                    // message_start: model + input_tokens
                    if (data.type === 'message_start' && data.message) {
                        currentMessage.model = data.message.model;
                        currentMessage.session_id = data.message.id;
                        if (data.message.usage) {
                            currentMessage.input_tokens = data.message.usage.input_tokens || 0;
                            currentMessage.cache_read_tokens = data.message.usage.cache_read_input_tokens || 0;
                            currentMessage.cache_write_tokens = data.message.usage.cache_creation_input_tokens || 0;
                        }
                    }

                    // message_delta: output_tokens
                    if (data.type === 'message_delta' && data.usage) {
                        currentMessage.output_tokens = data.usage.output_tokens || 0;
                    }

                    // message_stop: fim da resposta
                    if (data.type === 'message_stop') {
                        if (currentMessage.model) {
                            sendToSheet(currentMessage);
                        }
                    }
                }
            }
        } catch (e) {
            console.log('[Token Tracker] Erro no stream:', e.message);
        }
    }

    // Intercepta fetch
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);

        try {
            const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';

            if (url.includes('/completion') ||
                url.includes('/chat_conversations') ||
                url.includes('/retry_completion')) {
                if (response.body) {
                    const cloned = response.clone();
                    processStream(cloned);
                }
            }
        } catch (e) {
            // Silenciosamente ignora erros
        }

        return response;
    };

    // Badge visual discreto
    function addBadge() {
        const style = document.createElement('style');
        style.textContent = `
            #token-tracker-badge {
                position: fixed;
                bottom: 8px;
                left: 8px;
                background: rgba(0,0,0,0.6);
                color: #4ade80;
                font-size: 11px;
                padding: 4px 8px;
                border-radius: 4px;
                z-index: 99999;
                font-family: monospace;
                pointer-events: none;
                opacity: 0.7;
            }
        `;
        document.head.appendChild(style);
        const badge = document.createElement('div');
        badge.id = 'token-tracker-badge';
        badge.textContent = 'Token Tracker ON';
        document.body.appendChild(badge);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addBadge);
    } else {
        addBadge();
    }

    console.log('[Token Tracker] Ativo - monitorando tokens no claude.ai');
})();
