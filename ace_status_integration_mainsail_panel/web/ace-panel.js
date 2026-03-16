// ACE Panel — compact Vue app for Mainsail dashboard
(function () {
    const tEn = {
        statusMap: { ready: 'Ready', busy: 'Busy', unknown: 'Unknown', disconnected: 'Disconnected' },
        connectionStateMap: { connected: 'Connected', reconnecting: 'Reconnecting', disconnected: 'Disconnected', unknown: 'Unknown' },
        dryerStatusMap: { drying: 'Drying', stop: 'Stopped' },
        slotStatusMap: { ready: 'Ready', empty: 'Empty', busy: 'Busy', unknown: 'Unknown' },
        time: { minutesShort: 'm', secondsShort: 's' }
    };

    function t(translations, path) {
        const keys = path.split('.');
        let v = translations;
        for (const k of keys) {
            v = v && v[k];
        }
        return typeof v === 'string' ? v : path;
    }

    const app = {
        data() {
            return {
                embedded: window.self !== window.top,
                deviceStatus: { status: 'unknown', connection_state: 'unknown', model: '', temp: 0 },
                dryerStatus: { status: 'stop', remain_time: 0 },
                slots: [],
                currentTool: -1,
                instanceOptions: [],
                selectedInstance: 0,
                instancesPanels: [],
                feedAssistSlot: -1,
                wsConnected: false,
                ws: null,
                apiBase: (typeof ACE_DASHBOARD_CONFIG !== 'undefined' && ACE_DASHBOARD_CONFIG.apiBase) ? ACE_DASHBOARD_CONFIG.apiBase : window.location.origin,
                notification: { show: false, message: '', type: 'info' }
            };
        },
        mounted() {
            this.connectWebSocket();
            this.loadStatus();
            const interval = (typeof ACE_DASHBOARD_CONFIG !== 'undefined' && ACE_DASHBOARD_CONFIG.autoRefreshInterval) ? ACE_DASHBOARD_CONFIG.autoRefreshInterval : 5000;
            setInterval(() => { if (this.wsConnected) this.loadStatus(); }, interval);
        },
        methods: {
            t(path) { return t(tEn, path); },
            connectWebSocket() {
                const wsUrl = typeof getWebSocketUrl === 'function' ? getWebSocketUrl() : (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/websocket';
                this.ws = new WebSocket(wsUrl);
                this.ws.onopen = () => { this.wsConnected = true; this.subscribeToStatus(); };
                this.ws.onmessage = (e) => {
                    try {
                        const d = JSON.parse(e.data);
                        if (d.method === 'notify_status_update' && d.params && d.params[0] && d.params[0].ace) this.updateStatus(d.params[0].ace);
                    } catch (_) {}
                };
                this.ws.onclose = () => {
                    this.wsConnected = false;
                    const to = (typeof ACE_DASHBOARD_CONFIG !== 'undefined' && ACE_DASHBOARD_CONFIG.wsReconnectTimeout) ? ACE_DASHBOARD_CONFIG.wsReconnectTimeout : 3000;
                    setTimeout(() => this.connectWebSocket(), to);
                };
            },
            subscribeToStatus() {
                if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
                this.ws.send(JSON.stringify({ jsonrpc: '2.0', method: 'printer.objects.subscribe', params: { objects: { ace: null } }, id: 5434 }));
            },
            async loadStatus() {
                try {
                    const inst = Number.isInteger(this.selectedInstance) ? this.selectedInstance : 0;
                    const r = await fetch(this.apiBase + '/server/ace/status?instance=' + inst);
                    if (!r.ok) throw new Error(r.statusText);
                    const result = await r.json();
                    const data = result.result != null ? result.result : result;
                    if (data && typeof data === 'object' && (data.status !== undefined || data.slots !== undefined || data.dryer !== undefined)) this.updateStatus(data);
                } catch (e) {
                    this.showNotification('Load error: ' + (e.message || e), 'error');
                }
            },
            updateStatus(data) {
                if (!data || typeof data !== 'object') return;
                if (Number.isInteger(data.current_index)) this.currentTool = data.current_index;
                else if (data.ace_manager && Number.isInteger(data.ace_manager.current_index)) this.currentTool = data.ace_manager.current_index;
                const instances = Array.isArray(data.instances) ? data.instances : [];
                this.instanceOptions = instances.map(it => ({ index: Number(it.index) === it.index ? it.index : 0 })).sort((a, b) => a.index - b.index);
                if (Number.isInteger(data.instance_index) && (!Number.isInteger(this.selectedInstance) || !this.instanceOptions.find(o => o.index === this.selectedInstance))) this.selectedInstance = data.instance_index;
                if (data.status !== undefined) this.deviceStatus.status = data.status;
                if (data.connection_state !== undefined) this.deviceStatus.connection_state = data.connection_state;
                if (data.model !== undefined) this.deviceStatus.model = data.model;
                if (data.temp !== undefined) this.deviceStatus.temp = data.temp;
                const dryer = data.dryer || data.dryer_status;
                if (dryer && typeof dryer === 'object') {
                    if (dryer.status !== undefined) this.dryerStatus.status = dryer.status;
                    if (dryer.remain_time !== undefined) this.dryerStatus.remain_time = dryer.remain_time > 1440 ? dryer.remain_time / 60 : dryer.remain_time;
                }
                if (instances.length > 0) {
                    this.instancesPanels = instances.map(it => ({
                        index: Number(it.index) === it.index ? it.index : 0,
                        slots: Array.isArray(it.slots) ? it.slots.map(s => ({
                            index: s.index,
                            tool: s.tool != null ? s.tool : null,
                            status: s.status || 'unknown',
                            material: s.material || s.type || '',
                            temp: Number(s.temp) === s.temp ? s.temp : 0,
                            color: Array.isArray(s.color) ? s.color : [0, 0, 0]
                        })) : [],
                        feedAssistSlot: typeof it.feed_assist_slot === 'number' ? it.feed_assist_slot : -1
                    }));
                    const panel = this.instancesPanels.find(p => p.index === this.selectedInstance) || this.instancesPanels[0];
                    if (panel) { this.slots = panel.slots; this.feedAssistSlot = panel.feedAssistSlot ?? -1; }
                } else if (Array.isArray(data.slots)) {
                    this.slots = data.slots.map(s => ({
                        index: s.index,
                        tool: s.tool != null ? s.tool : null,
                        status: s.status || 'unknown',
                        material: s.material || s.type || '',
                        temp: Number(s.temp) === s.temp ? s.temp : 0,
                        color: Array.isArray(s.color) ? s.color : [0, 0, 0]
                    }));
                    this.feedAssistSlot = typeof data.feed_assist_slot === 'number' ? data.feed_assist_slot : -1;
                }
            },
            onInstanceChange() { this.loadStatus(); },
            async executeCommand(command, params) {
                const p = { ...params };
                if (p.INSTANCE === undefined && Number.isInteger(this.selectedInstance)) p.INSTANCE = this.selectedInstance;
                try {
                    const r = await fetch(this.apiBase + '/server/ace/command', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ command, params: p })
                    });
                    const result = await r.json();
                    if (result.error) { this.showNotification('Error: ' + result.error, 'error'); return false; }
                    if (result.result && result.result.error) { this.showNotification(result.result.error, 'error'); return false; }
                    this.showNotification('Done', 'success');
                    setTimeout(() => this.loadStatus(), 800);
                    return true;
                } catch (e) {
                    this.showNotification('Error: ' + (e.message || e), 'error');
                    return false;
                }
            },
            changeToolForInstance(tool, instanceIndex) {
                return this.executeCommand('ACE_CHANGE_TOOL', { TOOL: tool, INSTANCE: instanceIndex }).then(success => {
                    if (success && instanceIndex === this.selectedInstance) this.currentTool = tool;
                });
            },
            saveInventoryAll() {
                const insts = this.instanceOptions.length ? this.instanceOptions : [{ index: this.selectedInstance || 0 }];
                Promise.all(insts.map(i => this.executeCommand('ACE_SAVE_INVENTORY', { INSTANCE: i.index })));
            },
            stopAssist() {
                const insts = this.instanceOptions.length ? this.instanceOptions : [{ index: this.selectedInstance || 0 }];
                insts.forEach(inst => {
                    const panel = this.instancesPanels.find(p => p.index === inst.index);
                    const slot = panel && typeof panel.feedAssistSlot === 'number' ? panel.feedAssistSlot : -1;
                    if (slot >= 0) this.executeCommand('ACE_DISABLE_FEED_ASSIST', { INDEX: slot, INSTANCE: inst.index });
                });
            },
            refreshStatus() { this.loadStatus(); this.showNotification('Refreshed', 'success'); },
            startDrying() {
                const temp = (ACE_DASHBOARD_CONFIG && ACE_DASHBOARD_CONFIG.defaults) ? ACE_DASHBOARD_CONFIG.defaults.dryingTemp : 50;
                const dur = (ACE_DASHBOARD_CONFIG && ACE_DASHBOARD_CONFIG.defaults) ? ACE_DASHBOARD_CONFIG.defaults.dryingDuration : 240;
                return this.executeCommand('ACE_START_DRYING', { TEMP: temp, DURATION: dur });
            },
            stopDrying() { return this.executeCommand('ACE_STOP_DRYING'); },
            getStatusText(status) { return this.t('statusMap.' + (status || 'unknown')) || status; },
            getConnectionStateText(state) { return this.t('connectionStateMap.' + (state || 'unknown')) || 'Unknown'; },
            connectionBadgeClass() { if (!this.wsConnected) return 'disconnected'; return this.deviceStatus.connection_state || 'unknown'; },
            getDryerStatusText(status) { return this.t('dryerStatusMap.' + (status || 'stop')) || status; },
            getSlotStatusText(status) { return this.t('slotStatusMap.' + (status || 'unknown')) || status; },
            getColorHex(c) {
                if (!c || !Array.isArray(c) || c.length < 3) return '#000';
                const r = Math.max(0, Math.min(255, c[0])).toString(16).padStart(2, '0');
                const g = Math.max(0, Math.min(255, c[1])).toString(16).padStart(2, '0');
                const b = Math.max(0, Math.min(255, c[2])).toString(16).padStart(2, '0');
                return '#' + r + g + b;
            },
            getSlotToolNumber(slot, instanceIndex) {
                if (slot && slot.tool != null) return Number(slot.tool);
                const panel = this.instancesPanels.find(p => p.index === instanceIndex);
                if (panel && Array.isArray(panel.slots)) {
                    const s = panel.slots.find(x => Number(x.tool) === x.tool && Number(x.index) === x.index);
                    if (s) return Number(s.tool) - Number(s.index) + Number(slot.index);
                }
                return slot && Number.isInteger(slot.index) ? slot.index : null;
            },
            isCurrentToolSlot(slot, instanceIndex) {
                if (!Number.isInteger(this.currentTool) || this.currentTool < 0) return false;
                const t = this.getSlotToolNumber(slot, instanceIndex);
                return t !== null && t === this.currentTool;
            },
            formatRemainingTime(minutes) {
                if (!minutes || minutes <= 0) return '0m 0s';
                const m = Math.floor(minutes);
                const sec = Math.round((minutes - m) * 60);
                return m + (typeof tEn.time.minutesShort === 'string' ? tEn.time.minutesShort : 'm') + ' ' + sec + (typeof tEn.time.secondsShort === 'string' ? tEn.time.secondsShort : 's');
            },
            showNotification(message, type) {
                this.notification = { show: true, message, type: type || 'info' };
                setTimeout(() => { this.notification.show = false; }, 3000);
            }
        }
    };

    Vue.createApp(app).mount('#app');
})();
