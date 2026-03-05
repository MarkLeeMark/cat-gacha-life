// --- State Management ---
const INITIAL_STATE = {
    fish: 12500,
    gems: 320,
    hearts: 15,
    clickPower: 10,
    idlePower: 5,
    inventory: [],
    equipped: {
        hat: null,
        accessory: null,
        background: null
    }
};

let gameState = { ...INITIAL_STATE };

// Load from LocalStorage
function loadState() {
    const saved = localStorage.getItem('catGachaState');
    if (saved) {
        try {
            gameState = { ...INITIAL_STATE, ...JSON.parse(saved) };
        } catch (e) {
            console.error(e);
        }
    }
    updateUI();
}

function saveState() {
    localStorage.setItem('catGachaState', JSON.stringify(gameState));
    updateUI();
}

// --- Data ---
const ITEMS = {
    hat_frog: { id: 'hat_frog', type: 'hat', name: '개구리 모자', rarity: 'N', icon: '🐸' },
    hat_wizard: { id: 'hat_wizard', type: 'hat', name: '마법사 모자', rarity: 'SR', icon: '🧙' },
    hat_crown: { id: 'hat_crown', type: 'hat', name: '왕관', rarity: 'SSR', icon: '👑' },
    acc_scarf: { id: 'acc_scarf', type: 'accessory', name: '따뜻한 목도리', rarity: 'R', icon: '🧣' },
    acc_bell: { id: 'acc_bell', type: 'accessory', name: '고양이 방울', rarity: 'N', icon: '🔔' },
    bg_rug: { id: 'bg_rug', type: 'background', name: '하트 러그', rarity: 'N', icon: '💖' },
    bg_house: { id: 'bg_house', type: 'background', name: '럭키 하우스', rarity: 'SR', icon: '🏠' },
    currency_coin: { id: 'currency_coin', type: 'currency', name: '코인 1,500', rarity: 'N', icon: '🐟', value: 1500, currency: 'fish' },
    currency_gem: { id: 'currency_gem', type: 'currency', name: '젬 300', rarity: 'R', icon: '💎', value: 300, currency: 'gems' },
};

const SHOP_ITEMS = [
    { item_id: 'currency_coin', price: 100, currency: 'gems' },
    { item_id: 'currency_gem', price: 3900, currency: 'cash', textInfo: '₩3,900', pseudo: true }, // Visual only since no real payment
    { item_id: 'acc_scarf', price: 2000, currency: 'fish' },
    { item_id: 'hat_frog', price: 400, currency: 'gems' },
    { item_id: 'bg_rug', price: 700, currency: 'fish' },
    { item_id: 'bg_house', price: 1500, currency: 'gems' }
];

const GACHA_POOL = [
    ...Object.values(ITEMS).filter(i => i.type !== 'currency')
];

// --- Core Functions ---
function updateUI() {
    document.getElementById('fish-count').innerText = gameState.fish.toLocaleString();
    document.getElementById('gem-count').innerText = gameState.gems.toLocaleString();
    document.getElementById('heart-count').innerText = `${gameState.hearts}/30`;

    // Render Shop
    renderShop();

    // Render Inventory
    renderInventory();

    // Render Main Cat Equipment
    renderCatEquipment();
}

function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => {
        v.classList.add('hidden');
        v.classList.remove('active');
    });
    const view = document.getElementById(`view-${viewId}`);
    if (view) {
        view.classList.remove('hidden');
        view.classList.add('active');
    }
}

// --- Shop Logic ---
function renderShop() {
    const container = document.getElementById('shop-items-container');
    container.innerHTML = '';

    SHOP_ITEMS.forEach(shopItem => {
        const itemData = ITEMS[shopItem.item_id];
        if (!itemData) return;

        let isOwned = gameState.inventory.includes(itemData.id) && itemData.type !== 'currency';
        let btnText = isOwned ? '보유중' : '구매';
        let btnDisabled = isOwned ? 'disabled' : '';

        let priceHTML = `<div class="price">💎 ${shopItem.price}</div>`;
        if (shopItem.currency === 'fish') priceHTML = `<div class="price">🐟 ${shopItem.price}</div>`;
        if (shopItem.currency === 'cash') priceHTML = `<div class="price">💰 ${shopItem.textInfo}</div>`;

        const el = document.createElement('div');
        el.className = `item-card card-${itemData.rarity.toLowerCase()}`;
        el.innerHTML = `
      <div class="rarity-badge badge-${itemData.rarity.toLowerCase()}">${itemData.rarity}</div>
      <div class="item-name">${itemData.name}</div>
      <div class="item-icon">${itemData.icon}</div>
      ${priceHTML}
      <button class="buy-btn" ${btnDisabled} onclick="buyItem('${shopItem.item_id}', '${shopItem.currency}', ${shopItem.price})">${btnText}</button>
    `;
        container.appendChild(el);
    });
}

function buyItem(itemId, currency, price) {
    if (currency === 'cash') {
        alert("결제 시스템이 연동되지 않았습니다!");
        return;
    }

    if (gameState[currency] < price) {
        alert(`${currency === 'gems' ? '젬' : '코인'}(이)가 부족합니다!`);
        return;
    }

    const item = ITEMS[itemId];
    if (item.type === 'currency') {
        gameState[currency] -= price;
        gameState[item.currency] += item.value;
    } else {
        gameState[currency] -= price;
        gameState.inventory.push(itemId);
    }

    saveState();
    if (item.type !== 'currency') {
        showGachaResult([item]);
    } else {
        alert(`${item.name}을(를) 구매했습니다!`);
    }
}

// --- Inventory Logic ---
let currentCategory = 'all';

function renderInventory() {
    const container = document.getElementById('inventory-items-container');
    container.innerHTML = '';

    const filtered = gameState.inventory.filter(id => {
        if (currentCategory === 'all') return true;
        return ITEMS[id].type === currentCategory;
    });

    // Unique items and count
    const itemCounts = {};
    filtered.forEach(id => {
        itemCounts[id] = (itemCounts[id] || 0) + 1;
    });

    Object.keys(itemCounts).forEach(itemId => {
        const itemData = ITEMS[itemId];
        const isEquipped = Object.values(gameState.equipped).includes(itemId);
        const equipText = isEquipped ? '해제' : '장착';

        const el = document.createElement('div');
        el.className = `item-card card-${itemData.rarity.toLowerCase()}`;
        el.innerHTML = `
      <div class="rarity-badge badge-${itemData.rarity.toLowerCase()}">${itemData.rarity}</div>
      <div class="item-name">${itemData.name} (x${itemCounts[itemId]})</div>
      <div class="item-icon">${itemData.icon}</div>
      <button class="equip-btn" data-equipped="${isEquipped}" onclick="toggleEquip('${itemId}', '${itemData.type}')">${equipText}</button>
    `;
        container.appendChild(el);
    });

    // Update stats
    const uniqueItems = new Set(gameState.inventory);
    const totalItemsCount = Object.keys(ITEMS).filter(k => ITEMS[k].type !== 'currency').length;
    document.querySelector('.inventory-stats span').innerText = `⭐ 수집률 ${uniqueItems.size}/${totalItemsCount}`;
}

function toggleEquip(itemId, type) {
    if (gameState.equipped[type] === itemId) {
        gameState.equipped[type] = null; // Unequip
    } else {
        gameState.equipped[type] = itemId; // Equip
    }
    saveState();
    renderInventory();
    renderCatEquipment();
}

// Category listeners
document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentCategory = e.target.dataset.category;
        renderInventory();
    });
});

// --- Cat Appearance ---
function renderCatEquipment() {
    const allCatSprites = document.querySelectorAll('.player-cat');
    const eq = gameState.equipped;

    allCatSprites.forEach(sprite => {
        // Clear previous visual attachments
        sprite.innerHTML = `<div class="eyes"></div>`;

        if (eq.hat) {
            const hatDiv = document.createElement('div');
            hatDiv.style.position = 'absolute';
            hatDiv.style.top = '-40px';
            hatDiv.style.left = '50%';
            hatDiv.style.transform = 'translateX(-50%)';
            hatDiv.style.fontSize = '80px';
            hatDiv.style.zIndex = '10';
            hatDiv.innerText = ITEMS[eq.hat].icon;
            sprite.appendChild(hatDiv);
        }

        if (eq.accessory) {
            const accDiv = document.createElement('div');
            accDiv.style.position = 'absolute';
            accDiv.style.bottom = '10px';
            accDiv.style.left = '50%';
            accDiv.style.transform = 'translateX(-50%)';
            accDiv.style.fontSize = '50px';
            accDiv.style.zIndex = '10';
            accDiv.innerText = ITEMS[eq.accessory].icon;
            sprite.appendChild(accDiv);
        }
    });

    // For lobby and inventory backgrounds
    const playerContainers = document.querySelectorAll('.player-cat-preview');
    playerContainers.forEach(container => {
        if (eq.background) {
            container.style.background = 'radial-gradient(circle, rgba(255,200,200,0.8) 0%, transparent 60%)';
            // Add an icon as a background decoration
            const bgElem = document.createElement('div');
            bgElem.className = 'bg-decor';
            bgElem.style.position = 'absolute';
            bgElem.style.bottom = '-20px';
            bgElem.style.fontSize = '120px';
            bgElem.style.zIndex = '-1';
            bgElem.style.opacity = '0.5';
            bgElem.innerText = ITEMS[eq.background].icon;

            // remove old decors
            container.querySelectorAll('.bg-decor').forEach(d => d.remove());
            container.appendChild(bgElem);
        } else {
            container.style.background = 'transparent';
            container.querySelectorAll('.bg-decor').forEach(d => d.remove());
        }
    });
}


// --- Gacha Logic ---
function performGacha(times) {
    const cost = times === 1 ? 30 : 270;
    if (gameState.gems < cost) {
        alert('젬이 부족합니다!');
        return;
    }

    // Pay
    gameState.gems -= cost;

    // Roll
    const results = [];
    for (let i = 0; i < times; i++) {
        // simple random pulling, giving slightly higher chance to N and R
        const r = Math.random();
        let rarityPool = 'N';
        if (r > 0.95) rarityPool = 'SSR';
        else if (r > 0.8) rarityPool = 'SR';
        else if (r > 0.5) rarityPool = 'R';

        const validItems = GACHA_POOL.filter(item => item.rarity === rarityPool);
        const fallbackItems = GACHA_POOL.filter(item => item.rarity === 'N');
        const pool = validItems.length > 0 ? validItems : fallbackItems;

        const pull = pool[Math.floor(Math.random() * pool.length)];
        results.push(pull);
        gameState.inventory.push(pull.id);
    }

    saveState();
    showGachaResult(results);
}

function showGachaResult(results) {
    const overlay = document.getElementById('gacha-overlay');
    const container = document.getElementById('gacha-result-container');
    container.innerHTML = '';

    results.forEach(item => {
        const el = document.createElement('div');
        el.className = `item-card card-${item.rarity.toLowerCase()}`;
        el.style.width = '100px';
        el.innerHTML = `
      <div class="rarity-badge badge-${item.rarity.toLowerCase()}">${item.rarity}</div>
      <div class="item-icon">${item.icon}</div>
      <div class="item-name" style="font-size:0.9rem;">${item.name}</div>
    `;
        container.appendChild(el);
    });

    overlay.classList.remove('hidden');
}

function closeGachaModal() {
    document.getElementById('gacha-overlay').classList.add('hidden');
}

// Global click on gacha machine triggers 1 pull
document.getElementById('gacha-clicker').addEventListener('click', (e) => {
    e.stopPropagation();
    performGacha(1);
});

// --- Idle Clicker Logics ---
function clickCat() {
    const power = gameState.clickPower || 10;
    gameState.fish += power;

    // Show flying text effect
    showFloatingText(`+${power} 🐟`);

    // Update fish count text directly to avoid huge full re-renders
    const fishEl = document.getElementById('fish-count');
    if (fishEl) fishEl.innerText = gameState.fish.toLocaleString();

    saveState();
}

function showFloatingText(text) {
    const container = document.querySelector('.cat-character-container.lobby');
    const el = document.createElement('div');
    el.innerText = text;
    el.style.position = 'absolute';
    el.style.color = '#fff';
    el.style.fontWeight = 'bold';
    el.style.fontSize = '1.8rem';
    el.style.webkitTextStroke = '1px #ff7f50';
    el.style.textShadow = '2px 2px 0 #000';
    el.style.pointerEvents = 'none';
    el.style.left = `${40 + Math.random() * 20}%`;
    el.style.top = `${30 + Math.random() * 20}%`;
    el.style.transition = 'all 1s ease-out';
    el.style.zIndex = '50';

    container.appendChild(el);

    setTimeout(() => {
        el.style.transform = 'translateY(-50px)';
        el.style.opacity = '0';
    }, 50);

    setTimeout(() => el.remove(), 1050);
}

function setupIdleClicker() {
    setInterval(() => {
        const idleEarn = gameState.idlePower || 5;
        if (idleEarn > 0) {
            gameState.fish += idleEarn;

            const fishEl = document.getElementById('fish-count');
            if (fishEl) fishEl.innerText = gameState.fish.toLocaleString();

            // Periodically save
            if (Math.random() < 0.1) saveState();
        }
    }, 1000);
}

// Start
loadState();
switchView('lobby');
setupIdleClicker();
