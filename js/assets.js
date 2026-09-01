// ============================================
// ASSETS - Configuração de GIFs e imagens
// ============================================

const ASSETS = {
    // Caminho base para os GIFs
    basePath: 'assets/gifs/',
    
    // Configuração de GIFs para cada construção
    gifs: {
        // Plantações
        wheat_field: {
            default: 'crops/wheat.gif',
            sprout: 'crops/wheat_sprout.gif',
            growing: 'crops/wheat_growing.gif',
            ready: 'crops/wheat_ready.gif'
        },
        corn_field: {
            default: 'crops/corn.gif',
            sprout: 'crops/corn_sprout.gif',
            growing: 'crops/corn_growing.gif',
            ready: 'crops/corn_ready.gif'
        },
        carrot_field: {
            default: 'crops/carrot.gif',
            sprout: 'crops/carrot_sprout.gif',
            growing: 'crops/carrot_growing.gif',
            ready: 'crops/carrot_ready.gif'
        },
        grape_field: {
            default: 'crops/grape.gif',
            sprout: 'crops/grape_sprout.gif',
            growing: 'crops/grape_growing.gif',
            ready: 'crops/grape_ready.gif'
        },
        pumpkin_field: {
            default: 'crops/pumpkin.gif',
            sprout: 'crops/pumpkin_sprout.gif',
            growing: 'crops/pumpkin_growing.gif',
            ready: 'crops/pumpkin_ready.gif'
        },
        
        // Fábricas
        mill: {
            default: 'factories/mill.gif',
            working: 'factories/mill_working.gif',
            ready: 'factories/mill_ready.gif'
        },
        coop: {
            default: 'factories/coop.gif',
            working: 'factories/coop_working.gif',
            ready: 'factories/coop_ready.gif'
        },
        bakery: {
            default: 'factories/bakery.gif',
            working: 'factories/bakery_working.gif',
            ready: 'factories/bakery_ready.gif'
        },
        winery: {
            default: 'factories/winery.gif',
            working: 'factories/winery_working.gif',
            ready: 'factories/winery_ready.gif'
        },
        candy_factory: {
            default: 'factories/candy_factory.gif',
            working: 'factories/candy_factory_working.gif',
            ready: 'factories/candy_factory_ready.gif'
        },
        cachaça_factory: {
            default: 'factories/cachaça_factory.gif',
            working: 'factories/cachaça_factory_working.gif',
            ready: 'factories/cachaça_factory_ready.gif'
        }
    },
    
    // Fallback para emojis (caso o GIF não carregue)
    fallbackIcons: {
        wheat_field: '🌾',
        corn_field: '🌽',
        carrot_field: '🥕',
        grape_field: '🍇',
        pumpkin_field: '🎃',
        mill: '⚙️',
        coop: '🐔',
        bakery: '🍞',
        winery: '🍷',
        candy_factory: '🍬',
        cachaça_factory: '🥃'
    },
    
    // Obter GIF para um tile específico
    getGif: function(tileKey, stage, progress) {
        const config = this.gifs[tileKey];
        if (!config) return null;
        
        // Para plantações em crescimento
        if (stage === 'growing') {
            if (progress < 0.33) return config.sprout || config.default;
            if (progress < 0.66) return config.growing || config.default;
            return config.ready || config.default;
        }
        
        // Para fábricas processando
        if (stage === 'processing') {
            return config.working || config.default;
        }
        
        // Pronto para colher
        if (stage === 'ready') {
            return config.ready || config.default;
        }
        
        // Estado padrão
        return config.default;
    },
    
    // Obter fallback (emoji)
    getFallback: function(tileKey) {
        return this.fallbackIcons[tileKey] || '❓';
    },
    
    // Construir caminho completo do GIF
    getFullPath: function(relativePath) {
        if (!relativePath) return null;
        return this.basePath + relativePath;
    }
};

// Verificar se os GIFs existem (carregamento)
function checkGifExists(path) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = path;
    });
}