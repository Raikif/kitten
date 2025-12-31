// Player Controller for Exploding Kittens

let roomCode = '';
let playerId = '';
let playerName = '';
let roomRef = null;
let gameState = null;
let myHand = [];
let isMyTurn = false;
let players = {}; // Track all players in room

// DOM Elements
const joinScreen = document.getElementById('join-screen');
const waitingScreen = document.getElementById('waiting-screen');
const playerGameScreen = document.getElementById('player-game-screen');
const explodedScreen = document.getElementById('exploded-screen');
const winnerScreen = document.getElementById('player-winner-screen');

// Wait for Firebase
window.addEventListener('firebaseReady', initPlayer);

function initPlayer() {
    // Check URL params for room code
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl) {
        document.getElementById('room-code-input').value = roomFromUrl.toUpperCase();
    }
    
    setupEventListeners();
    setupTabs();
    setupQRScanner();
}

function setupEventListeners() {
    document.getElementById('join-btn').addEventListener('click', joinRoom);
    document.getElementById('draw-card-zone').addEventListener('click', drawCard);
    document.getElementById('nope-btn').addEventListener('click', playNope);
    document.getElementById('cancel-card-btn').addEventListener('click', closeCardModal);
    document.getElementById('cancel-target-btn').addEventListener('click', closeTargetModal);
    document.getElementById('sort-cards-btn').addEventListener('click', sortCards);
    document.getElementById('player-play-again-btn').addEventListener('click', () => {
        window.location.reload();
    });
    
    // Audio toggle
    const playerAudioToggle = document.getElementById('player-audio-toggle');
    if (playerAudioToggle) {
        playerAudioToggle.addEventListener('click', () => {
            const isMuted = audioController.toggleMute();
            playerAudioToggle.textContent = isMuted ? '🔇' : '🔊';
            playerAudioToggle.classList.toggle('muted', isMuted);
        });
        // Set initial state
        playerAudioToggle.textContent = audioController.getMuteState() ? '🔇' : '🔊';
        playerAudioToggle.classList.toggle('muted', audioController.getMuteState());
    }
    
    // Hand card clicks
    document.getElementById('player-hand').addEventListener('click', (e) => {
        const card = e.target.closest('.card');
        if (card && isMyTurn) {
            handleCardClick(card);
        }
    });
}

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            document.getElementById(`${btn.dataset.tab}-tab`).classList.remove('hidden');
        });
    });
}

function setupQRScanner() {
    try {
        const html5QrCode = new Html5Qrcode("qr-reader");
        const qrCodeSuccessCallback = (decodedText) => {
            html5QrCode.stop();
            // Extract room code from URL
            const url = new URL(decodedText);
            const room = url.searchParams.get('room');
            if (room) {
                document.getElementById('room-code-input').value = room;
                document.querySelector('[data-tab="code"]').click();
            }
        };
        
        document.querySelector('[data-tab="qr"]').addEventListener('click', () => {
            setTimeout(() => {
                html5QrCode.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: 250 },
                    qrCodeSuccessCallback
                );
            }, 100);
        });
    } catch (e) {
        console.log('QR Scanner not available');
    }
}

async function joinRoom() {
    roomCode = document.getElementById('room-code-input').value.toUpperCase().trim();
    playerName = document.getElementById('player-name-input').value.trim();
    
    if (!roomCode || roomCode.length !== 6) {
        showError('Masukkan kode room yang valid (6 karakter)');
        return;
    }
    
    if (!playerName || playerName.length < 2) {
        showError('Masukkan nama kamu (min. 2 karakter)');
        return;
    }
    
    // Check if room exists
    const roomSnapshot = await db.ref('rooms/' + roomCode).once('value');
    if (!roomSnapshot.exists()) {
        showError('Room tidak ditemukan!');
        return;
    }
    
    const roomData = roomSnapshot.val();
    if (roomData.status !== 'waiting') {
        showError('Game sudah dimulai!');
        return;
    }
    
    const existingPlayers = roomData.players ? Object.values(roomData.players) : [];
    if (existingPlayers.length >= 8) {
        showError('Room sudah penuh! (max 8 pemain)');
        return;
    }
    
    // Join room
    playerId = generatePlayerId();
    const usedAvatars = existingPlayers.map(p => p.avatar);
    
    roomRef = db.ref('rooms/' + roomCode);
    await roomRef.child('players/' + playerId).set({
        id: playerId,
        name: playerName,
        avatar: getRandomAvatar(usedAvatars),
        joinedAt: Date.now()
    });
    
    // Handle disconnect
    roomRef.child('players/' + playerId).onDisconnect().remove();
    
    // Show waiting screen
    showScreen('waiting');
    audioController.playJoinSound();
    document.getElementById('joined-room-code').textContent = roomCode;
    document.getElementById('joined-player-name').textContent = playerName;
    
    // Listen for game start
    roomRef.child('status').on('value', (snapshot) => {
        if (snapshot.val() === 'playing') {
            showScreen('game');
        }
    });
    
    // Listen for game state
    roomRef.child('game').on('value', (snapshot) => {
        if (snapshot.exists()) {
            gameState = snapshot.val();
            updatePlayerGameScreen();
        }
    });
    
    // Listen for players
    roomRef.child('players').on('value', (snapshot) => {
        players = snapshot.val() || {};
        updateWaitingPlayers(Object.values(players));
    });
}

function showError(message) {
    audioController.playErrorSound();
    const errorDiv = document.getElementById('join-error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => errorDiv.classList.add('hidden'), 3000);
}

function showScreen(screen) {
    joinScreen.classList.add('hidden');
    waitingScreen.classList.add('hidden');
    playerGameScreen.classList.add('hidden');
    explodedScreen.classList.add('hidden');
    winnerScreen.classList.add('hidden');
    
    switch(screen) {
        case 'join':
            joinScreen.classList.remove('hidden');
            break;
        case 'waiting':
            waitingScreen.classList.remove('hidden');
            break;
        case 'game':
            playerGameScreen.classList.remove('hidden');
            break;
        case 'exploded':
            explodedScreen.classList.remove('hidden');
            break;
        case 'winner':
            winnerScreen.classList.remove('hidden');
            break;
    }
}

function updateWaitingPlayers(players) {
    const list = document.getElementById('waiting-players-list');
    list.innerHTML = players.map(p => `<span>${p.avatar} ${p.name}</span>`).join(' • ');
}

function updatePlayerGameScreen() {
    if (!gameState) return;
    
    // Check if player is alive
    const isAlive = gameState.alivePlayers && gameState.alivePlayers.includes(playerId);
    
    if (!isAlive && gameState.status === 'playing') {
        showScreen('exploded');
        return;
    }
    
    // Check for winner
    if (gameState.alivePlayers && gameState.alivePlayers.length === 1) {
        const winnerId = gameState.alivePlayers[0];
        if (winnerId === playerId) {
            document.getElementById('player-result-title').textContent = '🏆 KAMU MENANG!';
            document.getElementById('player-result-text').textContent = 'Selamat! Kamu adalah survivor terakhir!';
        } else {
            document.getElementById('player-result-title').textContent = '💀 Game Over';
            document.getElementById('player-result-text').textContent = 'Kamu kalah!';
        }
        showScreen('winner');
        return;
    }
    
    // Update turn status
    isMyTurn = gameState.currentPlayerId === playerId;
    const turnIndicator = document.getElementById('my-turn-indicator');
    const statusText = document.getElementById('player-status-text');
    const drawZone = document.getElementById('draw-card-zone');
    
    if (isMyTurn) {
        turnIndicator.classList.remove('hidden');
        statusText.textContent = 'Giliran kamu! Mainkan kartu atau ambil kartu.';
        drawZone.classList.remove('disabled');
    } else {
        turnIndicator.classList.add('hidden');
        statusText.textContent = 'Menunggu giliran...';
        drawZone.classList.add('disabled');
    }
    
    // Update game info
    document.getElementById('p-deck-count').textContent = gameState.deck ? gameState.deck.length : 0;
    document.getElementById('p-players-alive').textContent = gameState.alivePlayers ? gameState.alivePlayers.length : 0;
    
    // Update hand
    myHand = gameState.hands && gameState.hands[playerId] ? gameState.hands[playerId] : [];
    renderHand();
    
    // Show Nope button if someone played a card
    const nopeBtn = document.getElementById('nope-btn');
    if (gameState.nopeWindow && !isMyTurn && hasNope()) {
        nopeBtn.classList.remove('hidden');
    } else {
        nopeBtn.classList.add('hidden');
    }
    
    // Handle exploding kitten
    if (gameState.pendingAction && gameState.pendingAction.type === 'exploding' && 
        gameState.pendingAction.playerId === playerId) {
        handleExplodingKitten();
    }
    
    // Handle favor request
    if (gameState.pendingAction && gameState.pendingAction.type === 'favor_request' &&
        gameState.pendingAction.targetId === playerId) {
        handleFavorRequest();
    }
}

function renderHand() {
    const handContainer = document.getElementById('player-hand');
    handContainer.innerHTML = myHand.map((card, index) => getCardHTML(card, index)).join('');
}

function hasNope() {
    return myHand.some(card => card.id === 'nope');
}

function hasDefuse() {
    return myHand.some(card => card.id === 'defuse');
}

function handleCardClick(cardElement) {
    if (!isMyTurn) return;
    
    const cardId = cardElement.dataset.id;
    const cardIndex = parseInt(cardElement.dataset.index);
    const card = myHand[cardIndex];
    
    if (!card) return;
    
    // Check if card is playable
    if (cardId === 'exploding_kitten' || cardId === 'defuse') {
        showCardModal('❌ Tidak Bisa Dimainkan', 'Kartu ini tidak bisa dimainkan langsung!');
        return;
    }
    
    // Check for cat card pairs
    if (cardId.startsWith('cat_')) {
        const sameCards = myHand.filter(c => c.id === cardId);
        if (sameCards.length >= 2) {
            // Show option to play as pair
            showCardModal('🐱 Cat Pair', `
                <p>Kamu punya ${sameCards.length} kartu ${card.name}!</p>
                <button class="btn btn-primary" onclick="playCatPairWithSelection('${cardId}')">
                    Mainkan 2 kartu untuk mencuri kartu random
                </button>
            `);
        } else {
            showCardModal('⚠️ Tidak Cukup', 'Kamu butuh 2 kartu kucing yang sama untuk memainkannya!');
        }
        return;
    }
    
    // Play the card
    playCard(card, cardIndex);
}

// Function to play cat pair
window.playCatPairWithSelection = async function(catId) {
    closeCardModal();
    
    // Get the first 2 cards of this type
    const catCards = myHand.filter(c => c.id === catId).slice(0, 2);
    if (catCards.length < 2) return;
    
    // Show target selection
    showTargetSelectionForCatPair(catCards);
}

function showTargetSelectionForCatPair(catCards) {
    const targetModal = document.getElementById('target-modal');
    const targetList = document.getElementById('target-list');
    
    const alivePlayers = gameState.alivePlayers.filter(id => id !== playerId);
    
    targetList.innerHTML = alivePlayers.map(targetId => {
        const targetPlayer = gameState.hands[targetId];
        const cardCount = targetPlayer ? targetPlayer.length : 0;
        
        return `
            <button class="btn target-btn" onclick="executeCatPairSteal('${targetId}', '${catCards[0].uid}', '${catCards[1].uid}')">
                ${getPlayerAvatar(players, targetId)} ${getPlayerName(players, targetId)}
                <br><small>(${cardCount} kartu)</small>
            </button>
        `;
    }).join('');
    
    targetModal.classList.remove('hidden');
}

window.executeCatPairSteal = async function(targetId, card1Uid, card2Uid) {
    closeTargetModal();
    
    audioController.playStealSound();
    
    const card1 = myHand.find(c => c.uid === card1Uid);
    const card2 = myHand.find(c => c.uid === card2Uid);
    
    if (!card1 || !card2) return;
    
    try {
        const result = await playCatPair(roomRef, gameState, playerId, [card1, card2], targetId);
        
        if (result.success) {
            showCardModal('✅ Berhasil!', `
                Kamu mencuri: ${result.stolenCard.emoji} ${result.stolenCard.name}
            `);
            setTimeout(closeCardModal, 2000);
        }
    } catch (error) {
        console.error('Cat pair error:', error);
        showCardModal('❌ Error', 'Gagal memainkan kartu');
    }
}

function getPlayerAvatar(players, playerId) {
    return players[playerId] ? players[playerId].avatar : '❓';
}

function getPlayerName(players, playerId) {
    return players[playerId] ? players[playerId].name : 'Unknown';
}

function playCard(card, cardIndex) {
    if (!isMyTurn) return;
    
    audioController.playCardSound();
    
    switch(card.id) {
        case 'attack':
            executeAttack(card, cardIndex);
            break;
        case 'skip':
            executeSkip(card, cardIndex);
            break;
        case 'shuffle':
            executeShuffle(card, cardIndex);
            break;
        case 'see_the_future':
            executeSeeTheFuture(card, cardIndex);
            break;
        case 'favor':
            showTargetSelection(card, cardIndex, 'favor');
            break;
        case 'nope':
            // Nope is played reactively
            break;
        default:
            break;
    }
}

async function executeAttack(card, cardIndex) {
    // Remove card from hand
    const newHand = [...myHand];
    newHand.splice(cardIndex, 1);
    
    // Get next player
    const currentIndex = gameState.turnOrder.indexOf(playerId);
    let nextIndex = (currentIndex + 1) % gameState.turnOrder.length;
    while (!gameState.alivePlayers.includes(gameState.turnOrder[nextIndex])) {
        nextIndex = (nextIndex + 1) % gameState.turnOrder.length;
    }
    const nextPlayerId = gameState.turnOrder[nextIndex];
    
    // Update game state
    const updates = {
        [`hands/${playerId}`]: newHand,
        'discardPile': [...(gameState.discardPile || []), card],
        'currentPlayerId': nextPlayerId,
        'currentTurnIndex': nextIndex,
        'turnsRemaining': (gameState.turnsRemaining || 1) + 1,
        'lastAction': {
            type: 'attack',
            playerId: playerId,
            message: `⚔️ ${playerName} menyerang! Giliran berikutnya ambil 2 kartu!`
        }
    };
    
    await roomRef.child('game').update(updates);
}

async function executeSkip(card, cardIndex) {
    const newHand = [...myHand];
    newHand.splice(cardIndex, 1);
    
    const turnsRemaining = (gameState.turnsRemaining || 1) - 1;
    
    if (turnsRemaining <= 0) {
        // Move to next player
        const currentIndex = gameState.turnOrder.indexOf(playerId);
        let nextIndex = (currentIndex + 1) % gameState.turnOrder.length;
        while (!gameState.alivePlayers.includes(gameState.turnOrder[nextIndex])) {
            nextIndex = (nextIndex + 1) % gameState.turnOrder.length;
        }
        
        await roomRef.child('game').update({
            [`hands/${playerId}`]: newHand,
            'discardPile': [...(gameState.discardPile || []), card],
            'currentPlayerId': gameState.turnOrder[nextIndex],
            'currentTurnIndex': nextIndex,
            'turnsRemaining': 1,
            'lastAction': {
                type: 'skip',
                playerId: playerId,
                message: `⏭️ ${playerName} melewati giliran!`
            }
        });
    } else {
        await roomRef.child('game').update({
            [`hands/${playerId}`]: newHand,
            'discardPile': [...(gameState.discardPile || []), card],
            'turnsRemaining': turnsRemaining,
            'lastAction': {
                type: 'skip',
                playerId: playerId,
                message: `⏭️ ${playerName} melewati 1 giliran! Sisa ${turnsRemaining} giliran.`
            }
        });
    }
}

async function executeShuffle(card, cardIndex) {
    audioController.playShuffleSound();
    const newHand = [...myHand];
    newHand.splice(cardIndex, 1);
    
    const shuffledDeck = shuffleDeck([...gameState.deck]);
    
    await roomRef.child('game').update({
        [`hands/${playerId}`]: newHand,
        'deck': shuffledDeck,
        'discardPile': [...(gameState.discardPile || []), card],
        'lastAction': {
            type: 'shuffle',
            playerId: playerId,
            message: `🔀 ${playerName} mengocok deck!`
        }
    });
}

async function executeSeeTheFuture(card, cardIndex) {
    const newHand = [...myHand];
    newHand.splice(cardIndex, 1);
    
    // Get last 3 cards since we draw from the back (pop)
    const deckLength = gameState.deck.length;
    const topCards = gameState.deck.slice(Math.max(0, deckLength - 3), deckLength).reverse();
    
    // Show cards to player
    showCardModal('🔮 3 Kartu Teratas', topCards.map((c, i) => `
        <div class="card ${c.cssClass}" style="width:80px;height:110px;display:inline-flex;margin:5px;padding:5px;flex-direction:column;">
            <div class="card-image" style="height:75px;width:100%;">
                <img src="${c.image}" alt="${c.name}" style="width:100%;height:100%;object-fit:contain;" onerror="this.outerHTML='<span class=\"emoji\" style=\"font-size:2rem\">${c.emoji}</span>'">
            </div>
            <span class="name" style="font-size:0.65rem;">${i === 0 ? '1st' : i === 1 ? '2nd' : '3rd'}</span>
        </div>
    `).join(''));
    
    await roomRef.child('game').update({
        [`hands/${playerId}`]: newHand,
        'discardPile': [...(gameState.discardPile || []), card],
        'lastAction': {
            type: 'see_future',
            playerId: playerId,
            message: `🔮 ${playerName} melihat masa depan!`
        },
        'pendingAction': {
            type: 'see_future',
            playerId: playerId
        }
    });
    
    setTimeout(() => {
        roomRef.child('game/pendingAction').remove();
    }, 3000);
}

function showTargetSelection(card, cardIndex, actionType) {
    const modal = document.getElementById('target-modal');
    const targetList = document.getElementById('target-list');
    
    const otherPlayers = gameState.alivePlayers.filter(id => id !== playerId);
    
    targetList.innerHTML = '';
    
    roomRef.child('players').once('value', (snapshot) => {
        const players = snapshot.val() || {};
        
        otherPlayers.forEach(targetId => {
            const target = players[targetId];
            if (target) {
                const btn = document.createElement('button');
                btn.className = 'target-btn';
                btn.textContent = `${target.avatar} ${target.name}`;
                btn.onclick = () => {
                    modal.classList.add('hidden');
                    executeFavor(card, cardIndex, targetId, target.name);
                };
                targetList.appendChild(btn);
            }
        });
    });
    
    modal.classList.remove('hidden');
}

async function executeFavor(card, cardIndex, targetId, targetName) {
    const newHand = [...myHand];
    newHand.splice(cardIndex, 1);
    
    await roomRef.child('game').update({
        [`hands/${playerId}`]: newHand,
        'discardPile': [...(gameState.discardPile || []), card],
        'pendingAction': {
            type: 'favor_request',
            playerId: playerId,
            targetId: targetId,
            playerName: playerName
        },
        'lastAction': {
            type: 'favor',
            playerId: playerId,
            message: `🎁 ${playerName} meminta kartu dari ${targetName}!`
        }
    });
}

function handleFavorRequest() {
    if (myHand.length === 0) {
        roomRef.child('game/pendingAction').remove();
        return;
    }
    
    const modal = document.getElementById('card-modal');
    const title = document.getElementById('card-modal-title');
    const body = document.getElementById('card-modal-body');
    const cancelBtn = document.getElementById('cancel-card-btn');
    
    // Hide cancel button - must give a card!
    if (cancelBtn) cancelBtn.style.display = 'none';
    
    title.textContent = `🎁 ${gameState.pendingAction.playerName} meminta kartu!`;
    body.innerHTML = `
        <p>Pilih kartu untuk diberikan:</p>
        <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:15px;">
            ${myHand.map((card, i) => `
                <div class="card ${card.cssClass}" data-index="${i}" onclick="giveCard(${i})" style="cursor:pointer;width:90px;height:125px;padding:5px;">
                    <div class="card-image" style="height:85px;width:100%;">
                        <img src="${card.image}" alt="${card.name}" style="width:100%;height:100%;object-fit:contain;" onerror="this.outerHTML='<span class=\"emoji\" style=\"font-size:2rem\">${card.emoji}</span>'">
                    </div>
                    <span class="name" style="font-size:0.65rem;">${card.name}</span>
                </div>
            `).join('')}
        </div>
    `;
    
    modal.classList.remove('hidden');
}

window.giveCard = async function(cardIndex) {
    const card = myHand[cardIndex];
    const newHand = [...myHand];
    newHand.splice(cardIndex, 1);
    
    const requesterId = gameState.pendingAction.playerId;
    const requesterHand = [...(gameState.hands[requesterId] || []), card];
    
    await roomRef.child('game').update({
        [`hands/${playerId}`]: newHand,
        [`hands/${requesterId}`]: requesterHand,
        'pendingAction': null,
        'lastAction': {
            type: 'favor_given',
            message: `🎁 ${playerName} memberikan kartu!`
        }
    });
    
    // Re-enable cancel button
    const cancelBtn = document.getElementById('cancel-card-btn');
    if (cancelBtn) cancelBtn.style.display = '';
    
    closeCardModal();
}

async function drawCard() {
    const drawZone = document.getElementById('draw-card-zone');
    if (!isMyTurn || drawZone.classList.contains('disabled')) return;
    
    audioController.playDrawSound();
    
    const deck = [...gameState.deck];
    
    // Cek deck kosong - game selesai!
    if (deck.length === 0) {
        showCardModal('🎊 DECK HABIS!', `
            <p style="font-size: 1.2rem; margin: 20px 0;">Semua kartu sudah diambil!</p>
            <p>🏆 Pemain yang masih hidup adalah pemenangnya!</p>
            <p style="margin-top: 20px; color: var(--secondary);">Menunggu host mengumumkan pemenang...</p>
        `);
        
        // Update game state - set status finished
        const alivePlayers = gameState.alivePlayers || [];
        if (alivePlayers.length > 0) {
            await roomRef.child('game').update({
                status: 'finished',
                winner: alivePlayers[0],
                'lastAction': {
                    type: 'deck_empty',
                    message: '🎊 Deck habis! Game selesai!'
                }
            });
        }
        return;
    }
    
    const drawnCard = deck.pop();
    
    // Show card back with flip animation
    showFlippableCard(drawnCard, deck);
}

function showFlippableCard(drawnCard, deck) {
    // Create flip card modal
    const modal = document.createElement('div');
    modal.className = 'flip-card-modal';
    modal.innerHTML = `
        <div class="flip-card-overlay"></div>
        <div class="flip-card-container">
            <div class="flip-card">
                <div class="flip-card-inner">
                    <div class="flip-card-front">
                        <img src="assets/card-back.webp" alt="Card Back" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; font-size: 3rem;">🎴</div>
                    </div>
                    <div class="flip-card-back">
                        ${getCardHTML(drawnCard)}
                    </div>
                </div>
            </div>
            <p class="flip-card-hint">👆 Klik kartu untuk membuka!</p>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Animate in
    setTimeout(() => modal.classList.add('active'), 10);
    
    // Click to flip
    const flipCard = modal.querySelector('.flip-card-inner');
    const flipCardContainer = modal.querySelector('.flip-card-container');
    let isFlipped = false;
    
    flipCardContainer.addEventListener('click', async () => {
        if (isFlipped) return;
        isFlipped = true;
        
        flipCard.classList.add('flipped');
        audioController.playCardSound();
        
        // Wait for flip animation then process card
        setTimeout(async () => {
            await processDrawnCard(drawnCard, deck);
            
            // Remove modal after processing
            setTimeout(() => {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            }, 800);
        }, 600);
    });
}

async function processDrawnCard(drawnCard, deck) {
    // Check if it's an Exploding Kitten
    if (drawnCard.id === 'exploding_kitten') {
        await roomRef.child('game').update({
            'deck': deck,
            'pendingAction': {
                type: 'exploding',
                playerId: playerId,
                card: drawnCard
            },
            'lastAction': {
                type: 'draw_exploding',
                playerId: playerId,
                message: `💣 ${playerName} mengambil Exploding Kitten!!!`
            }
        });
    } else {
        // Add to hand and end turn
        const newHand = [...myHand, drawnCard];
        
        const turnsRemaining = (gameState.turnsRemaining || 1) - 1;
        
        if (turnsRemaining <= 0) {
            // Next player's turn
            const currentIndex = gameState.turnOrder.indexOf(playerId);
            let nextIndex = (currentIndex + 1) % gameState.turnOrder.length;
            while (!gameState.alivePlayers.includes(gameState.turnOrder[nextIndex])) {
                nextIndex = (nextIndex + 1) % gameState.turnOrder.length;
            }
            
            await roomRef.child('game').update({
                'deck': deck,
                [`hands/${playerId}`]: newHand,
                'currentPlayerId': gameState.turnOrder[nextIndex],
                'currentTurnIndex': nextIndex,
                'turnsRemaining': 1,
                'lastAction': {
                    type: 'draw',
                    playerId: playerId,
                    message: `📥 ${playerName} mengambil kartu.`
                }
            });
        } else {
            await roomRef.child('game').update({
                'deck': deck,
                [`hands/${playerId}`]: newHand,
                'turnsRemaining': turnsRemaining,
                'lastAction': {
                    type: 'draw',
                    playerId: playerId,
                    message: `📥 ${playerName} mengambil kartu. Sisa ${turnsRemaining} giliran.`
                }
            });
        }
    }
}

async function handleExplodingKitten() {
    if (hasDefuse()) {
        // Show defuse option
        const modal = document.getElementById('card-modal');
        const title = document.getElementById('card-modal-title');
        const body = document.getElementById('card-modal-body');
        
        title.textContent = '💣 EXPLODING KITTEN!';
        body.innerHTML = `
            <p style="font-size:3rem;">💣🐱</p>
            <p>Kamu punya Defuse! Gunakan?</p>
            <button class="btn btn-primary" onclick="useDefuse()">🛡️ Gunakan Defuse</button>
        `;
        modal.classList.remove('hidden');
    } else {
        // Player explodes
        await explodePlayer();
    }
}

window.useDefuse = async function() {
    closeCardModal();
    
    // Find and remove defuse card
    const defuseIndex = myHand.findIndex(c => c.id === 'defuse');
    const defuseCard = myHand[defuseIndex];
    const newHand = [...myHand];
    newHand.splice(defuseIndex, 1);
    
    // Put Exploding Kitten back in deck at random position
    const deck = [...gameState.deck];
    const randomPos = Math.floor(Math.random() * (deck.length + 1));
    deck.splice(randomPos, 0, gameState.pendingAction.card);
    
    // Move to next player
    const currentIndex = gameState.turnOrder.indexOf(playerId);
    let nextIndex = (currentIndex + 1) % gameState.turnOrder.length;
    while (!gameState.alivePlayers.includes(gameState.turnOrder[nextIndex])) {
        nextIndex = (nextIndex + 1) % gameState.turnOrder.length;
    }
    
    await roomRef.child('game').update({
        'deck': deck,
        [`hands/${playerId}`]: newHand,
        'discardPile': [...(gameState.discardPile || []), defuseCard],
        'pendingAction': { type: 'defused', playerId: playerId },
        'currentPlayerId': gameState.turnOrder[nextIndex],
        'currentTurnIndex': nextIndex,
        'turnsRemaining': 1,
        'lastAction': {
            type: 'defused',
            playerId: playerId,
            message: `🛡️ ${playerName} menggunakan Defuse dan selamat!`
        }
    });
    
    setTimeout(() => {
        roomRef.child('game/pendingAction').remove();
    }, 2000);
}

async function explodePlayer() {
    audioController.playExplodeSound();
    
    const newAlivePlayers = gameState.alivePlayers.filter(id => id !== playerId);
    
    // Find next alive player for turn
    let nextPlayerId = gameState.currentPlayerId;
    if (newAlivePlayers.length > 0) {
        const currentIndex = gameState.turnOrder.indexOf(playerId);
        let nextIndex = (currentIndex + 1) % gameState.turnOrder.length;
        while (!newAlivePlayers.includes(gameState.turnOrder[nextIndex])) {
            nextIndex = (nextIndex + 1) % gameState.turnOrder.length;
        }
        nextPlayerId = gameState.turnOrder[nextIndex];
    }
    
    await roomRef.child('game').update({
        'alivePlayers': newAlivePlayers,
        'pendingAction': null,
        [`hands/${playerId}`]: [],
        'currentPlayerId': nextPlayerId,
        'turnsRemaining': 1,
        'lastAction': {
            type: 'exploded',
            playerId: playerId,
            message: `💥 ${playerName} meledak! 💀`
        }
    });
    
    showScreen('exploded');
}

async function playNope() {
    const nopeIndex = myHand.findIndex(c => c.id === 'nope');
    if (nopeIndex === -1) return;
    
    const nopeCard = myHand[nopeIndex];
    const newHand = [...myHand];
    newHand.splice(nopeIndex, 1);
    
    await roomRef.child('game').update({
        [`hands/${playerId}`]: newHand,
        'discardPile': [...(gameState.discardPile || []), nopeCard],
        'nopeWindow': false,
        'lastAction': {
            type: 'nope',
            playerId: playerId,
            message: `🚫 ${playerName} menggunakan NOPE!`
        }
    });
}

function showCardModal(title, content) {
    const modal = document.getElementById('card-modal');
    document.getElementById('card-modal-title').textContent = title;
    document.getElementById('card-modal-body').innerHTML = content;
    modal.classList.remove('hidden');
}

function closeCardModal() {
    document.getElementById('card-modal').classList.add('hidden');
}

function closeTargetModal() {
    document.getElementById('target-modal').classList.add('hidden');
}

function sortCards() {
    // Sort cards by type: Defuse > Action cards > Cat cards > Exploding
    const cardOrder = {
        'defuse': 1,
        'attack': 2,
        'skip': 3,
        'favor': 4,
        'shuffle': 5,
        'see_the_future': 6,
        'nope': 7,
        'cat_taco': 8,
        'cat_melon': 9,
        'cat_potato': 10,
        'cat_beard': 11,
        'cat_rainbow': 12,
        'exploding_kitten': 13
    };
    
    myHand.sort((a, b) => {
        const orderA = cardOrder[a.id] || 99;
        const orderB = cardOrder[b.id] || 99;
        return orderA - orderB;
    });
    
    audioController.playShuffleSound();
    renderHand();
}