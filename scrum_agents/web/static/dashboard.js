/**
 * Scrum Agent Dashboard - JavaScript
 * SSE ile real-time task takibi ve onay mekanizmasi
 *
 * UI/UX Improvements:
 * - Smart scroll (user position aware)
 * - Expandable long messages
 * - Collapsible code blocks with copy
 * - Enhanced phase progress
 */

const Dashboard = {
    // Configuration
    MESSAGE_CHAR_THRESHOLD: 400,  // Karakter limiti (uzun mesajlar icin)
    CODE_LINES_THRESHOLD: 8,      // Satir limiti (kod bloklari icin)
    SCROLL_THRESHOLD: 100,        // px - en alttan bu kadar uzaksa "yukarida" sayilir

    // State
    eventSource: null,
    currentTaskId: null,
    startTime: null,
    timerInterval: null,
    messageCount: 0,
    tokenUsage: 0,
    currentPhase: null,
    isRunning: false,
    pendingApprovalId: null,

    // Smart scroll state
    isUserAtBottom: true,
    unreadCount: 0,

    // DOM Elements
    elements: {
        taskInput: null,
        projectContext: null,
        startBtn: null,
        chatStream: null,
        approvalBanner: null,
        approvalMessage: null,
        approvalComment: null,
        approveBtn: null,
        rejectBtn: null,
        statusIndicator: null,
        statusText: null,
        taskIdDisplay: null,
        messageCountEl: null,
        tokenUsageEl: null,
        elapsedTimeEl: null,
        // Smart scroll elements
        newMessagesIndicator: null,
        scrollToBottomBtn: null,
        unreadBadge: null
    },

    // Agent mapping
    agentIdMap: {
        'po': 'po',
        'tech_lead': 'tech_lead',
        'senior_dev': 'senior_dev',
        'frontend_dev': 'frontend_dev',
        'qa': 'qa'
    },

    // Phase mapping
    phaseMap: {
        'task_detaylama': 'Task Detaylama',
        'teknik_olgunlastirma': 'Teknik Olgunlastirma',
        'gelistirme': 'Gelistirme',
        'test': 'Test',
        'onay': 'Onay',
        // Eski fazlar icin uyumluluk
        'analysis': 'Analiz',
        'discussion': 'Tartisma',
        'development': 'Gelistirme',
        'testing': 'Test',
        'summary': 'Ozet'
    },

    /**
     * Initialize dashboard
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.setStatus('ready', 'Hazir');
        console.log('Dashboard initialized');
    },

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements.taskInput = document.getElementById('taskInput');
        this.elements.projectContext = document.getElementById('projectContext');
        this.elements.errorReport = document.getElementById('errorReport');
        this.elements.startBtn = document.getElementById('startSprintBtn');
        this.elements.chatStream = document.getElementById('chatStream');
        this.elements.approvalBanner = document.getElementById('approvalBanner');
        this.elements.approvalMessage = document.getElementById('approvalMessage');
        this.elements.approvalComment = document.getElementById('approvalComment');
        this.elements.approveBtn = document.getElementById('approveBtn');
        this.elements.rejectBtn = document.getElementById('rejectBtn');
        this.elements.statusIndicator = document.getElementById('statusIndicator');
        this.elements.taskIdDisplay = document.getElementById('taskIdDisplay');
        this.elements.messageCountEl = document.getElementById('messageCount');
        this.elements.tokenUsageEl = document.getElementById('tokenUsage');
        this.elements.elapsedTimeEl = document.getElementById('elapsedTime');
        // Smart scroll elements
        this.elements.newMessagesIndicator = document.getElementById('newMessagesIndicator');
        this.elements.scrollToBottomBtn = document.getElementById('scrollToBottomBtn');
        this.elements.unreadBadge = document.getElementById('unreadBadge');
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        this.elements.startBtn.addEventListener('click', () => this.startSprint());
        this.elements.approveBtn.addEventListener('click', () => this.sendApproval(true));
        this.elements.rejectBtn.addEventListener('click', () => this.sendApproval(false));

        // Enter key ile sprint baslatma
        this.elements.taskInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                this.startSprint();
            }
        });

        // Smart scroll: Scroll event listener
        this.elements.chatStream.addEventListener('scroll', () => this.handleScroll());

        // Smart scroll: "Yeni Mesajlar" butonu
        if (this.elements.scrollToBottomBtn) {
            this.elements.scrollToBottomBtn.addEventListener('click', () => {
                this.forceScrollToBottom();
                this.resetUnreadCount();
            });
        }

        // Event delegation: Read more toggle, code expand, code copy
        this.elements.chatStream.addEventListener('click', (e) => {
            // Read more toggle
            if (e.target.closest('.read-more-toggle')) {
                this.toggleMessageExpand(e.target.closest('.read-more-toggle'));
            }
            // Code expand button
            if (e.target.closest('.code-expand-btn')) {
                this.toggleCodeExpand(e.target.closest('.code-expand-btn'));
            }
            // Code copy button
            if (e.target.closest('.code-copy-btn')) {
                this.copyCode(e.target.closest('.code-copy-btn'));
            }
        });
    },

    /**
     * Start sprint
     */
    async startSprint() {
        const task = this.elements.taskInput.value.trim();
        if (!task) {
            alert('Lutfen bir talep yazin.');
            return;
        }

        if (this.isRunning) {
            alert('Bir sprint zaten calisiyor.');
            return;
        }

        // Reset state
        this.isRunning = true;
        this.messageCount = 0;
        this.tokenUsage = 0;
        this.currentPhase = null;
        this.startTime = Date.now();

        // Update UI
        this.elements.startBtn.disabled = true;
        this.clearChat();
        this.resetPhaseProgress();
        this.setStatus('running', 'Sprint baslatiliyor...');
        this.startTimer();

        // Build request
        let projectContext = this.elements.projectContext.value.trim();
        const errorReport = this.elements.errorReport ? this.elements.errorReport.value.trim() : '';

        // Error raporunu context'e ekle
        if (errorReport) {
            const errorSection = `\n\n## CONSOLE HATA RAPORU (Kullanicidan)\n\`\`\`\n${errorReport}\n\`\`\`\n\nBu hatalari duzelt.`;
            projectContext = projectContext ? projectContext + errorSection : errorSection;
        }

        const url = new URL('/api/task/run', window.location.origin);
        url.searchParams.set('task', task);
        if (projectContext) {
            url.searchParams.set('context', projectContext);
        }

        // Close existing connection
        if (this.eventSource) {
            this.eventSource.close();
        }

        // Start SSE connection
        this.eventSource = new EventSource(url.toString());

        this.eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleEvent(data);
            } catch (error) {
                console.error('Event parse error:', error);
            }
        };

        this.eventSource.onerror = (error) => {
            console.error('SSE error:', error);
            this.setStatus('error', 'Baglanti hatasi');
            this.stopSprint();
        };
    },

    /**
     * Handle SSE event
     */
    handleEvent(data) {
        console.log('Event:', data.type, data);

        switch (data.type) {
            case 'start':
                this.currentTaskId = data.task_id;
                this.elements.taskIdDisplay.textContent = `Task: ${data.task_id}`;
                this.setStatus('running', 'Sprint basladi');
                break;

            case 'phase':
                this.handlePhaseChange(data);
                break;

            case 'agent_start':
                this.showTypingIndicator(data);
                this.highlightAgent(data.agent);
                break;

            case 'agent_response':
                this.removeTypingIndicator();
                this.addMessage(data);
                this.unhighlightAgent(data.agent);
                this.updateStats();
                break;

            case 'approval_request':
                this.showApprovalBanner(data);
                break;

            case 'complete':
                this.handleComplete(data);
                break;

            case 'error':
                this.handleError(data);
                break;
        }
    },

    /**
     * Handle phase change
     */
    handlePhaseChange(data) {
        const phaseKey = data.phase;
        const status = data.status;

        if (status === 'started') {
            this.currentPhase = phaseKey;
            this.setPhaseActive(phaseKey);
            this.setStatus('running', data.title || this.phaseMap[phaseKey] || phaseKey);
            this.addPhaseHeader(data.title || this.phaseMap[phaseKey], 'active');
        } else if (status === 'completed') {
            this.setPhaseCompleted(phaseKey);
        }
    },

    /**
     * Add phase header to chat
     */
    addPhaseHeader(title, status) {
        const header = document.createElement('div');
        header.className = `phase-header ${status}`;
        header.innerHTML = `
            <span class="phase-header-icon">${status === 'completed' ? '✓' : '●'}</span>
            <span class="phase-header-title">${title}</span>
        `;
        this.elements.chatStream.appendChild(header);
        this.scrollToBottom();
    },

    /**
     * Add message to chat
     */
    addMessage(data) {
        const agentClass = this.agentIdMap[data.agent] || data.agent?.toLowerCase().replace(' ', '_') || 'unknown';
        const rawContent = data.content || '';

        const message = document.createElement('div');
        message.className = `message ${agentClass}`;

        // Format content with markdown-like rendering (includes collapsible code blocks)
        const formattedContent = this.formatContent(rawContent);

        // Check if message needs "Read More" toggle
        const isLongMessage = rawContent.length > this.MESSAGE_CHAR_THRESHOLD;

        message.innerHTML = `
            <div class="message-header">
                <span class="message-emoji">${data.emoji || '🤖'}</span>
                <span class="message-agent">${data.agent || 'Agent'}</span>
                <span class="message-title">${data.title || ''}</span>
            </div>
            <div class="message-content ${isLongMessage ? 'collapsed' : ''}">${formattedContent}</div>
            ${isLongMessage ? this.createReadMoreToggle() : ''}
        `;

        this.elements.chatStream.appendChild(message);
        this.messageCount++;
        this.smartScrollToBottom();
    },

    /**
     * Create "Devamini Oku" toggle button
     */
    createReadMoreToggle() {
        return `
            <button class="read-more-toggle">
                <span class="toggle-text">Devamini Oku</span>
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                </svg>
            </button>
        `;
    },

    /**
     * Toggle message expand/collapse
     */
    toggleMessageExpand(toggleBtn) {
        const message = toggleBtn.closest('.message');
        const content = message.querySelector('.message-content');
        const isExpanded = content.classList.contains('expanded');

        if (isExpanded) {
            content.classList.remove('expanded');
            content.classList.add('collapsed');
            toggleBtn.classList.remove('expanded');
            toggleBtn.querySelector('.toggle-text').textContent = 'Devamini Oku';
        } else {
            content.classList.remove('collapsed');
            content.classList.add('expanded');
            toggleBtn.classList.add('expanded');
            toggleBtn.querySelector('.toggle-text').textContent = 'Daralt';
        }
    },

    /**
     * Format content with basic markdown
     */
    formatContent(content) {
        if (!content) return '';

        // Escape HTML
        let formatted = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Code blocks - with collapsible wrapper
        let codeBlockId = 0;
        formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            codeBlockId++;
            const trimmedCode = code.trim();
            const lines = trimmedCode.split('\n');
            const lineCount = lines.length;
            const needsCollapse = lineCount > this.CODE_LINES_THRESHOLD;
            const language = lang || 'text';

            return `
                <div class="code-block-wrapper" data-code-id="${codeBlockId}">
                    <div class="code-block-header">
                        <span class="code-language">${language}</span>
                        <div class="code-actions">
                            <button class="code-action-btn code-copy-btn" data-code-id="${codeBlockId}">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                                </svg>
                                <span>Kopyala</span>
                            </button>
                        </div>
                    </div>
                    <div class="code-block-content ${needsCollapse ? '' : 'expanded'}">
                        <pre><code class="language-${language}" data-raw-code="${this.escapeHtmlAttr(trimmedCode)}">${trimmedCode}</code></pre>
                    </div>
                    ${needsCollapse ? `
                        <button class="code-expand-btn" data-code-id="${codeBlockId}">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                            </svg>
                            <span class="expand-text">Tamamini Goster (${lineCount} satir)</span>
                        </button>
                    ` : ''}
                </div>
            `;
        });

        // Inline code
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Bold
        formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // Line breaks (but not inside code blocks - they're already handled)
        formatted = formatted.replace(/\n/g, '<br>');

        return formatted;
    },

    /**
     * Escape HTML for attribute values
     */
    escapeHtmlAttr(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    },

    /**
     * Toggle code block expand/collapse
     */
    toggleCodeExpand(expandBtn) {
        const wrapper = expandBtn.closest('.code-block-wrapper');
        const content = wrapper.querySelector('.code-block-content');
        const isExpanded = content.classList.contains('expanded');

        if (isExpanded) {
            content.classList.remove('expanded');
            expandBtn.classList.remove('expanded');
            const lineCount = wrapper.querySelector('code').textContent.split('\n').length;
            expandBtn.querySelector('.expand-text').textContent = `Tamamini Goster (${lineCount} satir)`;
        } else {
            content.classList.add('expanded');
            expandBtn.classList.add('expanded');
            expandBtn.querySelector('.expand-text').textContent = 'Daralt';
        }
    },

    /**
     * Copy code to clipboard
     */
    async copyCode(copyBtn) {
        const wrapper = copyBtn.closest('.code-block-wrapper');
        const codeEl = wrapper.querySelector('code');
        const rawCode = codeEl.getAttribute('data-raw-code') || codeEl.textContent;

        try {
            await navigator.clipboard.writeText(rawCode);
            copyBtn.classList.add('copied');
            copyBtn.querySelector('span').textContent = 'Kopyalandi!';

            setTimeout(() => {
                copyBtn.classList.remove('copied');
                copyBtn.querySelector('span').textContent = 'Kopyala';
            }, 2000);
        } catch (err) {
            console.error('Copy failed:', err);
            alert('Kopyalama basarisiz oldu.');
        }
    },

    /**
     * Show typing indicator
     */
    showTypingIndicator(data) {
        this.removeTypingIndicator();

        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.id = 'typingIndicator';
        indicator.innerHTML = `
            <span class="message-emoji">${data.emoji || '🤖'}</span>
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <span class="typing-text">${data.agent || 'Agent'} yazıyor...</span>
        `;

        this.elements.chatStream.appendChild(indicator);
        this.scrollToBottom();
    },

    /**
     * Remove typing indicator
     */
    removeTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    },

    /**
     * Highlight agent in sidebar
     */
    highlightAgent(agentId) {
        const agentKey = this.agentIdMap[agentId] || agentId?.toLowerCase().replace(' ', '_');
        const member = document.querySelector(`.member[data-agent="${agentKey}"]`);
        if (member) {
            member.classList.add('speaking');
        }
    },

    /**
     * Unhighlight agent in sidebar
     */
    unhighlightAgent(agentId) {
        const agentKey = this.agentIdMap[agentId] || agentId?.toLowerCase().replace(' ', '_');
        const member = document.querySelector(`.member[data-agent="${agentKey}"]`);
        if (member) {
            member.classList.remove('speaking');
        }
    },

    /**
     * Set phase as active
     */
    setPhaseActive(phaseKey) {
        // Remove active from all phases
        document.querySelectorAll('.phase').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.phase-connector').forEach(c => c.classList.remove('active'));

        // Set active
        const phase = document.querySelector(`.phase[data-phase="${phaseKey}"]`);
        if (phase) {
            phase.classList.add('active');

            // Update connector before this phase
            const prevConnector = phase.previousElementSibling;
            if (prevConnector && prevConnector.classList.contains('phase-connector')) {
                prevConnector.classList.add('active');
            }
        }
    },

    /**
     * Set phase as completed
     */
    setPhaseCompleted(phaseKey) {
        const phase = document.querySelector(`.phase[data-phase="${phaseKey}"]`);
        if (phase) {
            phase.classList.remove('active');
            phase.classList.add('completed');

            // Update connector before this phase to completed
            const prevConnector = phase.previousElementSibling;
            if (prevConnector && prevConnector.classList.contains('phase-connector')) {
                prevConnector.classList.remove('active');
                prevConnector.classList.add('completed');
            }

            // Update connector after this phase
            const nextConnector = phase.nextElementSibling;
            if (nextConnector && nextConnector.classList.contains('phase-connector')) {
                nextConnector.classList.add('completed');
            }
        }
    },

    /**
     * Reset phase progress
     */
    resetPhaseProgress() {
        document.querySelectorAll('.phase').forEach(p => {
            p.classList.remove('active', 'completed');
        });
        document.querySelectorAll('.phase-connector').forEach(c => {
            c.classList.remove('active', 'completed');
        });
    },

    /**
     * Show approval banner
     */
    showApprovalBanner(data) {
        this.pendingApprovalId = data.approval_id;
        this.elements.approvalMessage.textContent = data.message || 'Onayiniz bekleniyor.';
        this.elements.approvalComment.value = '';
        this.elements.approvalBanner.classList.remove('hidden');
        this.setStatus('waiting', 'Onay bekleniyor');

        // Scroll to top to show banner
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    /**
     * Hide approval banner
     */
    hideApprovalBanner() {
        this.elements.approvalBanner.classList.add('hidden');
        this.pendingApprovalId = null;
    },

    /**
     * Send approval response
     */
    async sendApproval(approved) {
        const comment = this.elements.approvalComment.value.trim();

        try {
            const response = await fetch('/api/approval/respond', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    approval_id: this.pendingApprovalId,
                    approved: approved,
                    comment: comment
                })
            });

            if (response.ok) {
                this.hideApprovalBanner();
                this.setStatus('running', approved ? 'Onaylandi, devam ediliyor...' : 'Reddedildi');
            } else {
                const error = await response.json();
                alert('Onay gonderilemedi: ' + (error.detail || 'Bilinmeyen hata'));
            }
        } catch (error) {
            console.error('Approval error:', error);
            alert('Onay gonderilemedi: ' + error.message);
        }
    },

    /**
     * Handle sprint complete
     */
    handleComplete(data) {
        this.stopSprint();
        this.setStatus('ready', 'Sprint tamamlandi');

        // Update stats
        if (data.stats) {
            this.tokenUsage = data.stats.total_tokens || 0;
            this.elements.tokenUsageEl.textContent = this.tokenUsage.toLocaleString();
        }
        if (data.message_count) {
            this.messageCount = data.message_count;
        }

        // Add completion message
        const completeMsg = document.createElement('div');
        completeMsg.className = 'phase-header completed';
        completeMsg.innerHTML = `
            <span class="phase-header-icon">✓</span>
            <span class="phase-header-title">Sprint Tamamlandi</span>
        `;
        this.elements.chatStream.appendChild(completeMsg);
        this.scrollToBottom();
    },

    /**
     * Handle error
     */
    handleError(data) {
        this.setStatus('error', 'Hata: ' + (data.message || 'Bilinmeyen hata'));

        const errorMsg = document.createElement('div');
        errorMsg.className = 'message qa';
        errorMsg.innerHTML = `
            <div class="message-header">
                <span class="message-emoji">❌</span>
                <span class="message-agent">Sistem</span>
            </div>
            <div class="message-content">Hata olustu: ${data.message || 'Bilinmeyen hata'}</div>
        `;
        this.elements.chatStream.appendChild(errorMsg);
        this.scrollToBottom();

        this.stopSprint();
    },

    /**
     * Stop sprint
     */
    stopSprint() {
        this.isRunning = false;
        this.elements.startBtn.disabled = false;

        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }

        this.stopTimer();
        this.removeTypingIndicator();

        // Remove all speaking highlights
        document.querySelectorAll('.member.speaking').forEach(m => m.classList.remove('speaking'));
    },

    /**
     * Set status
     */
    setStatus(state, text) {
        this.elements.statusIndicator.className = `status-indicator ${state}`;
        this.elements.statusIndicator.querySelector('.status-text').textContent = text;
    },

    /**
     * Update stats display
     */
    updateStats() {
        this.elements.messageCountEl.textContent = this.messageCount;
    },

    /**
     * Start timer
     */
    startTimer() {
        this.stopTimer();
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');
            this.elements.elapsedTimeEl.textContent = `${minutes}:${seconds}`;
        }, 1000);
    },

    /**
     * Stop timer
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    },

    /**
     * Clear chat
     */
    clearChat() {
        this.elements.chatStream.innerHTML = '';
        this.resetUnreadCount();
    },

    /**
     * Scroll to bottom (legacy - use smartScrollToBottom)
     */
    scrollToBottom() {
        this.elements.chatStream.scrollTop = this.elements.chatStream.scrollHeight;
    },

    // ==========================================
    // SMART SCROLL SYSTEM
    // ==========================================

    /**
     * Handle scroll event - detect if user is at bottom
     */
    handleScroll() {
        const el = this.elements.chatStream;
        const scrollTop = el.scrollTop;
        const scrollHeight = el.scrollHeight;
        const clientHeight = el.clientHeight;

        // User is at bottom if within threshold
        this.isUserAtBottom = (scrollHeight - scrollTop - clientHeight) < this.SCROLL_THRESHOLD;

        // If user scrolled to bottom manually, hide indicator and reset count
        if (this.isUserAtBottom) {
            this.hideNewMessagesIndicator();
            this.resetUnreadCount();
        }
    },

    /**
     * Smart scroll - only scroll if user is at bottom
     */
    smartScrollToBottom() {
        if (this.isUserAtBottom) {
            this.scrollToBottom();
        } else {
            // User is reading above - show new messages indicator
            this.incrementUnread();
            this.showNewMessagesIndicator();
        }
    },

    /**
     * Force scroll to bottom (when user clicks button)
     */
    forceScrollToBottom() {
        this.elements.chatStream.scrollTo({
            top: this.elements.chatStream.scrollHeight,
            behavior: 'smooth'
        });
        this.isUserAtBottom = true;
        this.hideNewMessagesIndicator();
    },

    /**
     * Show new messages indicator
     */
    showNewMessagesIndicator() {
        if (this.elements.newMessagesIndicator) {
            this.elements.newMessagesIndicator.classList.remove('hidden');
        }
    },

    /**
     * Hide new messages indicator
     */
    hideNewMessagesIndicator() {
        if (this.elements.newMessagesIndicator) {
            this.elements.newMessagesIndicator.classList.add('hidden');
        }
    },

    /**
     * Increment unread count
     */
    incrementUnread() {
        this.unreadCount++;
        if (this.elements.unreadBadge) {
            this.elements.unreadBadge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
        }
    },

    /**
     * Reset unread count
     */
    resetUnreadCount() {
        this.unreadCount = 0;
        if (this.elements.unreadBadge) {
            this.elements.unreadBadge.textContent = '0';
        }
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    Dashboard.init();
});
