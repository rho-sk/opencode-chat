import {
	App,
	ItemView,
	MarkdownRenderer,
	Notice,
	Plugin,
	PluginSettingTab,
	RequestUrlParam,
	Scope,
	Setting,
	TFile,
	TFolder,
	WorkspaceLeaf,
	requestUrl,
	setIcon,
} from 'obsidian';

const VIEW_TYPE = 'opencode-chat-view';

// ── Settings ──────────────────────────────────────────────────────────────────

interface OpenCodeSettings {
	serverUrl: string;
	defaultModel: string;
	defaultAgent: string;
	rulesPath: string;
	sendKey: string;
	exportFolder: string;
}

const DEFAULT_SETTINGS: OpenCodeSettings = {
	serverUrl: 'http://localhost:4096',
	defaultModel: '',
	defaultAgent: 'build',
	rulesPath: 'system/opencode-rules.md',
	sendKey: 'ctrl+enter',
	exportFolder: 'conversations',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface ModelInfo {
	providerID: string;
	modelID: string;
	label: string;
}

interface ToolState {
	status?: string;
	input?: Record<string, string>;
	title?: string;
	output?: string;
	metadata?: { output?: string };
}

interface ToolPart {
	id: string;
	type: string;
	tool: string;
	state?: ToolState;
	time?: { start?: number; end?: number };
	text?: string;
	cost?: number;
	tokens?: {
		input?: number;
		output?: number;
		cache?: { read?: number };
	};
	attempt?: number;
	error?: { message?: string; data?: { message?: string } };
}

interface SSEEvent {
	type: string;
	properties: SSEProperties;
}

interface SSEProperties {
	sessionID?: string;
	messageID?: string;
	part?: ToolPart & { sessionID?: string };
	info?: {
		id?: string;
		sessionID?: string;
		title?: string;
		slug?: string;
		role?: string;
		modelID?: string;
		agent?: string;
	};
	partID?: string;
	field?: string;
	delta?: string;
	todos?: TodoItem[];
	error?: { message?: string; data?: { message?: string } };
	status?: { type?: string };
	id?: string;
	permission?: string;
	metadata?: Record<string, string>;
	always?: string[];
	patterns?: string[];
	questions?: QuestionDef[];
}

interface TodoItem {
	status: string;
	content: string;
}

interface QuestionDef {
	question: string;
	header?: string;
	multiple?: boolean;
	custom?: boolean;
	options?: { label: string; description?: string }[];
}

interface SessionInfo {
	id: string;
	title?: string;
	slug: string;
	time: { updated: number };
}

interface MessageInfo {
	info?: {
		role?: string;
		modelID?: string;
		agent?: string;
	};
	parts?: ToolPart[];
}

interface HistoryGroup {
	role: string;
	text: string;
	meta?: string;
	tools: ToolPart[];
	reasonings: ToolPart[];
}

interface ToolRowEl {
	row: HTMLElement;
	header: HTMLElement;
	statusDot: HTMLElement;
	nameEl: HTMLElement;
	descEl: HTMLElement;
	outputEl: HTMLElement;
	tool: string;
	_lastOutput?: string;
}

interface ReasoningEl {
	wrap: HTMLElement;
	content: HTMLPreElement;
	text?: string;
}

interface ExportEntry {
	role: string;
	text: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function apiGet(base: string, path: string): Promise<unknown> {
	const res = await requestUrl({ url: `${base}${path}` } as RequestUrlParam);
	if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}: ${res.text}`);
	return res.json;
}

async function apiPatch(base: string, path: string, body: unknown): Promise<unknown> {
	const res = await requestUrl({
		url: `${base}${path}`,
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	} as RequestUrlParam);
	if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}: ${res.text}`);
	return res.json;
}

async function apiPost(base: string, path: string, body: unknown): Promise<unknown> {
	const res = await requestUrl({
		url: `${base}${path}`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	} as RequestUrlParam);
	if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}: ${res.text}`);
	return res.json;
}

// requestUrl does not support AbortSignal — native fetch is required here
async function apiPostVoid(
	base: string,
	path: string,
	body: unknown,
	signal?: AbortSignal,
): Promise<void> {
	const res = await fetch(`${base}${path}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
		signal,
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
}

async function fetchModels(serverUrl: string): Promise<ModelInfo[]> {
	const data = await apiGet(serverUrl, '/provider') as { connected?: string[]; all?: { id: string; models?: Record<string, unknown> }[] };
	const connected = new Set<string>(data.connected || []);
	const result: ModelInfo[] = [];
	for (const provider of (data.all || [])) {
		if (!connected.has(provider.id)) continue;
		for (const [modelId, model] of Object.entries(provider.models || {})) {
			result.push({
				providerID: provider.id,
				modelID: modelId,
				label: (model as { name?: string }).name || modelId,
			});
		}
	}
	return result;
}

// ── Chat View ─────────────────────────────────────────────────────────────────

class OpenCodeChatView extends ItemView {
	plugin: OpenCodeChatPlugin;
	sessionId: string | null = null;
	models: ModelInfo[] = [];
	selectedModel: ModelInfo | null = null;
	selectedAgent: string;
	private _sseAbort: AbortController | null = null;
	private _promptAbort: AbortController | null = null;
	private _busy = false;
	private _pendingMsgId: string | null = null;
	private _activePartId: string | null = null;
	private _streamEl: HTMLElement | null = null;
	private _streamText = '';
	private _streamTextEl: HTMLElement | null = null;
	private _streamTextRef: { value: string } | null = null;
	private _streamCursor: HTMLElement | null = null;
	private _onIdleCallback: (() => void) | null = null;
	private _pendingRules: string | null = null;
	private _toolParts: Record<string, ToolRowEl> = {};
	private _reasoningParts: Record<string, ReasoningEl> = {};
	private _todos: TodoItem[] = [];
	private _todoInlineEl: HTMLElement | null = null;
	private _exportedMsgCount = 0;
	private _exportLog: ExportEntry[] = [];
	private _textareaScope: Scope | null = null;
	private _watchdogTimer: ReturnType<typeof setTimeout> | null = null;
	private _lastEventTime = 0;

	// DOM refs
	sessionLabel!: HTMLElement;
	modelSelect!: HTMLSelectElement;
	agentBuild!: HTMLButtonElement;
	agentPlan!: HTMLButtonElement;
	messagesEl!: HTMLElement;
	textarea!: HTMLTextAreaElement;
	sendBtn!: HTMLButtonElement;
	cancelBtn!: HTMLButtonElement;
	resetBtn!: HTMLButtonElement;

	constructor(leaf: WorkspaceLeaf, plugin: OpenCodeChatPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.selectedAgent = plugin.settings.defaultAgent || 'build';
	}

	getViewType() { return VIEW_TYPE; }
	getDisplayText() { return 'OpenCode chat'; }
	getIcon() { return 'bot'; }

	async onOpen() {
		this.buildUI();
		await Promise.all([this.loadModels(), this.initSession()]);
	}

	onClose() {
		this._stopSSE();
		this._popTextareaScope();
	}

	// ── Scope (keyboard) ──────────────────────────────────────────────────────

	private _buildTextareaScope(): Scope {
		const sc = new Scope(this.app.scope);
		const sk = () => this.plugin.settings.sendKey || 'ctrl+enter';

		sc.register(['Ctrl'], 'Enter', () => {
			if (sk() === 'ctrl+enter') { void this.sendMessage(); return false; }
		});
		sc.register(['Alt'], 'Enter', () => {
			if (sk() === 'alt+enter') { void this.sendMessage(); return false; }
		});
		sc.register(['Ctrl'], 'E', () => {
			this.openExpandedEditor(); return false;
		});
		return sc;
	}

	private _pushTextareaScope() {
		if (this._textareaScope) return;
		this._textareaScope = this._buildTextareaScope();
		this.app.keymap.pushScope(this._textareaScope);
	}

	private _popTextareaScope() {
		if (!this._textareaScope) return;
		this.app.keymap.popScope(this._textareaScope);
		this._textareaScope = null;
	}

	// ── Build UI ──────────────────────────────────────────────────────────────

	buildUI() {
		const root = this.containerEl.children[1] as HTMLElement;
		root.empty();
		root.addClass('opencode-chat-root');

		// Header
		const header = root.createDiv({ cls: 'opencode-chat-header' });
		const titleWrap = header.createDiv({ cls: 'opencode-chat-title' });
		setIcon(titleWrap.createSpan(), 'bot');
		titleWrap.createSpan({ text: ' OpenCode Chat' });

		const btnWrap = header.createDiv({ cls: 'opencode-chat-header-btns' });

		const newBtn = btnWrap.createEl('button', { cls: 'opencode-chat-icon-btn', attr: { title: 'New session' } });
		setIcon(newBtn, 'plus');
		newBtn.addEventListener('click', () => { void this.newSession(); });

		const renameBtn = btnWrap.createEl('button', { cls: 'opencode-chat-icon-btn', attr: { title: 'Rename current session' } });
		setIcon(renameBtn, 'pencil');
		renameBtn.addEventListener('click', () => { void this.renameCurrentSession(); });

		const histBtn = btnWrap.createEl('button', { cls: 'opencode-chat-icon-btn', attr: { title: 'Session history' } });
		setIcon(histBtn, 'history');
		histBtn.addEventListener('click', () => { void this.showSessionPicker(); });

		this.resetBtn = btnWrap.createEl('button', {
			cls: 'opencode-chat-icon-btn opencode-reset-btn opencode-hidden',
			attr: { title: 'Reset stuck state' },
		});
		setIcon(this.resetBtn, 'rotate-ccw');
		this.resetBtn.addEventListener('click', () => {
			void this._finalizeStream();
			this.appendSystemMsg('UI state reset manually.');
		});

		// Session label
		this.sessionLabel = root.createDiv({ cls: 'opencode-chat-session-label', text: 'Initializing…' });

		// Toolbar
		const toolbar = root.createDiv({ cls: 'opencode-chat-toolbar' });

		const modelWrap = toolbar.createDiv({ cls: 'opencode-toolbar-group' });
		setIcon(modelWrap.createSpan({ cls: 'opencode-toolbar-icon' }), 'cpu');
		this.modelSelect = modelWrap.createEl('select', { cls: 'opencode-toolbar-select' });
		this.modelSelect.createEl('option', { value: '', text: 'Loading models…' });
		this.modelSelect.addEventListener('change', () => {
			const val = this.modelSelect.value;
			this.selectedModel = this.models.find(m => `${m.providerID}/${m.modelID}` === val) || null;
			this.plugin.settings.defaultModel = val;
			void this.plugin.saveSettings();
		});

		const agentWrap = toolbar.createDiv({ cls: 'opencode-toolbar-group' });
		setIcon(agentWrap.createSpan({ cls: 'opencode-toolbar-icon' }), 'workflow');
		this.agentBuild = agentWrap.createEl('button', {
			cls: 'opencode-agent-btn' + (this.selectedAgent === 'build' ? ' is-active' : ''),
			text: 'Build',
			attr: { title: 'Build – agent can edit files and run tools' },
		});
		this.agentPlan = agentWrap.createEl('button', {
			cls: 'opencode-agent-btn' + (this.selectedAgent === 'plan' ? ' is-active' : ''),
			text: 'Plan',
			attr: { title: 'Plan – agent only plans, does not execute' },
		});
		this.agentBuild.addEventListener('click', () => this.setAgent('build'));
		this.agentPlan.addEventListener('click', () => this.setAgent('plan'));

		// Messages
		this.messagesEl = root.createDiv({ cls: 'opencode-chat-messages' });

		// Input area
		const inputArea = root.createDiv({ cls: 'opencode-chat-input-area' });
		this.textarea = inputArea.createEl('textarea', {
			cls: 'opencode-chat-textarea',
			attr: { placeholder: this._sendKeyPlaceholder() },
		});

		this.textarea.addEventListener('input', () => this._growTextarea());
		this.textarea.addEventListener('focus', () => this._pushTextareaScope());
		this.textarea.addEventListener('blur', () => this._popTextareaScope());
		this.textarea.addEventListener('keydown', (e) => {
			const sk = this.plugin.settings.sendKey || 'ctrl+enter';
			if (e.key === 'Enter' && sk === 'enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
				e.preventDefault();
				void this.sendMessage();
			}
		});

		// Button column
		const btnCol = inputArea.createDiv({ cls: 'opencode-chat-btn-col' });

		const exportBtn = btnCol.createEl('button', {
			cls: 'opencode-chat-export-btn',
			attr: { title: 'Export chat to note' },
		});
		setIcon(exportBtn, 'file-down');
		exportBtn.addEventListener('click', () => { void this.exportChatToNote(); });

		const expandBtn = btnCol.createEl('button', {
			cls: 'opencode-chat-expand-btn',
			attr: { title: 'Expand editor (Ctrl+E)' },
		});
		setIcon(expandBtn, 'maximize-2');
		expandBtn.addEventListener('click', () => { this.openExpandedEditor(); });

		this.cancelBtn = btnCol.createEl('button', {
			cls: 'opencode-chat-cancel-btn opencode-hidden',
			attr: { title: 'Stop generation' },
		});
		setIcon(this.cancelBtn, 'square');
		this.cancelBtn.addEventListener('click', () => { void this.cancelGeneration(); });

		this.sendBtn = btnCol.createEl('button', {
			cls: 'opencode-chat-send-btn',
			attr: { title: `Send (${this._sendKeyLabel()})` },
		});
		setIcon(this.sendBtn, 'send');
		this.sendBtn.addEventListener('click', () => { void this.sendMessage(); });
	}

	private _sendKeyLabel(): string {
		const sk = this.plugin.settings.sendKey || 'ctrl+enter';
		if (sk === 'enter') return 'Enter';
		if (sk === 'ctrl+enter') return 'Ctrl+Enter';
		if (sk === 'alt+enter') return 'Alt+Enter';
		return sk;
	}

	private _sendKeyPlaceholder(): string {
		return `Ask OpenCode anything… (${this._sendKeyLabel()} = send, Enter = newline)`;
	}

	private _growTextarea() {
		const ta = this.textarea;
		ta.setCssProps({ 'height': 'auto' });
		const minH = 164;
		const maxH = 320;
		const h = Math.max(minH, Math.min(ta.scrollHeight, maxH));
		ta.setCssProps({ 'height': h + 'px', 'overflow-y': ta.scrollHeight > maxH ? 'auto' : 'hidden' });
	}

	// ── Expanded editor ───────────────────────────────────────────────────────

	openExpandedEditor() {
		if (document.querySelector('.opencode-expanded-editor')) return;

		const overlay = document.body.createDiv({ cls: 'opencode-expanded-editor' });
		const modal = overlay.createDiv({ cls: 'opencode-expanded-modal' });

		const header = modal.createDiv({ cls: 'opencode-expanded-header' });
		header.createSpan({ text: 'Edit prompt' });
		const closeBtn = header.createEl('button', { cls: 'opencode-expanded-close', attr: { title: 'Close (esc)' } });
		setIcon(closeBtn, 'x');

		const ta = modal.createEl('textarea', { cls: 'opencode-expanded-textarea' });
		ta.value = this.textarea.value;
		ta.setAttribute('placeholder', this._sendKeyPlaceholder());

		const footer = modal.createDiv({ cls: 'opencode-expanded-footer' });
		footer.createSpan({ cls: 'opencode-expanded-hint', text: `${this._sendKeyLabel()} = send  ·  Esc = close` });
		const sendBtn = footer.createEl('button', { cls: 'opencode-expanded-send', text: `Send  (${this._sendKeyLabel()})` });

		// Resize handle
		const resizeHandle = modal.createDiv({ cls: 'opencode-expanded-resize-handle' });
		let resizing = false;
		let resizeStartY = 0;
		let resizeStartX = 0;
		let resizeStartH = 0;
		let resizeStartW = 0;

		resizeHandle.addEventListener('mousedown', (e) => {
			resizing = true;
			resizeStartY = e.clientY;
			resizeStartX = e.clientX;
			resizeStartH = modal.offsetHeight;
			resizeStartW = modal.offsetWidth;
			e.preventDefault();
			e.stopPropagation();
			document.body.setCssProps({ 'user-select': 'none' });
		});

		const onMouseMove = (e: MouseEvent) => {
			if (!resizing) return;
			const newH = Math.max(240, resizeStartH + (e.clientY - resizeStartY));
			const newW = Math.max(400, Math.min(window.innerWidth - 48, resizeStartW + (e.clientX - resizeStartX)));
			modal.setCssProps({ 'height': newH + 'px', 'max-height': newH + 'px', 'width': newW + 'px', 'max-width': newW + 'px' });
		};

		let suppressNextClick = false;
		const suppressClick = (e: MouseEvent) => {
			if (suppressNextClick) {
				suppressNextClick = false;
				e.stopPropagation();
				document.removeEventListener('click', suppressClick, true);
			}
		};
		document.addEventListener('click', suppressClick, true);

		const onMouseUp = () => {
			if (!resizing) return;
			resizing = false;
			document.body.setCssProps({ 'user-select': '' });
			suppressNextClick = true;
		};
		document.addEventListener('mousemove', onMouseMove);
		document.addEventListener('mouseup', onMouseUp);

		const expandScope = new Scope(this.app.scope);
		expandScope.register([], 'Escape', () => { close(); return false; });
		const sk = this.plugin.settings.sendKey || 'ctrl+enter';
		if (sk === 'ctrl+enter') {
			expandScope.register(['Ctrl'], 'Enter', () => { send(); return false; });
		} else if (sk === 'alt+enter') {
			expandScope.register(['Alt'], 'Enter', () => { send(); return false; });
		}
		this.app.keymap.pushScope(expandScope);

		const close = () => {
			document.removeEventListener('mousemove', onMouseMove);
			document.removeEventListener('mouseup', onMouseUp);
			document.removeEventListener('click', suppressClick, true);
			this.textarea.value = ta.value;
			this._growTextarea();
			this.app.keymap.popScope(expandScope);
			overlay.remove();
		};
		const send = () => {
			document.removeEventListener('mousemove', onMouseMove);
			document.removeEventListener('mouseup', onMouseUp);
			document.removeEventListener('click', suppressClick, true);
			this.textarea.value = ta.value;
			this._growTextarea();
			this.app.keymap.popScope(expandScope);
			overlay.remove();
			void this.sendMessage();
		};

		closeBtn.addEventListener('click', close);
		overlay.addEventListener('click', (e) => {
			if (resizing) return;
			if (e.target === overlay) close();
		});
		sendBtn.addEventListener('click', send);

		ta.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && sk === 'enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
				e.preventDefault();
				send();
			}
		});

		overlay.addClass('is-open');
		ta.focus();
		ta.setSelectionRange(ta.value.length, ta.value.length);
	}

	// ── Agent / Busy ──────────────────────────────────────────────────────────

	setAgent(name: string) {
		this.selectedAgent = name;
		this.agentBuild.classList.toggle('is-active', name === 'build');
		this.agentPlan.classList.toggle('is-active', name === 'plan');
	}

	setBusy(busy: boolean) {
		this._busy = busy;
		this.textarea.disabled = busy;
		this.sendBtn.classList.toggle('opencode-hidden', busy);
		this.cancelBtn.classList.toggle('opencode-hidden', !busy);
		this.resetBtn.classList.toggle('opencode-hidden', !busy);
		if (busy) this._resetWatchdog();
		else this._stopWatchdog();
	}

	// ── SSE ───────────────────────────────────────────────────────────────────

	private _stopSSE() {
		if (this._sseAbort) { this._sseAbort.abort(); this._sseAbort = null; }
		this._stopWatchdog();
	}

	// ── Watchdog ──────────────────────────────────────────────────────────────

	private _resetWatchdog() {
		this._lastEventTime = Date.now();
		if (!this._busy) return;
		if (this._watchdogTimer) clearTimeout(this._watchdogTimer);
		this._watchdogTimer = setTimeout(() => {
			if (!this._busy) return;
			// No SSE activity for 30s while busy — poll server for actual status
			void this._syncBusyState();
		}, 30_000);
	}

	private _stopWatchdog() {
		if (this._watchdogTimer) { clearTimeout(this._watchdogTimer); this._watchdogTimer = null; }
	}

	private async _syncBusyState() {
		if (!this._busy || !this.sessionId) return;
		try {
			const data = await apiGet(this.plugin.settings.serverUrl, `/session/${this.sessionId}`) as { status?: string };
			if (data.status === 'idle' || data.status === undefined) {
				void this._finalizeStream();
				this.appendSystemMsg('Session completed (detected by watchdog).');
			} else {
				// Still running — reset watchdog for another 30s
				this._resetWatchdog();
			}
		} catch {
			// Server unreachable — finalize anyway to unblock UI
			void this._finalizeStream();
			this.appendSystemMsg('Connection lost. UI reset.');
		}
	}

	private _startSSE() {
		this._stopSSE();
		this._sseAbort = new AbortController();
		const signal = this._sseAbort.signal;
		const url = `${this.plugin.settings.serverUrl}/event`;

		// fetch is required here: requestUrl does not support ReadableStream / SSE streaming
		void (async () => {
			try {
				const res = await fetch(url, {
					headers: { Accept: 'text/event-stream' },
					signal,
				});
				if (!res.ok || !res.body) return;
				const reader = res.body.getReader();
				const dec = new TextDecoder();
				let buf = '';

				while (true) {
					const { done, value } = await reader.read();
					if (done || signal.aborted) break;
					buf += dec.decode(value, { stream: true });
					const lines = buf.split('\n');
					buf = lines.pop() ?? '';
					for (const line of lines) {
						if (line.startsWith('data: ')) {
							try {
								const evt = JSON.parse(line.slice(6)) as SSEEvent;
								this._handleSSEEvent(evt);
							} catch { /* ignore parse errors */ }
						}
					}
				}
			} catch (e) {
				if (!(e as Error).message?.includes('aborted') && !signal.aborted) {
					console.warn('OpenCode Chat: SSE disconnected, reconnecting in 3s', e);
					setTimeout(() => {
						if (!signal.aborted) {
							this._startSSE();
							// After reconnect, sync busy state — idle event may have been missed
							if (this._busy) void this._syncBusyState();
						}
					}, 3000);
				}
			}
		})();
	}

	private _handleSSEEvent(evt: SSEEvent) {
		const { type, properties: p } = evt;

		// Reset watchdog on every event while busy
		if (this._busy) this._resetWatchdog();

		// Ignore events from other sessions
		const evtSession = p.sessionID || p.info?.sessionID || p.part?.sessionID;
		if (evtSession && evtSession !== this.sessionId) return;

		if (type === 'message.part.updated') {
			const part = p.part;
			if (!part) return;

			if (part.type === 'step-start') {
				this._handleStepStart(part);
				return;
			}
			if (part.type === 'text' && part.time?.start && !part.time?.end) {
				this._activePartId = part.id;
				this._streamText = '';
				if (this._streamEl) {
					const toolEl = this._streamEl.querySelector('.opencode-tool-activity');
					if (toolEl) toolEl.remove();
				}
				return;
			}
			if (part.type === 'text' && part.time?.end && part.text) {
				if (part.id === this._activePartId && part.text.length > this._streamText.length) {
					this._streamText = part.text;
					this._renderStreamEl();
				}
				return;
			}
			if (part.type === 'tool') { this._handleToolPart(part); return; }
			if (part.type === 'reasoning') { this._handleReasoningPart(part); return; }
			if (part.type === 'step-finish') { this._handleStepFinish(part); return; }
			if (part.type === 'retry') { this._handleRetryPart(part); return; }
			return;
		}

		if (type === 'message.part.delta') {
			if (!this._busy || !this._streamEl) return;
			if (p.field === 'reasoning') { this._appendReasoningDelta(p.partID!, p.delta!); return; }
			if (p.field !== 'text') return;
			if (this._activePartId && p.partID !== this._activePartId) return;
			if (!this._activePartId) this._activePartId = p.partID ?? null;
			this._streamText += p.delta ?? '';
			this._renderStreamEl();
			return;
		}

		if (type === 'todo.updated') {
			if (p.sessionID && p.sessionID !== this.sessionId) return;
			this._todos = p.todos || [];
			this._renderTodos();
			return;
		}

		if (type === 'session.error') {
			if (this._busy) {
				const err = p.error;
				const msg = err?.data?.message || err?.message || JSON.stringify(err) || 'Unknown error';
				void this._finalizeStream();
				this.appendSystemMsg(`Error: ${msg}`);
			}
			return;
		}

		if (type === 'session.idle' && p.sessionID === this.sessionId) {
			void this._finalizeStream();
			if (this._onIdleCallback) {
				const cb = this._onIdleCallback;
				this._onIdleCallback = null;
				cb();
			}
			return;
		}

		if (type === 'session.updated' && p.info?.id === this.sessionId) {
			const title = p.info.title || p.info.slug;
			if (title) this.sessionLabel.setText(`Session: ${title}`);
			return;
		}

		if (type === 'session.created') {
			const picker = document.querySelector('.opencode-session-picker');
			if (picker) { picker.remove(); void this.showSessionPicker(); }
			return;
		}

		if (type === 'session.deleted') {
			const deletedId = p.info?.id;
			const picker = document.querySelector('.opencode-session-picker');
			if (picker) { picker.remove(); void this.showSessionPicker(); }
			if (deletedId && deletedId === this.sessionId) void this.initSession();
			return;
		}

		if (type === 'message.removed' && p.sessionID === this.sessionId) {
			const msgEl = this.messagesEl.querySelector(`[data-message-id="${p.messageID}"]`);
			if (msgEl) msgEl.remove();
			return;
		}

		if (type === 'permission.asked' && p.sessionID === this.sessionId) {
			this._showPermissionDialog(p);
			return;
		}

		if (type === 'question.asked' && p.sessionID === this.sessionId) {
			this._showQuestionDialog(p);
			return;
		}

		if (type === 'session.status' && p.sessionID === this.sessionId) {
			if (p.status?.type === 'idle' && this._busy) void this._finalizeStream();
		}

		if (type === 'server.heartbeat') {
			if (this._busy) this._resetWatchdog();
		}
	}

	// ── Tool parts ────────────────────────────────────────────────────────────

	private _handleToolPart(part: ToolPart) {
		if (!this._streamEl) return;
		if (part.tool === 'todowrite') return;

		const state = part.state;
		const status = state?.status;
		const partId = part.id;

		let toolRow = this._toolParts[partId];
		if (!toolRow) {
			const row = document.createElement('div');
			row.className = 'opencode-tool-row';

			if (this._streamTextEl && this._streamEl.contains(this._streamTextEl)) {
				this._streamEl.insertBefore(row, this._streamTextEl);
			} else {
				this._streamEl.appendChild(row);
			}

			const hdr = row.createEl('div', { cls: 'opencode-tool-header' });
			const statusDot = hdr.createEl('span', { cls: 'opencode-tool-status-dot opencode-tool-pending' });
			const nameEl = hdr.createEl('span', { cls: 'opencode-tool-name', text: part.tool });
			const descEl = hdr.createEl('span', { cls: 'opencode-tool-desc' });
			const outputEl = row.createEl('div', { cls: 'opencode-tool-output opencode-hidden' });
			hdr.addEventListener('click', () => outputEl.classList.toggle('opencode-hidden'));

			toolRow = { row, header: hdr, statusDot, nameEl, descEl, outputEl, tool: part.tool };
			this._toolParts[partId] = toolRow;
		}

		toolRow.statusDot.className = 'opencode-tool-status-dot opencode-tool-' + (status || 'pending');

		const input = state?.input || {};
		const desc = input['command'] ?? input['path'] ?? state?.title ?? input['description'] ?? '';
		if (desc) toolRow.descEl.setText(desc.length > 80 ? desc.slice(0, 80) + '…' : desc);
		if (part.tool) toolRow.nameEl.setText(part.tool);

		const output = state?.metadata?.output || state?.output || '';
		if (output && output !== toolRow._lastOutput) {
			toolRow._lastOutput = output;
			toolRow.outputEl.empty();
			toolRow.outputEl.createEl('pre', { cls: 'opencode-tool-output-pre', text: output.slice(0, 2000) });
		}
		if (status === 'completed' && output) toolRow.outputEl.classList.remove('opencode-hidden');

		this.scrollToBottom();
	}

	private _handleStepStart(part: ToolPart) {
		if (!this._streamEl) return;
		if (this._streamEl.querySelector(`[data-step-id="${part.id}"]`)) return;
		const sep = document.createElement('div');
		sep.className = 'opencode-step-separator';
		sep.setAttribute('data-step-id', part.id);
		if (this._streamTextEl && this._streamEl.contains(this._streamTextEl)) {
			this._streamEl.insertBefore(sep, this._streamTextEl);
		} else {
			this._streamEl.appendChild(sep);
		}
	}

	private _handleReasoningPart(part: ToolPart) {
		if (!this._streamEl) return;
		let el = this._reasoningParts[part.id];
		if (!el) {
			el = this._createReasoningBlock(part.id);
			this._reasoningParts[part.id] = el;
		}
		if (part.text) el.content.setText(part.text);
		this.scrollToBottom();
	}

	private _appendReasoningDelta(partId: string, delta: string) {
		if (!this._streamEl || !delta) return;
		let el = this._reasoningParts[partId];
		if (!el) {
			el = this._createReasoningBlock(partId);
			el.text = '';
			this._reasoningParts[partId] = el;
		}
		el.text = (el.text || '') + delta;
		el.content.setText(el.text);
		this.scrollToBottom();
	}

	private _createReasoningBlock(partId: string): ReasoningEl {
		const wrap = document.createElement('div');
		wrap.className = 'opencode-reasoning-block';
		wrap.setAttribute('data-reasoning-id', partId);

		const hdr = wrap.createEl('div', { cls: 'opencode-reasoning-header' });
		setIcon(hdr.createSpan({ cls: 'opencode-reasoning-icon' }), 'brain');
		hdr.createSpan({ cls: 'opencode-reasoning-label', text: 'Thinking' });
		const toggleIcon = hdr.createSpan({ cls: 'opencode-reasoning-toggle' });
		setIcon(toggleIcon, 'chevron-down');

		const content = wrap.createEl('pre', { cls: 'opencode-reasoning-content' });
		hdr.addEventListener('click', () => {
			const collapsed = wrap.classList.toggle('is-collapsed');
			setIcon(toggleIcon, collapsed ? 'chevron-right' : 'chevron-down');
		});

		if (this._streamTextEl && this._streamEl?.contains(this._streamTextEl)) {
			this._streamEl.insertBefore(wrap, this._streamTextEl);
		} else {
			this._streamEl?.appendChild(wrap);
		}

		return { wrap, content };
	}

	private _handleStepFinish(part: ToolPart) {
		if (!this._streamEl) return;
		const cost = part.cost ?? 0;
		const tokens = part.tokens || {};
		const costStr = cost > 0 ? `$${cost.toFixed(4)}` : '';
		const totalTokens = (tokens.input || 0) + (tokens.output || 0);
		const tokenStr = totalTokens > 0
			? `${totalTokens.toLocaleString()} tokens (↑${(tokens.input || 0).toLocaleString()} ↓${(tokens.output || 0).toLocaleString()}${tokens.cache?.read ? ` 💾${tokens.cache.read.toLocaleString()}` : ''})`
			: '';
		if (!costStr && !tokenStr) return;
		const el = document.createElement('div');
		el.className = 'opencode-step-finish';
		el.textContent = [costStr, tokenStr].filter(Boolean).join(' · ');
		if (this._streamTextEl && this._streamEl.contains(this._streamTextEl)) {
			this._streamEl.insertBefore(el, this._streamTextEl);
		} else {
			this._streamEl.appendChild(el);
		}
	}

	private _handleRetryPart(part: ToolPart) {
		if (!this._streamEl) return;
		const attempt = part.attempt ?? 1;
		const errMsg = part.error?.data?.message || part.error?.message || 'API error';
		const el = document.createElement('div');
		el.className = 'opencode-retry-notice';
		el.textContent = `⟳ Retry #${attempt}: ${errMsg}`;
		if (this._streamTextEl && this._streamEl.contains(this._streamTextEl)) {
			this._streamEl.insertBefore(el, this._streamTextEl);
		} else {
			this._streamEl.appendChild(el);
		}
		this.scrollToBottom();
	}

	// ── Todos ─────────────────────────────────────────────────────────────────

	private _renderTodos() {
		const todos = this._todos;
		if (!todos || todos.length === 0) return;
		if (!this._streamEl) return;

		const todoEl = document.createElement('div');
		todoEl.className = 'opencode-todo-inline';
		if (this._streamTextEl && this._streamEl.contains(this._streamTextEl)) {
			this._streamEl.insertBefore(todoEl, this._streamTextEl);
		} else {
			this._streamEl.appendChild(todoEl);
		}

		const counts: Record<string, number> = { completed: 0, in_progress: 0, pending: 0 };
		for (const t of todos) counts[t.status] = (counts[t.status] || 0) + 1;

		const hdr = todoEl.createEl('div', { cls: 'opencode-todo-header' });
		hdr.createEl('span', { cls: 'opencode-todo-title', text: 'Tasks' });
		hdr.createEl('span', { cls: 'opencode-todo-summary', text: `${counts['completed']}/${todos.length} done` });

		const list = todoEl.createEl('ul', { cls: 'opencode-todo-list' });
		for (const todo of todos) {
			const li = list.createEl('li', { cls: `opencode-todo-item opencode-todo-${todo.status}` });
			const icon = li.createEl('span', { cls: 'opencode-todo-icon' });
			if (todo.status === 'completed') icon.setText('✓');
			else if (todo.status === 'in_progress') icon.setText('▶');
			else icon.setText('○');
			li.createEl('span', { cls: 'opencode-todo-content', text: todo.content });
		}

		this.scrollToBottom();
	}

	// ── Permission dialog ─────────────────────────────────────────────────────

	private _showPermissionDialog(p: SSEProperties) {
		document.querySelector('.opencode-permission-dialog')?.remove();

		const permId = p.id;
		const permType = p.permission || 'unknown';
		const meta = p.metadata || {};
		const patterns = p.always || p.patterns || [];

		let description = '';
		if (permType === 'external_directory') {
			description = `Write to directory outside project:\n${meta['parentDir'] || meta['filepath'] || patterns.join(', ')}`;
		} else {
			description = `Permission requested: ${permType}\n${patterns.join(', ')}`;
		}

		const dialog = document.body.createDiv({ cls: 'opencode-permission-dialog' });
		const titleEl = dialog.createDiv({ cls: 'opencode-permission-title' });
		setIcon(titleEl.createSpan({ cls: 'opencode-permission-icon' }), 'shield-alert');
		titleEl.createSpan({ text: ' Permission required' });
		dialog.createEl('div', { cls: 'opencode-permission-desc', text: description });

		const btnRow = dialog.createDiv({ cls: 'opencode-permission-btns' });
		const reply = async (value: string) => {
			dialog.remove();
			try {
				await apiPost(this.plugin.settings.serverUrl, `/permission/${permId}/reply`, { reply: value });
			} catch (e) {
				new Notice(`Permission reply failed: ${(e as Error).message}`);
			}
		};

		btnRow.createEl('button', { cls: 'opencode-permission-allow-once', text: 'Allow once' })
			.addEventListener('click', () => { void reply('once'); });
		btnRow.createEl('button', { cls: 'opencode-permission-allow-always', text: 'Allow always' })
			.addEventListener('click', () => { void reply('always'); });
		btnRow.createEl('button', { cls: 'opencode-permission-deny', text: 'Deny' })
			.addEventListener('click', () => { void reply('reject'); });

		const rect = this.containerEl.getBoundingClientRect();
		dialog.setCssProps({ 'top': `${rect.top + 80}px`, 'left': `${rect.left + 10}px`, 'width': `${Math.min(380, rect.width - 20)}px` });

		this.appendSystemMsg(`⚠ Permission required: ${description}`);
	}

	// ── Question dialog ───────────────────────────────────────────────────────

	private _showQuestionDialog(p: SSEProperties) {
		document.querySelector('.opencode-question-dialog')?.remove();

		const requestID = p.id;
		const questions = p.questions || [];
		if (!questions.length) return;

		const answers: Set<string>[] = questions.map(() => new Set());
		const customValues: string[] = questions.map(() => '');

		const dialog = document.body.createDiv({ cls: 'opencode-question-dialog' });
		const titleEl = dialog.createDiv({ cls: 'opencode-question-title' });
		setIcon(titleEl.createSpan({ cls: 'opencode-question-icon' }), 'help-circle');
		titleEl.createSpan({ text: ' Question' });

		const body = dialog.createDiv({ cls: 'opencode-question-body' });

		questions.forEach((q, qi) => {
			const qBlock = body.createDiv({ cls: 'opencode-question-block' });
			qBlock.createEl('div', { cls: 'opencode-question-text', text: q.question });
			if (q.header) qBlock.createEl('div', { cls: 'opencode-question-header', text: q.header });

			const optionsList = qBlock.createDiv({ cls: 'opencode-question-options' });
			(q.options || []).forEach(opt => {
				const optEl = optionsList.createDiv({ cls: 'opencode-question-option' });
				const btn = optEl.createEl('button', { cls: 'opencode-question-opt-btn', text: opt.label });
				if (opt.description) optEl.createEl('span', { cls: 'opencode-question-opt-desc', text: opt.description });

				btn.addEventListener('click', () => {
					if (q.multiple) {
						if (answers[qi].has(opt.label)) { answers[qi].delete(opt.label); btn.removeClass('is-selected'); }
						else { answers[qi].add(opt.label); btn.addClass('is-selected'); }
					} else {
						optionsList.querySelectorAll('.opencode-question-opt-btn').forEach(b => (b as HTMLElement).removeClass('is-selected'));
						answers[qi].clear();
						answers[qi].add(opt.label);
						btn.addClass('is-selected');
					}
				});
			});

			if (q.custom !== false) {
				const customWrap = qBlock.createDiv({ cls: 'opencode-question-custom' });
				const customInput = customWrap.createEl('input', {
					cls: 'opencode-question-custom-input',
					type: 'text',
					placeholder: 'Or type your own answer…',
				});
				customInput.addEventListener('input', () => { customValues[qi] = customInput.value; });
			}
		});

		const btnRow = dialog.createDiv({ cls: 'opencode-question-btns' });
		const submitBtn = btnRow.createEl('button', { cls: 'opencode-question-submit', text: 'Submit' });
		const rejectBtn = btnRow.createEl('button', { cls: 'opencode-question-reject', text: 'Dismiss' });

		submitBtn.addEventListener('click', () => { void (async () => {
			const finalAnswers = questions.map((q, qi) => {
				const selected = [...answers[qi]];
				const custom = customValues[qi].trim();
				if (selected.length) return selected;
				if (custom) return [custom];
				return [];
			});
			dialog.remove();
			try {
				await apiPost(this.plugin.settings.serverUrl, `/question/${requestID}/reply`, { answers: finalAnswers });
			} catch (e) {
				new Notice(`Question reply failed: ${(e as Error).message}`);
			}
		})(); });

		rejectBtn.addEventListener('click', () => { void (async () => {
			dialog.remove();
			try {
				await apiPost(this.plugin.settings.serverUrl, `/question/${requestID}/reject`, {});
			} catch { /* ignore */ }
		})(); });

		const rect = this.containerEl.getBoundingClientRect();
		dialog.setCssProps({ 'top': `${rect.top + 80}px`, 'left': `${rect.left + 10}px`, 'width': `${Math.min(420, rect.width - 20)}px` });
	}

	// ── Stream rendering ──────────────────────────────────────────────────────

	private _renderStreamEl() {
		if (!this._streamTextEl) return;
		this._streamTextEl.empty();
		if (this._streamText) {
			this._streamTextEl.createEl('pre', { cls: 'opencode-stream-pre', text: this._streamText });
		}
		this.scrollToBottom();
	}

	private async _finalizeStream() {
		if (!this._busy) return;
		this.setBusy(false);
		if (this._streamCursor) { this._streamCursor.remove(); this._streamCursor = null; }
		if (this._streamTextRef) { this._streamTextRef.value = this._streamText; this._streamTextRef = null; }
		if (this._streamText) this._exportLog.push({ role: 'assistant', text: this._streamText });

		if (this._streamTextEl) {
			this._streamTextEl.empty();
			if (this._streamText) {
				await MarkdownRenderer.render(this.app, this._streamText, this._streamTextEl, '', this);
			} else if (Object.keys(this._toolParts).length === 0) {
				this._streamTextEl.createEl('em', { text: '*(no response)*' });
			}
		}

		this._streamEl = null;
		this._streamTextEl = null;
		this._streamText = '';
		this._pendingMsgId = null;
		this._activePartId = null;
		this._toolParts = {};
		this._reasoningParts = {};
		this.scrollToBottom();
		this.textarea.focus();
	}

	// ── Rules ─────────────────────────────────────────────────────────────────

	async loadRules(): Promise<string | null> {
		const rulesPath = (this.plugin.settings.rulesPath || '').trim();
		if (!rulesPath) return null;

		const vault = this.app.vault;
		const abstract = vault.getAbstractFileByPath(rulesPath);
		if (!abstract) {
			console.warn(`OpenCode Chat: rules path not found: ${rulesPath}`);
			return null;
		}

		if (abstract instanceof TFile) {
			try { return await vault.read(abstract); }
			catch (e) { console.warn('OpenCode Chat: could not read rules file', e); return null; }
		}

		if (abstract instanceof TFolder) {
			const files = abstract.children
				.filter((f): f is TFile => f instanceof TFile && f.extension === 'md')
				.sort((a, b) => a.name.localeCompare(b.name));

			if (files.length === 0) return null;
			const parts: string[] = [];
			for (const f of files) {
				try { parts.push(`# ${f.basename}\n\n${await vault.read(f)}`); } catch { /* skip */ }
			}
			return parts.length ? parts.join('\n\n---\n\n') : null;
		}

		return null;
	}

	// ── Session management ────────────────────────────────────────────────────

	async initSession() {
		try {
			const session = await apiPost(this.plugin.settings.serverUrl, '/session', {}) as { id: string; title?: string; slug: string };
			this.sessionId = session.id;
			this.sessionLabel.setText(`Session: ${session.title || session.slug}`);
			this.messagesEl.empty();
			this._startSSE();
			const rules = await this.loadRules();
			this._pendingRules = rules || null;
			this.appendSystemMsg('Session ready. Type your message below.');
		} catch (e) {
			this.sessionLabel.setText('Error: cannot connect');
			this.appendSystemMsg(`Cannot connect to OpenCode at ${this.plugin.settings.serverUrl}\n\nError: ${(e as Error).message}`);
		}
	}

	private _waitForIdle(timeoutMs: number): Promise<void> {
		return new Promise((resolve) => {
			const timer = setTimeout(resolve, timeoutMs);
			const orig = this._onIdleCallback;
			this._onIdleCallback = () => {
				clearTimeout(timer);
				this._onIdleCallback = orig;
				resolve();
			};
		});
	}

	async newSession() {
		this._stopSSE();
		if (this._busy) void this.cancelGeneration();
		this.sessionLabel.setText('Creating new session…');
		this.messagesEl.empty();
		this._exportedMsgCount = 0;
		this._exportLog = [];
		await this.initSession();
	}

	async renameCurrentSession() {
		if (!this.sessionId) { new Notice('No active session'); return; }
		await this.renameSession(this.sessionId, (newTitle) => {
			this.sessionLabel.setText(`Session: ${newTitle}`);
		});
	}

	async renameSession(sessionId: string, onSuccess?: (title: string) => void) {
		document.querySelector('.opencode-rename-dialog')?.remove();

		let currentTitle = '';
		try {
			const info = await apiGet(this.plugin.settings.serverUrl, `/session/${sessionId}`) as { title?: string; slug?: string };
			currentTitle = info.title || info.slug || '';
		} catch { /* ignore */ }

		const dialog = document.body.createDiv({ cls: 'opencode-rename-dialog' });
		dialog.createDiv({ cls: 'opencode-rename-title', text: 'Rename session' });

		const input = dialog.createEl('input', {
			cls: 'opencode-rename-input',
			attr: { type: 'text', placeholder: 'Session name…', value: currentTitle },
		});

		const btnRow = dialog.createDiv({ cls: 'opencode-rename-btns' });
		const saveBtn = btnRow.createEl('button', { cls: 'opencode-rename-save', text: 'Rename' });
		const cancelBtn = btnRow.createEl('button', { cls: 'opencode-rename-cancel', text: 'Cancel' });

		const close = () => dialog.remove();
		const save = async () => {
			const newTitle = input.value.trim();
			if (!newTitle) { new Notice('Title cannot be empty'); return; }
			try {
				const updated = await apiPatch(this.plugin.settings.serverUrl, `/session/${sessionId}`, { title: newTitle }) as { title?: string };
				if (onSuccess) onSuccess(updated.title || newTitle);
				new Notice('Session renamed');
				close();
			} catch (e) { new Notice(`Rename failed: ${(e as Error).message}`); }
		};

		saveBtn.addEventListener('click', () => { void save(); });
		cancelBtn.addEventListener('click', close);
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') { e.preventDefault(); void save(); }
			if (e.key === 'Escape') { e.preventDefault(); close(); }
		});

		const rect = this.containerEl.getBoundingClientRect();
		dialog.setCssProps({ 'top': `${rect.top + 50}px`, 'left': `${rect.left + 10}px`, 'width': `${Math.min(360, rect.width - 20)}px` });

		setTimeout(() => {
			document.addEventListener('click', function handler(e) {
				if (!dialog.contains(e.target as Node)) { close(); document.removeEventListener('click', handler); }
			});
		}, 100);

		input.focus();
		input.select();
	}

	deleteSession(sessionId: string, sessionTitle: string, onSuccess?: () => Promise<void>) {
		document.querySelector('.opencode-delete-dialog')?.remove();

		const dialog = document.body.createDiv({ cls: 'opencode-delete-dialog' });
		dialog.createDiv({ cls: 'opencode-delete-title', text: 'Delete session?' });
		dialog.createDiv({ cls: 'opencode-delete-message', text: `Are you sure you want to delete "${sessionTitle}"? This cannot be undone.` });

		const btnRow = dialog.createDiv({ cls: 'opencode-delete-btns' });
		const deleteBtn = btnRow.createEl('button', { cls: 'opencode-delete-confirm', text: 'Delete' });
		const cancelBtn = btnRow.createEl('button', { cls: 'opencode-delete-cancel', text: 'Cancel' });

		let outsideClickEnabled = false;
		const close = () => { outsideClickEnabled = false; dialog.remove(); };

		const confirmDelete = async () => {
			outsideClickEnabled = false;
			deleteBtn.disabled = true;
			cancelBtn.disabled = true;
			try {
				await requestUrl({ url: `${this.plugin.settings.serverUrl}/session/${sessionId}`, method: 'DELETE' } as RequestUrlParam);
				new Notice('Session deleted');
				dialog.remove();

				if (sessionId === this.sessionId) {
					this._stopSSE();
					this.sessionId = null;
					this.messagesEl.empty();
					this.sessionLabel.setText('No active session');
					try {
						const remaining = await apiGet(this.plugin.settings.serverUrl, '/session') as SessionInfo[];
						if (remaining && remaining.length > 0) {
							const latest = remaining.reduce((a, b) =>
								(b.time?.updated || 0) > (a.time?.updated || 0) ? b : a
							);
							await this.loadSession(latest.id, latest.title || latest.slug);
						} else {
							await this.initSession();
						}
					} catch {
						await this.initSession();
					}
				}

				if (onSuccess) await onSuccess();
			} catch (e) {
				new Notice(`Delete failed: ${(e as Error).message}`);
				close();
			}
		};

		deleteBtn.addEventListener('click', () => { void confirmDelete(); });
		cancelBtn.addEventListener('click', close);

		const rect = this.containerEl.getBoundingClientRect();
		dialog.setCssProps({ 'top': `${rect.top + 100}px`, 'left': `${rect.left + 10}px`, 'width': `${Math.min(360, rect.width - 20)}px` });

		setTimeout(() => {
			outsideClickEnabled = true;
			document.addEventListener('click', function handler(e) {
				if (outsideClickEnabled && !dialog.contains(e.target as Node)) {
					outsideClickEnabled = false;
					dialog.remove();
					document.removeEventListener('click', handler);
				}
			});
		}, 100);
	}

	async showSessionPicker() {
		document.querySelector('.opencode-session-picker')?.remove();

		const placeholder = document.body.createDiv({ cls: 'opencode-session-picker opencode-session-picker-loading' });
		placeholder.hide();

		try {
			const sessions = await apiGet(this.plugin.settings.serverUrl, '/session') as SessionInfo[];
			placeholder.remove();

			const race = document.querySelector('.opencode-session-picker');
			if (race) race.remove();

			if (!sessions || sessions.length === 0) { new Notice('No sessions found'); return; }

			const picker = document.body.createDiv({ cls: 'opencode-session-picker' });
			picker.createDiv({ cls: 'opencode-session-picker-title', text: 'Select session' });

			for (const s of sessions.slice(0, 100)) {
				const item = picker.createDiv({ cls: 'opencode-session-picker-item' });
				const infoCol = item.createDiv({ cls: 'ocp-info' });
				const titleSpan = infoCol.createSpan({ cls: 'ocp-slug', text: '' });
				const setTitle = (t: string) => { titleSpan.setText(t.length > 50 ? t.slice(0, 50) + '…' : t); };
				setTitle(s.title || s.slug);
				infoCol.createSpan({ cls: 'ocp-date', text: new Date(s.time.updated).toLocaleString() });
				infoCol.addEventListener('click', () => { void (async () => { picker.remove(); await this.loadSession(s.id, s.title || s.slug); })(); });

			const renBtn = item.createEl('button', { cls: 'ocp-rename-btn', attr: { title: 'Rename' } });
			setIcon(renBtn, 'pencil');
			renBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				picker.remove();
				void this.renameSession(s.id, (newTitle) => setTitle(newTitle));
			});

			const sessionIdToDelete = s.id;
			const sessionTitleToDelete = s.title || s.slug;
			const delBtn = item.createEl('button', { cls: 'ocp-delete-btn', attr: { title: 'Delete session' } });
			setIcon(delBtn, 'trash-2');
			delBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				picker.remove();
				void this.deleteSession(sessionIdToDelete, sessionTitleToDelete, async () => {
					await this.showSessionPicker();
				});
			});
			}

			const closeBtn = picker.createEl('button', { cls: 'opencode-session-picker-close', text: '✕ close' });
			closeBtn.addEventListener('click', () => picker.remove());

			const rect = this.containerEl.getBoundingClientRect();
			picker.setCssProps({ 'top': `${rect.top + 50}px`, 'left': `${rect.left + 10}px`, 'width': `${Math.min(420, rect.width - 20)}px` });

			setTimeout(() => {
				document.addEventListener('click', function handler(e) {
					if (!picker.contains(e.target as Node)) { picker.remove(); document.removeEventListener('click', handler); }
				});
			}, 100);
		} catch (e) {
			placeholder.remove();
			new Notice(`Failed to load sessions: ${(e as Error).message}`);
		}
	}

	async loadSession(id: string, slug: string) {
		this._stopSSE();
		this.sessionId = id;
		this.messagesEl.empty();
		this._exportedMsgCount = 0;
		this._exportLog = [];
		this.sessionLabel.setText(`Session: ${slug}`);

		try {
			const [data, todos] = await Promise.all([
				apiGet(this.plugin.settings.serverUrl, `/session/${id}/message`),
				apiGet(this.plugin.settings.serverUrl, `/session/${id}/todo`).catch(() => []),
			]);

			if (Array.isArray(data)) {
				const groups: HistoryGroup[] = [];

				for (const msg of data as MessageInfo[]) {
					const role = msg.info?.role;
					const parts = msg.parts || [];

					if (parts.some(p => p.type === 'compaction')) continue;

					if (role === 'user') {
						const text = parts.filter(p => p.type === 'text' && p.text).map(p => p.text).join('');
						const displayText = text.replace(/<opencode-rules>[\s\S]*?<\/opencode-rules>\n*/g, '').trim();
						if (!displayText) continue;
						groups.push({ role: 'user', text: displayText, tools: [], reasonings: [] });
					} else if (role === 'assistant') {
						const text = parts.filter(p => p.type === 'text' && p.text).map(p => p.text).join('');
						const toolParts = parts.filter(p => p.type === 'tool' && p.tool !== 'todowrite');
						const reasoningParts = parts.filter(p => p.type === 'reasoning' && p.text);

						const last = groups[groups.length - 1];
						if (last && last.role === 'assistant') {
							if (text) last.text += (last.text ? '\n\n' : '') + text;
							last.tools.push(...toolParts);
							last.reasonings.push(...reasoningParts);
						} else {
							if (!text && toolParts.length === 0 && reasoningParts.length === 0) continue;
							const meta = msg.info?.modelID ? `${msg.info.agent || ''} · ${msg.info.modelID}` : '';
							groups.push({ role: 'assistant', text, meta, tools: [...toolParts], reasonings: [...reasoningParts] });
						}
					}
				}

				for (const g of groups) {
					if (g.role === 'user') await this.appendMessage('user', g.text, '');
					else await this._appendHistoryAssistantMsg(g);
				}
			}

			if (Array.isArray(todos) && todos.length > 0) {
				this._todos = todos as TodoItem[];
				this._renderTodos();
			}

			this.appendSystemMsg('Session loaded.');
		} catch (e) { this.appendSystemMsg(`Could not load messages: ${(e as Error).message}`); }

		this.scrollToBottom();
		this._startSSE();
	}

	private async _appendHistoryAssistantMsg(g: HistoryGroup) {
		if (g.text) this._exportLog.push({ role: 'assistant', text: g.text });

		const wrap = this.messagesEl.createDiv({ cls: 'opencode-msg opencode-msg-assistant' });
		const labelRow = wrap.createDiv({ cls: 'opencode-msg-label-row' });
		labelRow.createSpan({ cls: 'opencode-msg-label', text: 'OpenCode' });
		if (g.meta) labelRow.createSpan({ cls: 'opencode-msg-meta', text: g.meta });
		if (g.text) this._addCopyBtn(labelRow, () => g.text);
		const bodyEl = wrap.createDiv({ cls: 'opencode-msg-body' });

		for (const rp of (g.reasonings || [])) {
			const rWrap = bodyEl.createDiv({ cls: 'opencode-reasoning-block is-collapsed' });
			const hdr = rWrap.createEl('div', { cls: 'opencode-reasoning-header' });
			setIcon(hdr.createSpan({ cls: 'opencode-reasoning-icon' }), 'brain');
			hdr.createSpan({ cls: 'opencode-reasoning-label', text: 'Thinking' });
			const toggleIcon = hdr.createSpan({ cls: 'opencode-reasoning-toggle' });
			setIcon(toggleIcon, 'chevron-right');
			rWrap.createEl('pre', { cls: 'opencode-reasoning-content', text: rp.text });
			hdr.addEventListener('click', () => {
				const collapsed = rWrap.classList.toggle('is-collapsed');
				setIcon(toggleIcon, collapsed ? 'chevron-right' : 'chevron-down');
			});
		}

		for (const tp of (g.tools || [])) {
			const state = tp.state || {};
			const input = state.input || {};
			const desc = input['command'] ?? input['path'] ?? state.title ?? input['description'] ?? '';
			const output = state.output || '';

			const row = bodyEl.createDiv({ cls: 'opencode-tool-row' });
			const hdr = row.createEl('div', { cls: 'opencode-tool-header' });
			hdr.createEl('span', { cls: `opencode-tool-status-dot opencode-tool-${state.status || 'completed'}` });
			hdr.createEl('span', { cls: 'opencode-tool-name', text: tp.tool || 'tool' });
			if (desc) hdr.createEl('span', { cls: 'opencode-tool-desc', text: desc.length > 80 ? desc.slice(0, 80) + '…' : desc });

			if (output) {
				const outputEl = row.createEl('div', { cls: 'opencode-tool-output opencode-hidden' });
				outputEl.createEl('pre', { cls: 'opencode-tool-output-pre', text: output.slice(0, 2000) });
				hdr.addEventListener('click', () => outputEl.classList.toggle('opencode-hidden'));
			}
		}

		if (g.text) {
			const textEl = bodyEl.createDiv({ cls: 'opencode-msg-body-text' });
			await MarkdownRenderer.render(this.app, g.text, textEl, '', this);
		}

		this.scrollToBottom();
		return wrap;
	}

	// ── Load models ───────────────────────────────────────────────────────────

	async loadModels() {
		try {
			this.models = await fetchModels(this.plugin.settings.serverUrl);
			this.modelSelect.empty();
			if (this.models.length === 0) {
				this.modelSelect.createEl('option', { value: '', text: 'No models available' });
				return;
			}
			const byProvider: Record<string, ModelInfo[]> = {};
			for (const m of this.models) {
				if (!byProvider[m.providerID]) byProvider[m.providerID] = [];
				byProvider[m.providerID].push(m);
			}
			const sortedProviders = Object.keys(byProvider).sort();
			for (const p of Object.values(byProvider)) p.sort((a, b) => a.label.localeCompare(b.label));

			const defaultVal = this.plugin.settings.defaultModel;
			let firstOpt: { opt: HTMLOptionElement; m: ModelInfo } | null = null;

			for (const provId of sortedProviders) {
				const models = byProvider[provId];
				const grp = this.modelSelect.createEl('optgroup', { attr: { label: provId } });
				for (const m of models) {
					const val = `${m.providerID}/${m.modelID}`;
					const opt = grp.createEl('option', { value: val, text: m.label });
					if (!firstOpt) firstOpt = { opt, m };
					if (defaultVal && val === defaultVal) { opt.selected = true; this.selectedModel = m; }
				}
			}
			if (!this.selectedModel && firstOpt) { firstOpt.opt.selected = true; this.selectedModel = firstOpt.m; }
		} catch (e) {
			this.modelSelect.empty();
			this.modelSelect.createEl('option', { value: '', text: 'Error loading models' });
			console.error('OpenCode Chat: failed to load models', e);
		}
	}

	// ── Send & Cancel ─────────────────────────────────────────────────────────

	async sendMessage() {
		const text = this.textarea.value.trim();
		if (!text || !this.sessionId || this._busy) return;

		this.textarea.value = '';
		this._pendingMsgId = null;
		this._activePartId = null;
		this._streamEl = null;
		this._streamText = '';
		this.setBusy(true);

		const modelLabel = this.selectedModel ? this.selectedModel.modelID : 'default model';
		await this.appendMessage('user', text, `${this.selectedAgent} · ${modelLabel}`);

		const { wrap, bodyEl } = this.appendStreamingMessage();
		this._streamEl = bodyEl;
		this._streamText = '';

		let promptText = text;
		if (this._pendingRules) {
			promptText = `<opencode-rules>\n${this._pendingRules}\n</opencode-rules>\n\n${text}`;
			this._pendingRules = null;
		}

		try {
			const body: Record<string, unknown> = {
				parts: [{ type: 'text', text: promptText }],
				agent: this.selectedAgent,
			};
			if (this.selectedModel) {
				body['model'] = { providerID: this.selectedModel.providerID, modelID: this.selectedModel.modelID };
			}

			this._promptAbort = new AbortController();
			await apiPostVoid(
				this.plugin.settings.serverUrl,
				`/session/${this.sessionId}/prompt_async`,
				body,
				this._promptAbort.signal,
			);
		} catch (e) {
			if ((e as Error).name === 'AbortError') {
				this.appendSystemMsg('Generation stopped.');
			} else {
				this.appendSystemMsg(`Error: ${(e as Error).message}`);
			}
			wrap.remove();
			this._streamEl = null;
			this._streamText = '';
			this.setBusy(false);
			this.textarea.focus();
		}
	}

	async cancelGeneration() {
		if (!this._busy || !this.sessionId) return;
		if (this._promptAbort) { this._promptAbort.abort(); this._promptAbort = null; }
		try { await apiPostVoid(this.plugin.settings.serverUrl, `/session/${this.sessionId}/abort`, {}); } catch { /* ignore */ }
		void this._finalizeStream();
		this.appendSystemMsg('Generation stopped.');
	}

	// ── Export chat ───────────────────────────────────────────────────────────

	async exportChatToNote() {
		if (!this.sessionId) { new Notice('No active session'); return; }
		const total = this._exportLog.length;
		if (total === 0) { new Notice('No messages to export'); return; }
		const newEntries = this._exportLog.slice(this._exportedMsgCount);
		if (newEntries.length === 0) { new Notice('No new messages since last export'); return; }

		const lines: string[] = [];
		for (const { role, text } of newEntries) {
			if (role === 'user') {
				const quoted = text.split('\n').map(l => `> ${l}`).join('\n');
				lines.push(`**You**\n\n${quoted}\n`);
			} else {
				lines.push(`**OpenCode**\n\n${text}\n`);
			}
			lines.push('---\n');
		}

		const newContent = lines.join('\n');
		const folder = (this.plugin.settings.exportFolder || 'opencode-chats').replace(/\/$/, '');
		let sessionTitle = this.sessionLabel.getText().replace(/^Session:\s*/i, '').trim();
		if (!sessionTitle || sessionTitle === 'Initializing…' || sessionTitle === 'No active session') {
			sessionTitle = `session-${this.sessionId.slice(-8)}`;
		}
		const safeName = sessionTitle.replace(/[\\/:*?"<>|#^[\]]/g, '-').replace(/\s+/g, ' ').trim();
		const notePath = `${folder}/${safeName}.md`;
		const vault = this.app.vault;

		try {
			if (!vault.getAbstractFileByPath(folder)) await vault.createFolder(folder);
		} catch { /* ignore */ }

		const existingFile = vault.getAbstractFileByPath(notePath);
		if (existingFile instanceof TFile) {
			try {
				const existing = await vault.read(existingFile);
				await vault.modify(existingFile, existing + '\n' + newContent);
				this._exportedMsgCount = total;
				new Notice(`Appended ${newEntries.length} message(s) → ${notePath}`);
			} catch (e) { new Notice(`Export failed: ${(e as Error).message}`); }
		} else {
			const header = `*Exported from OpenCode Chat — session \`${this.sessionId}\`*\n\n---\n\n`;
			try {
				await vault.create(notePath, header + newContent);
				this._exportedMsgCount = total;
				new Notice(`Exported → ${notePath}`);
				const file = vault.getAbstractFileByPath(notePath);
				if (file instanceof TFile) {
					const leaf = this.app.workspace.getLeaf('tab');
					await leaf.openFile(file);
				}
			} catch (e) { new Notice(`Export failed: ${(e as Error).message}`); }
		}
	}

	// ── DOM helpers ───────────────────────────────────────────────────────────

	private _addCopyBtn(labelRow: HTMLElement, getText: () => string): HTMLButtonElement {
		const btn = labelRow.createEl('button', { cls: 'opencode-copy-btn', attr: { title: 'Copy to clipboard' } });
		setIcon(btn, 'copy');
		btn.addEventListener('click', () => { void (async () => {
			try {
				await navigator.clipboard.writeText(getText());
				setIcon(btn, 'check');
				setTimeout(() => setIcon(btn, 'copy'), 1500);
			} catch { new Notice('Copy failed'); }
		})(); });
		return btn;
	}

	async appendMessage(role: string, text: string, meta = ''): Promise<HTMLElement> {
		if (role === 'user' || role === 'assistant') this._exportLog.push({ role, text });
		const wrap = this.messagesEl.createDiv({ cls: `opencode-msg opencode-msg-${role}` });
		const labelRow = wrap.createDiv({ cls: 'opencode-msg-label-row' });
		labelRow.createSpan({ cls: 'opencode-msg-label', text: role === 'user' ? 'You' : 'OpenCode' });
		if (meta) labelRow.createSpan({ cls: 'opencode-msg-meta', text: meta });
		this._addCopyBtn(labelRow, () => text);
		const body = wrap.createDiv({ cls: 'opencode-msg-body' });
		if (role === 'assistant') {
			await MarkdownRenderer.render(this.app, text, body, '', this);
		} else {
			body.createEl('p', { text });
		}
		this.scrollToBottom();
		return wrap;
	}

	appendStreamingMessage(): { wrap: HTMLElement; bodyEl: HTMLElement } {
		const wrap = this.messagesEl.createDiv({ cls: 'opencode-msg opencode-msg-assistant' });
		const labelRow = wrap.createDiv({ cls: 'opencode-msg-label-row' });
		labelRow.createSpan({ cls: 'opencode-msg-label', text: 'OpenCode' });
		this._streamCursor = labelRow.createSpan({ cls: 'opencode-stream-cursor' });
		const textRef = { value: '' };
		this._streamTextRef = textRef;
		this._addCopyBtn(labelRow, () => textRef.value);
		const bodyEl = wrap.createDiv({ cls: 'opencode-msg-body' });
		this._streamTextEl = bodyEl.createEl('div', { cls: 'opencode-stream-text' });
		this._toolParts = {};
		this._reasoningParts = {};
		this.scrollToBottom();
		return { wrap, bodyEl };
	}

	appendSystemMsg(text: string): HTMLElement {
		const wrap = this.messagesEl.createDiv({ cls: 'opencode-msg opencode-msg-system' });
		wrap.createEl('em', { text });
		this.scrollToBottom();
		return wrap;
	}

	scrollToBottom() {
		this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
	}
}

// ── Settings Tab ──────────────────────────────────────────────────────────────

class OpenCodeSettingTab extends PluginSettingTab {
	plugin: OpenCodeChatPlugin;

	constructor(app: App, plugin: OpenCodeChatPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Server URL')
			.setDesc('Base URL of the OpenCode server (e.g. http://localhost:4096)')
			.addText(t => t
				.setPlaceholder('http://localhost:4096')
				.setValue(this.plugin.settings.serverUrl)
				.onChange(async v => { this.plugin.settings.serverUrl = v.replace(/\/$/, ''); await this.plugin.saveSettings(); }));

		new Setting(containerEl)
			.setName('Default model')
			.setDesc('providerID/modelID — e.g. amazon-bedrock/anthropic.claude-3-5-haiku-20241022-v1:0')
			.addText(t => t
				.setPlaceholder('amazon-bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0')
				.setValue(this.plugin.settings.defaultModel)
				.onChange(async v => { this.plugin.settings.defaultModel = v.trim(); await this.plugin.saveSettings(); }));

		new Setting(containerEl)
			.setName('Default agent')
			.setDesc('Build = can edit files and run tools; plan = plans only, does not execute')
			.addDropdown(dd => dd
				.addOption('build', 'Build')
				.addOption('plan', 'Plan')
				.setValue(this.plugin.settings.defaultAgent)
				.onChange(async v => { this.plugin.settings.defaultAgent = v; await this.plugin.saveSettings(); }));

		new Setting(containerEl)
			.setName('Rules path')
			.setDesc('Vault path to a rules file (.md) or folder with .md files. Content is sent as the first prompt in every new session. Leave empty to disable.')
			.addText(t => t
				.setPlaceholder('system/opencode-rules.md')
				.setValue(this.plugin.settings.rulesPath)
				.onChange(async v => { this.plugin.settings.rulesPath = v.trim(); await this.plugin.saveSettings(); }));

		new Setting(containerEl)
			.setName('Send shortcut')
			.setDesc('Keyboard shortcut to send a message. "Enter" alone can cause accidental sends — Ctrl+Enter or Alt+Enter are safer for long prompts.')
			.addDropdown(dd => dd
				.addOption('ctrl+enter', 'Ctrl+Enter (recommended)')
				.addOption('alt+enter', 'Alt+Enter')
				.addOption('enter', 'Enter (original behaviour)')
				.setValue(this.plugin.settings.sendKey || 'ctrl+enter')
				.onChange(async v => { this.plugin.settings.sendKey = v; await this.plugin.saveSettings(); }));

		new Setting(containerEl)
			.setName('Export folder')
			.setDesc('Vault folder where exported chat notes are saved. Created automatically if it does not exist.')
			.addText(t => t
			.setPlaceholder('Conversations')
			.setValue(this.plugin.settings.exportFolder || 'conversations')
			.onChange(async v => { this.plugin.settings.exportFolder = v.trim() || 'conversations'; await this.plugin.saveSettings(); }));

		new Setting(containerEl)
			.setName('Test connection')
			.setDesc('Check if OpenCode server is reachable')
			.addButton(btn => btn.setButtonText('Test').onClick(async () => {
				try {
					const h = await apiGet(this.plugin.settings.serverUrl, '/global/health') as { version?: string };
					new Notice(`Connected! OpenCode v${h.version}`);
				} catch (e) { new Notice(`Connection failed: ${(e as Error).message}`); }
			}));

		containerEl.createEl('p', {
			text: `Plugin version: ${this.plugin.manifest.version}`,
			cls: 'opencode-settings-version',
		});
	}
}

// ── Plugin ────────────────────────────────────────────────────────────────────

export default class OpenCodeChatPlugin extends Plugin {
	settings!: OpenCodeSettings;

	async onload() {
		await this.loadSettings();
		this.registerView(VIEW_TYPE, (leaf) => new OpenCodeChatView(leaf, this));
		this.addRibbonIcon('bot', 'OpenCode chat', () => { void this.activateView(); });
		this.addCommand({ id: 'open-chat', name: 'Open chat', callback: () => { void this.activateView(); } });
		this.addSettingTab(new OpenCodeSettingTab(this.app, this));
	}

	onunload() { }

	async activateView() {
		const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE);
		if (existing.length > 0) { void this.app.workspace.revealLeaf(existing[0]); return; }
		const leaf = this.app.workspace.getRightLeaf(false);
		if (!leaf) return;
		await leaf.setViewState({ type: VIEW_TYPE, active: true });
		void this.app.workspace.revealLeaf(leaf);
	}

	async loadSettings() { this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<OpenCodeSettings>); }
	async saveSettings() { await this.saveData(this.settings); }
}
