/**
 * Scrum Agent Dashboard - Frontend JavaScript
 * SSE (Server-Sent Events) ile real-time takip
 */

// ============================================
// STATE
// ============================================

let isRunning = false;
let eventSource = null;
let messageCount = 0;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    loadTeam();
    loadLogs();
    
    // Enter ile gönder
    document.getElementById('taskInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            startTask();
        }
    });
});

// ============================================
// TEAM LOADING
// ============================================

async function loadTeam() {
    try {
        const response = await fetch('/api/agents');
        const data = await response.json();
        
        const container = document.getElementById('teamAvatars');
        container.innerHTML = data.agents.map(agent => `
            <div class="team-avatar" data-name="${agent.name} - ${agent.title}" title="${agent.name}">
                ${agent.emoji}
            </div>
        `).join('');
    } catch (error) {
        console.error('Takım yüklenemedi:', error);
    }
}

// ============================================
// TASK EXECUTION
// ============================================

async function startTask() {
    const taskInput = document.getElementById('taskInput');
    const contextInput = document.getElementById('contextInput');
    const errorReportInput = document.getElementById('errorReportInput');
    const startBtn = document.getElementById('startBtn');

    const question = taskInput.value.trim();
    if (!question) {
        alert('Lütfen bir görev/soru yazın!');
        return;
    }

    if (isRunning) {
        alert('Bir görev zaten çalışıyor!');
        return;
    }

    // Error raporunu context'e ekle
    let context = contextInput.value.trim();
    const errorReport = errorReportInput ? errorReportInput.value.trim() : '';

    if (errorReport) {
        context += `\n\n## CONSOLE HATA RAPORU (Kullanıcıdan)\n\`\`\`\n${errorReport}\n\`\`\`\n\nBu hataları düzelt.`;
    }

    // UI hazırla
    isRunning = true;
    startBtn.disabled = true;
    startBtn.textContent = '⏳ Çalışıyor...';
    messageCount = 0;

    showSection('progressSection');
    showSection('chatSection');
    showSection('statsSection');

    clearMessages();
    resetPhases();

    // SSE bağlantısı kur
    try {
        const response = await fetch('/api/task/run', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question: question,
                context: context
            })
        });
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const text = decoder.decode(value);
            const lines = text.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.slice(6);
                    if (jsonStr.trim()) {
                        try {
                            const event = JSON.parse(jsonStr);
                            handleEvent(event);
                        } catch (e) {
                            console.error('JSON parse error:', e);
                        }
                    }
                }
            }
        }
        
    } catch (error) {
        console.error('Hata:', error);
        addErrorMessage('Bağlantı hatası: ' + error.message);
    } finally {
        isRunning = false;
        startBtn.disabled = false;
        startBtn.textContent = '🚀 Görevi Başlat';
    }
}

// ============================================
// EVENT HANDLING
// ============================================

function handleEvent(event) {
    console.log('Event:', event.type, event);
    
    switch (event.type) {
        case 'start':
            console.log('Task başladı:', event.task_id);
            break;
            
        case 'phase':
            handlePhase(event);
            break;
            
        case 'agent_start':
            showTypingIndicator(event.agent, event.emoji);
            break;
            
        case 'agent_response':
            removeTypingIndicator();
            addMessage(event);
            messageCount++;
            updateStats({ messages: messageCount });
            break;
            
        case 'complete':
            handleComplete(event);
            break;
            
        case 'error':
            addErrorMessage(event.message);
            break;
            
        case 'log_saved':
            console.log('Log kaydedildi:', event.path);
            loadLogs();
            break;
    }
}

function handlePhase(event) {
    const phaseEl = document.querySelector(`.phase[data-phase="${event.phase}"]`);
    if (!phaseEl) return;
    
    if (event.status === 'started') {
        // Önceki active'leri kaldır
        document.querySelectorAll('.phase.active').forEach(el => {
            el.classList.remove('active');
        });
        
        phaseEl.classList.add('active');
        phaseEl.querySelector('.phase-status').textContent = '🔄';
        
        updateProgress(event.phase);
    } else if (event.status === 'completed') {
        phaseEl.classList.remove('active');
        phaseEl.classList.add('completed');
        phaseEl.querySelector('.phase-status').textContent = '✅';
    }
}

function handleComplete(event) {
    console.log('Tamamlandı:', event);
    
    // İstatistikleri güncelle
    if (event.stats) {
        updateStats({
            calls: event.stats.total_calls,
            tokens: event.stats.total_tokens,
            cost: event.stats.estimated_cost_usd,
            messages: event.message_count
        });
    }
    
    // Progress bar'ı tamamla
    document.getElementById('progressFill').style.width = '100%';
    
    // Tamamlandı mesajı
    addSystemMessage('✅ Görev tamamlandı!');
}

// ============================================
// UI UPDATES
// ============================================

function showSection(sectionId) {
    document.getElementById(sectionId).style.display = 'block';
}

function hideSection(sectionId) {
    document.getElementById(sectionId).style.display = 'none';
}

function clearMessages() {
    document.getElementById('chatMessages').innerHTML = '';
}

function resetPhases() {
    document.querySelectorAll('.phase').forEach(el => {
        el.classList.remove('active', 'completed');
        el.querySelector('.phase-status').textContent = '⏳';
    });
    document.getElementById('progressFill').style.width = '0%';
}

function updateProgress(phase) {
    const phases = ['analysis', 'discussion', 'development', 'testing', 'summary'];
    const index = phases.indexOf(phase);
    const progress = ((index + 1) / phases.length) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;
}

function updateStats(stats) {
    if (stats.calls !== undefined) {
        document.getElementById('statCalls').textContent = stats.calls;
    }
    if (stats.tokens !== undefined) {
        document.getElementById('statTokens').textContent = formatNumber(stats.tokens);
    }
    if (stats.cost !== undefined) {
        document.getElementById('statCost').textContent = '$' + stats.cost.toFixed(4);
    }
    if (stats.messages !== undefined) {
        document.getElementById('statMessages').textContent = stats.messages;
    }
}

function formatNumber(num) {
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num;
}

// ============================================
// MESSAGES
// ============================================

function addMessage(event) {
    const container = document.getElementById('chatMessages');
    
    const messageEl = document.createElement('div');
    messageEl.className = 'message';
    
    const phaseLabels = {
        'analysis': '📋 Analiz',
        'discussion': '💬 Tartışma',
        'development': '💻 Geliştirme',
        'testing': '🧪 Test',
        'summary': '📊 Sonuç'
    };
    
    messageEl.innerHTML = `
        <div class="message-header">
            <div class="message-avatar">${event.emoji}</div>
            <div class="message-info">
                <div class="message-name">${event.agent}</div>
                <div class="message-title">${getAgentTitle(event.agent)}</div>
            </div>
            <span class="message-phase">${phaseLabels[event.phase] || event.phase}</span>
        </div>
        <div class="message-content">${formatContent(event.content)}</div>
    `;
    
    container.appendChild(messageEl);
    container.scrollTop = container.scrollHeight;
}

function addSystemMessage(text) {
    const container = document.getElementById('chatMessages');
    
    const messageEl = document.createElement('div');
    messageEl.className = 'message';
    messageEl.innerHTML = `
        <div class="message-content" style="margin-left: 0; text-align: center; background: var(--success); color: white;">
            ${text}
        </div>
    `;
    
    container.appendChild(messageEl);
    container.scrollTop = container.scrollHeight;
}

function addErrorMessage(text) {
    const container = document.getElementById('chatMessages');
    
    const messageEl = document.createElement('div');
    messageEl.className = 'message';
    messageEl.innerHTML = `
        <div class="message-content" style="margin-left: 0; background: var(--danger); color: white;">
            ❌ Hata: ${text}
        </div>
    `;
    
    container.appendChild(messageEl);
    container.scrollTop = container.scrollHeight;
}

function showTypingIndicator(agent, emoji) {
    const container = document.getElementById('chatMessages');
    
    // Önceki indicator'ı kaldır
    removeTypingIndicator();
    
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.id = 'typingIndicator';
    indicator.innerHTML = `
        ${emoji} <strong>${agent}</strong> yazıyor
        <div class="typing-dots">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    
    container.appendChild(indicator);
    container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

function formatContent(content) {
    // Basit markdown-like formatting
    let formatted = content
        // Code blocks
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Bold
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        // Headers
        .replace(/^### (.+)$/gm, '<strong style="font-size: 1.1em;">$1</strong>')
        .replace(/^## (.+)$/gm, '<strong style="font-size: 1.2em;">$1</strong>')
        .replace(/^# (.+)$/gm, '<strong style="font-size: 1.3em;">$1</strong>')
        // Lists
        .replace(/^- (.+)$/gm, '• $1')
        .replace(/^\d+\. (.+)$/gm, '→ $1');
    
    return formatted;
}

function getAgentTitle(name) {
    const titles = {
        'Ayşe': 'Product Owner',
        'Mehmet': 'Tech Lead',
        'Ali': 'Senior Developer',
        'Zeynep': 'Frontend Developer',
        'Can': 'QA Engineer'
    };
    return titles[name] || '';
}

// ============================================
// LOGS
// ============================================

async function loadLogs() {
    try {
        const response = await fetch('/api/logs');
        const data = await response.json();
        
        const container = document.getElementById('logsList');
        
        if (data.logs.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.875rem;">Henüz kayıtlı görev yok.</p>';
            return;
        }
        
        container.innerHTML = data.logs.map(log => `
            <div class="log-item" onclick="viewLog('${log.id}')">
                <div class="log-item-title">${log.id}</div>
                <div class="log-item-date">${formatDate(log.created)}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Loglar yüklenemedi:', error);
    }
}

async function viewLog(logId) {
    try {
        const response = await fetch(`/api/logs/${logId}`);
        const data = await response.json();
        
        document.getElementById('modalTitle').textContent = `Log: ${logId}`;
        document.getElementById('modalBody').textContent = data.markdown;
        document.getElementById('logModal').style.display = 'flex';
    } catch (error) {
        alert('Log yüklenemedi: ' + error.message);
    }
}

function closeModal() {
    document.getElementById('logModal').style.display = 'none';
}

function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ============================================
// UTILITIES
// ============================================

function toggleFullscreen() {
    const chatSection = document.querySelector('.chat-section');
    chatSection.classList.toggle('fullscreen');
}

// Modal dışına tıklayınca kapat
document.addEventListener('click', (e) => {
    if (e.target.id === 'logModal') {
        closeModal();
    }
});

// ESC ile modal kapat
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        document.querySelector('.chat-section').classList.remove('fullscreen');
    }
});
