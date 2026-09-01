// ============================================
// JOGO PRINCIPAL - Vale Dourado
// ============================================

(function() {
    "use strict";
    
    /* ============ DADOS DO JOGO ============ */
    const MAX_GRID_SIZE = 64;
    let GRID_SIZE = 40;
    
    const SELL_PRICES = {
        wheat: 2, corn: 3, carrot: 5, flour: 10, egg: 8, bread: 22,
        grape: 6, pumpkin: 7, wine: 35, candy: 28, cachaça: 40
    };
    
    const RESOURCE_INFO = {
        wheat: { name: 'Trigo', icon: '🌾' },
        corn: { name: 'Milho', icon: '🌽' },
        carrot: { name: 'Cenoura', icon: '🥕' },
        flour: { name: 'Farinha', icon: '🧂' },
        egg: { name: 'Ovos', icon: '🥚' },
        bread: { name: 'Pão', icon: '🍞' },
        grape: { name: 'Uva', icon: '🍇' },
        pumpkin: { name: 'Abóbora', icon: '🎃' },
        wine: { name: 'Vinho', icon: '🍷' },
        candy: { name: 'Doce de Abóbora', icon: '🍬' },
        cachaça: { name: 'Cachaça', icon: '🥃' }
    };
    
    const PLACEABLES = {
        // Plantações
        wheat_field: { cat: 'crop', name: 'Campo de Trigo', icon: '🌾', cost: 10, growTime: 60, yieldRes: 'wheat', yieldAmt: 3, levelReq: 1 },
        corn_field: { cat: 'crop', name: 'Campo de Milho', icon: '🌽', cost: 25, growTime: 90, yieldRes: 'corn', yieldAmt: 3, levelReq: 2 },
        carrot_field: { cat: 'crop', name: 'Campo de Cenoura', icon: '🥕', cost: 45, growTime: 130, yieldRes: 'carrot', yieldAmt: 3, levelReq: 3 },
        grape_field: { cat: 'crop', name: 'Vinhedo', icon: '🍇', cost: 80, growTime: 150, yieldRes: 'grape', yieldAmt: 4, levelReq: 4 },
        pumpkin_field: { cat: 'crop', name: 'Campo de Abóbora', icon: '🎃', cost: 70, growTime: 140, yieldRes: 'pumpkin', yieldAmt: 3, levelReq: 4 },
        
        // Fábricas
        mill: { cat: 'factory', name: 'Moinho', icon: '⚙️', cost: 60, time: 50, input: { wheat: 3 }, outputRes: 'flour', outputAmt: 2, levelReq: 1 },
        coop: { cat: 'factory', name: 'Galinheiro', icon: '🐔', cost: 90, time: 100, input: { corn: 3 }, outputRes: 'egg', outputAmt: 3, levelReq: 2 },
        bakery: { cat: 'factory', name: 'Padaria', icon: '🍞', cost: 150, time: 90, input: { flour: 2, egg: 1 }, outputRes: 'bread', outputAmt: 2, levelReq: 3 },
        winery: { cat: 'factory', name: 'Vinicultura', icon: '🍷', cost: 200, time: 120, input: { grape: 4 }, outputRes: 'wine', outputAmt: 2, levelReq: 5 },
        candy_factory: { cat: 'factory', name: 'Confeitaria', icon: '🍬', cost: 180, time: 100, input: { pumpkin: 3 }, outputRes: 'candy', outputAmt: 3, levelReq: 5 },
        cachaça_factory: { cat: 'factory', name: 'Cachaçaria', icon: '🥃', cost: 250, time: 150, input: { wine: 2, grape: 3 }, outputRes: 'cachaça', outputAmt: 2, levelReq: 6 }
    };
    
    const RESOURCE_MIN_LEVEL = {
        wheat: 1, flour: 1, corn: 2, egg: 2, carrot: 3, bread: 3,
        grape: 4, pumpkin: 4, wine: 5, candy: 5, cachaça: 6
    };
    
    const LEVEL_THRESHOLDS = [0, 150, 400, 900, 1800, 3200, 5200, 8000];
    const SLOT_UPGRADE_COST = [100, 200, 350, 550, 800, 1100, 1500, 2000, 2600, 3300];
    
    /* ============ ESTADO ============ */
    let state = {
        coins: 200,
        totalEarned: 200,
        resources: { wheat: 0, corn: 0, carrot: 0, flour: 0, egg: 0, bread: 0, grape: 0, pumpkin: 0, wine: 0, candy: 0, cachaça: 0 },
        grid: [],
        orders: [],
        nextOrderIn: 8,
        selectedBuild: null,
        activeTab: 'build',
        gridSize: 40,
        destroyMode: false,
    };
    
    let orderIdCounter = 1;
    let lastTick = Date.now();
    
    // Inicializar grid
    function initGrid(size) {
        state.grid = Array.from({ length: size }, () => ({ key: null }));
        GRID_SIZE = size;
        state.gridSize = size;
    }
    initGrid(40);
    
    /* ============ HELPERS ============ */
    function getLevel() {
        let lvl = 1;
        for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
            if (state.totalEarned >= LEVEL_THRESHOLDS[i]) lvl = i + 1;
        }
        return Math.min(lvl, LEVEL_THRESHOLDS.length);
    }
    
    function xpProgress() {
        const lvl = getLevel();
        const idx = lvl - 1;
        const cur = LEVEL_THRESHOLDS[idx] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
        const next = LEVEL_THRESHOLDS[idx + 1];
        if (next === undefined) return 100;
        const span = next - cur;
        return Math.max(0, Math.min(100, ((state.totalEarned - cur) / span) * 100));
    }
    
    function fmt(n) {
        return Math.floor(n).toLocaleString('pt-BR');
    }
    
    window.toast = function(msg) {
        const c = document.getElementById('toast-container');
        const el = document.createElement('div');
        el.className = 'toast';
        el.textContent = msg;
        c.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    };
    
    function hasEnough(inputDict) {
        return Object.entries(inputDict).every(([res, qty]) => (state.resources[res] || 0) >= qty);
    }
    
    function consume(inputDict) {
        Object.entries(inputDict).forEach(([res, qty]) => state.resources[res] -= qty);
    }
    
    /* ============ PARTÍCULAS ============ */
    function createHarvestEffect(element) {
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const emojis = ['✨', '⭐', '🌟', '💫', '🎉'];
        for (let i = 0; i < 10; i++) {
            const el = document.createElement('div');
            el.className = 'harvest-particle';
            el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            const angle = (Math.random() * Math.PI * 2);
            const distance = 60 + Math.random() * 80;
            el.style.cssText = `
                left: ${x}px; top: ${y}px;
                font-size: ${16 + Math.random() * 20}px;
                --tx: ${Math.cos(angle) * distance}px;
                --ty: ${Math.sin(angle) * distance - 40}px;
                animation-delay: ${Math.random() * 0.2}s;
            `;
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 1000);
        }
    }
    
    /* ============ LOOP PRINCIPAL ============ */
    function tick() {
        const now = Date.now();
        const dt = (now - lastTick) / 1000;
        lastTick = now;
        
        state.grid.forEach(tile => {
            if (!tile.key) return;
            const def = PLACEABLES[tile.key];
            if (!def) return;
            if (tile.stage === 'growing' || tile.stage === 'processing') {
                tile.progress += dt / (def.growTime || def.time);
                if (tile.progress >= 1) {
                    tile.progress = 1;
                    tile.stage = 'ready';
                }
            } else if (tile.stage === 'idle' && def.cat === 'factory') {
                if (hasEnough(def.input)) {
                    consume(def.input);
                    tile.stage = 'processing';
                    tile.progress = 0;
                }
            }
        });
        
        state.nextOrderIn -= dt;
        if (state.nextOrderIn <= 0) {
            if (state.orders.length < 4) generateOrder();
            state.nextOrderIn = 25 + Math.random() * 10;
        }
        
        renderHeader();
        renderGrid();
    }
    
    /* ============ AÇÕES ============ */
    function selectBuild(key) {
        const def = PLACEABLES[key];
        if (getLevel() < def.levelReq) return;
        if (state.destroyMode) toggleDestroyMode();
        state.selectedBuild = (state.selectedBuild === key) ? null : key;
        renderAll();
    }
    
    function toggleDestroyMode() {
        state.destroyMode = !state.destroyMode;
        if (state.destroyMode) state.selectedBuild = null;
        renderAll();
        toast(state.destroyMode ? '🗑️ Modo destruir ativado - Clique em uma construção para removê-la' : '🔧 Modo destruir desativado');
    }
    
    function handleTileClick(index, isRightClick = false) {
        const tile = state.grid[index];
        
        // Modo destruir
        if (state.destroyMode && tile.key) {
            const def = PLACEABLES[tile.key];
            if (confirm(`Remover ${def.icon} ${def.name}?`)) {
                const refund = Math.floor(def.cost * 0.5);
                state.coins += refund;
                state.grid[index] = { key: null };
                toast(`🗑️ ${def.name} removido! +${fmt(refund)} 🪙 reembolsados`);
                renderAll();
            }
            return;
        }
        
        // Construir em terreno vazio (clique esquerdo)
        if (!tile.key && !isRightClick && state.selectedBuild) {
            const bdef = PLACEABLES[state.selectedBuild];
            if (state.coins < bdef.cost) {
                toast('Moedas insuficientes.');
                return;
            }
            state.coins -= bdef.cost;
            tile.key = state.selectedBuild;
            tile.progress = 0;
            tile.stage = bdef.cat === 'crop' ? 'growing' : 'idle';
            toast(`${bdef.icon} ${bdef.name} construído!`);
            renderAll();
            return;
        }
        
        // Coletar (clique direito)
        if (tile.key && isRightClick && tile.stage === 'ready') {
            const def = PLACEABLES[tile.key];
            const tileElement = document.querySelector(`[data-tile-index="${index}"]`);
            if (tileElement) {
                tileElement.querySelector('span, img')?.classList.add('anim-harvest');
                createHarvestEffect(tileElement);
                setTimeout(() => {
                    tileElement.querySelector('span, img')?.classList.remove('anim-harvest');
                }, 500);
            }
            
            if (def.cat === 'crop') {
                state.resources[def.yieldRes] = (state.resources[def.yieldRes] || 0) + def.yieldAmt;
                toast(`+${def.yieldAmt} ${RESOURCE_INFO[def.yieldRes].icon} ${RESOURCE_INFO[def.yieldRes].name}`);
                tile.stage = 'growing';
                tile.progress = 0;
            } else {
                state.resources[def.outputRes] = (state.resources[def.outputRes] || 0) + def.outputAmt;
                toast(`+${def.outputAmt} ${RESOURCE_INFO[def.outputRes].icon} ${RESOURCE_INFO[def.outputRes].name}`);
                tile.stage = 'idle';
                tile.progress = 0;
            }
            renderAll();
            return;
        }
        
        // Dica para coletar
        if (tile.key && !isRightClick && tile.stage === 'ready') {
            toast(`${PLACEABLES[tile.key].icon} ${PLACEABLES[tile.key].name} pronto! Clique com botão direito para coletar.`);
        }
    }
    
    function sellResource(res) {
        const qty = state.resources[res] || 0;
        if (qty <= 0) return;
        const gain = qty * SELL_PRICES[res];
        state.resources[res] = 0;
        state.coins += gain;
        state.totalEarned += gain;
        toast(`Vendido: +${fmt(gain)} 🪙`);
        renderAll();
    }
    
    function generateOrder() {
        const available = Object.keys(RESOURCE_MIN_LEVEL).filter(r => RESOURCE_MIN_LEVEL[r] <= getLevel());
        if (available.length === 0) return;
        const res = available[Math.floor(Math.random() * available.length)];
        const qty = 2 + Math.floor(Math.random() * 4);
        const reward = Math.round(qty * SELL_PRICES[res] * 1.8);
        state.orders.push({ id: orderIdCounter++, res, qty, reward });
    }
    
    function deliverOrder(id) {
        const order = state.orders.find(o => o.id === id);
        if (!order) return;
        if ((state.resources[order.res] || 0) < order.qty) {
            toast('Recursos insuficientes.');
            return;
        }
        state.resources[order.res] -= order.qty;
        state.coins += order.reward;
        state.totalEarned += order.reward;
        state.orders = state.orders.filter(o => o.id !== id);
        toast(`Encomenda entregue! +${fmt(order.reward)} 🪙`);
        renderAll();
    }
    
    function setTab(tab) {
        state.activeTab = tab;
        renderSidebar();
    }
    
    function expandGrid() {
        const currentSize = state.grid.length;
        if (currentSize >= MAX_GRID_SIZE) {
            toast('🌾 Você já tem o máximo de terrenos disponível!');
            return;
        }
        
        const level = getLevel();
        const maxSlots = Math.min(4 + Math.floor(level / 2), 12);
        const currentSlots = Math.floor(currentSize / 8);
        
        if (currentSlots >= maxSlots) {
            toast(`🔒 Desbloqueie mais terrenos subindo de nível! (Nível ${level} - ${maxSlots}x${maxSlots})`);
            return;
        }
        
        const costIndex = currentSlots - 5;
        if (costIndex < 0 || costIndex >= SLOT_UPGRADE_COST.length) {
            toast('❌ Limite máximo atingido!');
            return;
        }
        
        const cost = SLOT_UPGRADE_COST[costIndex];
        if (state.coins < cost) {
            toast(`💰 Preciso de ${fmt(cost)} 🪙 para expandir!`);
            return;
        }
        
        state.coins -= cost;
        const newSize = currentSize + 8;
        const newSlots = Array.from({ length: 8 }, () => ({ key: null }));
        state.grid = state.grid.concat(newSlots);
        GRID_SIZE = newSize;
        state.gridSize = newSize;
        
        toast(`🌾 Terreno expandido! +8 slots (${Math.floor(newSize / 8)}x${Math.floor(newSize / 8)})`);
        renderAll();
    }
    
    /* ============ RENDER ============ */
    function getTileContent(tile, def) {
        const progress = tile.progress || 0;
        const stage = tile.stage;
        const key = tile.key;
        
        // Tentar carregar GIF
        const gifPath = ASSETS.getGif(key, stage, progress);
        if (gifPath) {
            const fullPath = ASSETS.getFullPath(gifPath);
            return `<img src="${fullPath}" alt="${def.name}" loading="lazy" onerror="this.style.display='none'; this.parentElement.innerHTML='${ASSETS.getFallback(key)}';">`;
        }
        
        // Fallback para emoji
        return `<span>${ASSETS.getFallback(key)}</span>`;
    }
    
    function renderHeader() {
        const lvl = getLevel();
        document.getElementById('header').innerHTML = `
            <div class="title-block">
                <div>
                    <h1>🏡 Vale Dourado</h1>
                    <div class="sub">Plante, produza e cumpra encomendas</div>
                </div>
                <div>
                    <div class="level-badge">Nível ${lvl}</div>
                    <div class="xp-track" style="margin-top:6px;"><div class="xp-fill" style="width:${xpProgress()}%"></div></div>
                </div>
            </div>
            <div class="header-right">
                ${Object.keys(RESOURCE_INFO).map(r => `
                    <div title="${RESOURCE_INFO[r].name}" style="font-size:.8rem; color:#e8dcb8; display:flex; gap:4px; align-items:center;">
                        <span>${RESOURCE_INFO[r].icon}</span><span>${fmt(state.resources[r] || 0)}</span>
                    </div>`).join('')}
                <div class="coin-pill">🪙 ${fmt(state.coins)}</div>
                <button class="icon-btn ${state.destroyMode ? 'danger' : ''}" data-action="destroy">${state.destroyMode ? '🗑️' : '🔧'}</button>
                <button class="icon-btn" data-action="save">💾 Salvar</button>
                <button class="icon-btn" data-action="load">📂 Carregar</button>
                <button id="music-toggle" class="icon-btn music-off" data-action="toggle-music">🔇 Música</button>
            </div>
        `;
        AudioSystem.updateButton();
    }
    
    function renderSidebar() {
        const lvl = getLevel();
        let body = '';
        
        if (state.activeTab === 'build') {
            body = `
                <div class="slot-card" style="background:var(--gold); border-color:var(--gold-dark);">
                    <div class="card-icon">🌾</div>
                    <div class="card-body">
                        <div class="card-title">Expandir Terreno</div>
                        <div class="card-meta">${Math.floor(state.grid.length / 8)}x${Math.floor(state.grid.length / 8)} · ${state.grid.length}/${MAX_GRID_SIZE}</div>
                    </div>
                    <button class="card-btn slot" data-action="expand">🪙 ${fmt(SLOT_UPGRADE_COST[Math.floor(state.grid.length / 8) - 5] || 9999)}</button>
                </div>
            `;
            
            body += Object.entries(PLACEABLES).map(([key, def]) => {
                const locked = lvl < def.levelReq;
                const selected = state.selectedBuild === key;
                const timeDisplay = def.cat === 'crop' ? `${def.growTime}s` : `${def.time}s`;
                const costLine = def.cat === 'crop'
                    ? `Colheita: +${def.yieldAmt} ${RESOURCE_INFO[def.yieldRes].icon} a cada ${timeDisplay}`
                    : `Usa ${Object.entries(def.input).map(([r, q]) => `${q} ${RESOURCE_INFO[r].icon}`).join(' + ')} → +${def.outputAmt} ${RESOURCE_INFO[def.outputRes].icon} (${timeDisplay})`;
                return `
                    <div class="build-card ${selected ? 'selected' : ''} ${locked ? 'locked' : ''}">
                        <div class="card-icon">${def.icon}</div>
                        <div class="card-body">
                            <div class="card-title">${def.name}</div>
                            <div class="card-meta">${costLine}</div>
                            ${locked ? `<div class="lock-tag">🔒 Desbloqueia no nível ${def.levelReq}</div>` : ''}
                        </div>
                        <button class="card-btn build" data-build-key="${key}" ${locked ? 'disabled' : ''}>
                            ${selected ? '✅' : `🪙 ${def.cost}`}
                        </button>
                    </div>`;
            }).join('');
        }
        
        if (state.activeTab === 'sell') {
            const any = Object.keys(RESOURCE_INFO).some(r => (state.resources[r] || 0) > 0);
            body = any ? Object.keys(RESOURCE_INFO).map(r => {
                const qty = state.resources[r] || 0;
                if (qty <= 0) return '';
                return `
                    <div class="sell-card">
                        <div class="card-icon">${RESOURCE_INFO[r].icon}</div>
                        <div class="card-body">
                            <div class="card-title">${RESOURCE_INFO[r].name}</div>
                            <div class="card-meta">${fmt(qty)} em estoque · ${SELL_PRICES[r]} 🪙 cada</div>
                        </div>
                        <button class="card-btn sell" data-sell-res="${r}">Vender (+${fmt(qty * SELL_PRICES[r])})</button>
                    </div>`;
            }).join('') : `<div class="empty-hint">Colha ou produza recursos para poder vendê-los aqui.</div>`;
        }
        
        if (state.activeTab === 'orders') {
            body = state.orders.length ? state.orders.map(o => {
                const can = (state.resources[o.res] || 0) >= o.qty;
                return `
                    <div class="order-card">
                        <div class="card-icon">${RESOURCE_INFO[o.res].icon}</div>
                        <div class="card-body">
                            <div class="card-title">${o.qty}x ${RESOURCE_INFO[o.res].name}</div>
                            <div class="card-meta">Recompensa: ${fmt(o.reward)} 🪙</div>
                        </div>
                        <button class="card-btn deliver" data-order-id="${o.id}" ${can ? '' : 'disabled'}>Entregar</button>
                    </div>`;
            }).join('') : `<div class="empty-hint">Nenhuma encomenda no momento. Volte em breve!</div>`;
        }
        
        document.getElementById('sidebar').innerHTML = `
            <div class="tabs">
                <div class="tab ${state.activeTab === 'build' ? 'active' : ''}" data-tab="build">🏗️ Construir</div>
                <div class="tab ${state.activeTab === 'sell' ? 'active' : ''}" data-tab="sell">💰 Vender</div>
                <div class="tab ${state.activeTab === 'orders' ? 'active' : ''}" data-tab="orders">📦 Encomendas ${state.orders.length ? `(${state.orders.length})` : ''}</div>
            </div>
            <div class="sidebar-body">${body}</div>
        `;
    }
    
    function renderGrid() {
        const slot = document.getElementById('placing-banner-slot');
        let bannerHTML = '';
        
        if (state.destroyMode) {
            bannerHTML = `
                <div class="placing-banner" style="background:var(--danger);">
                    <span>🗑️ Modo destruir ativado — Clique em uma construção para removê-la (reembolso de 50%)</span>
                    <button data-action="destroy">Desativar</button>
                </div>`;
        } else if (state.selectedBuild) {
            bannerHTML = `
                <div class="placing-banner">
                    <span>${PLACEABLES[state.selectedBuild].icon} Clique com botão esquerdo para construir ${PLACEABLES[state.selectedBuild].name}</span>
                    <div>
                        <span class="mode-badge">🖱️ Esquerdo: construir</span>
                        <button data-action="cancel-build">Cancelar</button>
                    </div>
                </div>`;
        }
        slot.innerHTML = bannerHTML;
        
        const cols = Math.floor(Math.sqrt(GRID_SIZE));
        document.getElementById('grid').style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        
        document.getElementById('grid').innerHTML = state.grid.map((tile, i) => {
            if (!tile.key) {
                const placeable = !!state.selectedBuild && !state.destroyMode;
                return `<div class="tile empty ${placeable ? 'placeable' : ''} ${state.destroyMode ? 'destroy-mode' : ''}" data-tile-index="${i}"></div>`;
            }
            const def = PLACEABLES[tile.key];
            if (!def) return `<div class="tile empty" data-tile-index="${i}"></div>`;
            const pct = Math.round(tile.progress * 100);
            const showProgress = tile.stage === 'growing' || tile.stage === 'processing';
            const content = getTileContent(tile, def);
            const isReady = tile.stage === 'ready';
            
            return `
                <div class="tile occupied ${tile.stage} ${state.destroyMode ? 'destroy-mode' : ''}" data-tile-index="${i}" title="${def.name}">
                    ${isReady ? '<span class="ready-mark">⭐</span>' : ''}
                    ${content}
                    ${showProgress ? `<div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>` : ''}
                    ${isReady && !state.destroyMode ? '<div class="collect-hint">🖱️ Direito para colher</div>' : ''}
                    ${state.destroyMode ? '<div class="collect-hint" style="background:var(--danger);">🗑️ Clique para remover</div>' : ''}
                </div>
            `;
        }).join('');
    }
    
    function renderAll() {
        renderHeader();
        renderSidebar();
        renderGrid();
    }
    
    /* ============ SALVAR / CARREGAR ============ */
    function saveGame() {
        try {
            const saveData = JSON.stringify(state);
            const blob = new Blob([saveData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `vale-dourado-save-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast('💾 Jogo salvo com sucesso!');
        } catch (e) {
            toast('❌ Erro ao salvar: ' + e.message);
            console.error('Save error:', e);
        }
    }
    
    function loadGame(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const loaded = JSON.parse(e.target.result);
                
                if (!loaded || typeof loaded !== 'object') throw new Error('Arquivo inválido');
                if (!loaded.grid || !Array.isArray(loaded.grid)) throw new Error('Grid inválido');
                if (!loaded.resources || typeof loaded.resources !== 'object') throw new Error('Recursos inválidos');
                if (typeof loaded.coins !== 'number' || typeof loaded.totalEarned !== 'number') throw new Error('Dados de moedas inválidos');
                
                state.coins = loaded.coins;
                state.totalEarned = loaded.totalEarned;
                state.resources = loaded.resources;
                state.grid = loaded.grid;
                state.orders = loaded.orders || [];
                state.nextOrderIn = loaded.nextOrderIn || 8;
                state.selectedBuild = null;
                state.activeTab = 'build';
                state.destroyMode = false;
                state.gridSize = loaded.gridSize || loaded.grid.length;
                GRID_SIZE = state.gridSize;
                
                if (loaded.orders && loaded.orders.length > 0) {
                    const maxId = Math.max(...loaded.orders.map(o => o.id || 0));
                    orderIdCounter = Math.max(maxId + 1, 1);
                } else {
                    orderIdCounter = 1;
                }
                
                renderAll();
                toast('✅ Progresso carregado com sucesso!');
            } catch (err) {
                toast('❌ Erro ao carregar: ' + err.message);
                console.error('Load error:', err);
            }
        };
        reader.onerror = function() {
            toast('❌ Erro ao ler o arquivo');
        };
        reader.readAsText(file);
    }
    
    /* ============ EVENTOS ============ */
    document.addEventListener('click', function(e) {
        const buildBtn = e.target.closest('[data-build-key]');
        if (buildBtn) {
            selectBuild(buildBtn.dataset.buildKey);
            return;
        }
        
        const tileEl = e.target.closest('[data-tile-index]');
        if (tileEl) {
            e.preventDefault();
            handleTileClick(Number(tileEl.dataset.tileIndex), false);
            return;
        }
        
        const sellBtn = e.target.closest('[data-sell-res]');
        if (sellBtn) {
            sellResource(sellBtn.dataset.sellRes);
            return;
        }
        
        const orderBtn = e.target.closest('[data-order-id]');
        if (orderBtn) {
            deliverOrder(Number(orderBtn.dataset.orderId));
            return;
        }
        
        const tabEl = e.target.closest('[data-tab]');
        if (tabEl) {
            setTab(tabEl.dataset.tab);
            return;
        }
        
        const actionEl = e.target.closest('[data-action]');
        if (actionEl) {
            const action = actionEl.dataset.action;
            if (action === 'save') saveGame();
            if (action === 'load') document.getElementById('load-input').click();
            if (action === 'cancel-build') {
                state.selectedBuild = null;
                renderAll();
            }
            if (action === 'toggle-music') AudioSystem.toggle();
            if (action === 'destroy') toggleDestroyMode();
            if (action === 'expand') expandGrid();
            return;
        }
    });
    
    document.addEventListener('contextmenu', function(e) {
        const tileEl = e.target.closest('[data-tile-index]');
        if (tileEl && !state.destroyMode) {
            e.preventDefault();
            handleTileClick(Number(tileEl.dataset.tileIndex), true);
        }
    });
    
    document.getElementById('load-input').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            loadGame(file);
        }
        e.target.value = '';
    });
    
    /* ============ START ============ */
    renderAll();
    setInterval(tick, 200);
    
    document.addEventListener('click', function initAudioOnClick() {
        if (!AudioSystem.isPlaying) {
            try {
                AudioSystem.init();
            } catch (e) {}
        }
        document.removeEventListener('click', initAudioOnClick);
    }, { once: true });
    
})();