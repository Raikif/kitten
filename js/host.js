// Host Controller for Exploding Kittens

let roomCode = '';
let roomRef = null;
let gameState = null;
let players = {};
let timerInterval = null;

// DOM Elements
const lobbyScreen = document.getElementById('lobby-screen');
const gameScreen = document.getElementById('game-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const roomCodeDisplay = document.getElementById('room-code');
const qrCodeContainer = document.getElementById('qr-code');
const playersList = document.getElementById('players-list');
const playerCount = document.getElementById('player-count');
const startGameBtn = document.getElementById('start-game-btn');

// QR Code Generation Function
function generateQRCode(url) {
    qrCodeContainer.innerHTML = '<div class="qr-loading">Generating QR...</div>';
    
    // Method 1: Try QRCode library (toCanvas)
    if (typeof QRCode !== 'undefined' && QRCode.toCanvas) {
        try {
            const canvas = document.createElement('canvas');
            QRCode.toCanvas(canvas, url, {
                width: 180,
                margin: 2,
                color: {
                    dark: '#1a1a2e',
                    light: '#ffffff'
                }
            }, (error) => {
                if (!error) {
                    qrCodeContainer.innerHTML = '';
                    canvas.style.borderRadius = '12px';
                    qrCodeContainer.appendChild(canvas);
                    console.log('✅ QR Code generated with toCanvas');
                } else {
                    tryQRCodeAPI(url);
                }
            });
            return;
        } catch (e) {
            console.log('toCanvas failed, trying API...', e);
        }
    }
    
    // Method 2: Use QR Code API (fallback)
    tryQRCodeAPI(url);
}

function tryQRCodeAPI(url) {
    // Use Google Charts API for QR code
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=1a1a2e`;
    
    const img = document.createElement('img');
    img.onload = function() {
        qrCodeContainer.innerHTML = '';
        img.style.borderRadius = '12px';
        img.style.display = 'block';
        qrCodeContainer.appendChild(img);
        console.log('✅ QR Code generated with API');
    };
    img.onerror = function() {
        showQRFallback();
    };
    img.src = qrApiUrl;
    img.alt = 'QR Code to join room';
}

function showQRFallback() {
    qrCodeContainer.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 3rem; margin-bottom: 10px;">📱</div>
            <p style="margin: 0; font-size: 0.9rem; color: #666;">
                Buka di HP:<br>
                <strong style="color: #1a1a2e; font-size: 1rem;">player.html?room=${roomCode}</strong>
            </p>
        </div>
    `;
}

// Wait for Firebase
window.addEventListener('firebaseReady', initHost);

function initHost() {
    createRoom();
    setupEventListeners();
    // Start background music (only on host screen)
    audioController.playBacksound();
}

function createRoom() {
    roomCode = generateRoomCode();
    roomCodeDisplay.textContent = roomCode;
    
    // Generate QR Code
    const joinUrl = `${window.location.origin}${window.location.pathname.replace('host.html', 'player.html')}?room=${roomCode}`;
    
    // Generate QR using multiple methods for reliability
    generateQRCode(joinUrl);
    
    // Create room in Firebase
    roomRef = db.ref('rooms/' + roomCode);
    roomRef.set({
        code: roomCode,
        status: 'waiting',
        createdAt: Date.now(),
        players: {},
        game: null
    });
    
    // Clean up on disconnect
    roomRef.onDisconnect().remove();
    
    // Listen for players
    roomRef.child('players').on('value', (snapshot) => {
        const newPlayers = snapshot.val() || {};
        // Play join sound if new player added
        if (Object.keys(newPlayers).length > Object.keys(players).length) {
            audioController.playJoinSound();
        }
        players = newPlayers;
        updatePlayersList();
    });
    
    // Listen for game state
    roomRef.child('game').on('value', (snapshot) => {
        if (snapshot.exists()) {
            gameState = snapshot.val();
            updateGameScreen();
        }
    });
}

function setupEventListeners() {
    startGameBtn.addEventListener('click', () => {
        audioController.playButtonClick();
        startGame();
    });
    document.getElementById('play-again-btn').addEventListener('click', () => {
        audioController.playButtonClick();
        resetGame();
    });
    document.getElementById('back-to-lobby-btn').addEventListener('click', () => {
        audioController.playButtonClick();
        backToLobby();
    });
    
    // Audio toggle
    const audioToggle = document.getElementById('audio-toggle');
    if (audioToggle) {
        audioToggle.addEventListener('click', () => {
            const isMuted = audioController.toggleMute();
            audioToggle.textContent = isMuted ? '🔇' : '🔊';
            audioToggle.classList.toggle('muted', isMuted);
        });
        // Set initial state
        audioToggle.textContent = audioController.getMuteState() ? '🔇' : '🔊';
        audioToggle.classList.toggle('muted', audioController.getMuteState());
    }
}

function updatePlayersList() {
    const playerArray = Object.values(players);
    playerCount.textContent = playerArray.length;
    
    playersList.innerHTML = playerArray.map(player => `
        <div class="player-card">
            <div class="avatar">${player.avatar}</div>
            <div class="name">${player.name}</div>
        </div>
    `).join('');
    
    // Enable start button if enough players
    startGameBtn.disabled = playerArray.length < 2;
    startGameBtn.textContent = playerArray.length < 2 
        ? '🚀 Mulai Game (Min. 2 Pemain)' 
        : `🚀 Mulai Game (${playerArray.length} Pemain)`;
}

function startGame() {
    const playerIds = Object.keys(players);
    if (playerIds.length < 2 || playerIds.length > 8) {
        alert('Butuh 2-8 pemain untuk memulai!');
        return;
    }
    
    // Create deck and deal cards
    const deck = createDeck(playerIds.length);
    const { hands, deck: remainingDeck } = dealCards(deck, players);
    
    // Randomize turn order
    const shuffledPlayerIds = shuffleDeck([...playerIds]);
    
    // Initialize game state
    const newGameState = {
        status: 'playing',
        deck: remainingDeck,
        discardPile: [],
        hands: hands,
        turnOrder: shuffledPlayerIds,
        currentTurnIndex: 0,
        currentPlayerId: shuffledPlayerIds[0],
        turnsRemaining: 1,
        alivePlayers: shuffledPlayerIds,
        lastAction: null,
        pendingAction: null,
        nopeWindow: false,
        nopeTimeout: null,
        winner: null,
        startedAt: Date.now()
    };
    
    // Update Firebase
    roomRef.update({
        status: 'playing',
        game: newGameState
    });
    
    // Show game screen
    showScreen('game');
    addLog('🎮 Game dimulai!');
    audioController.playTurnChange();
}

function showScreen(screen) {
    lobbyScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');
    
    switch(screen) {
        case 'lobby':
            lobbyScreen.classList.remove('hidden');
            break;
        case 'game':
            gameScreen.classList.remove('hidden');
            break;
        case 'gameover':
            gameoverScreen.classList.remove('hidden');
            break;
    }
}

function updateGameScreen() {
    if (!gameState) return;
    
    // Update deck count
    const deckCount = gameState.deck ? gameState.deck.length : 0;
    document.getElementById('deck-count').textContent = deckCount;
    
    // Cek jika deck kosong dan game masih playing - auto finish
    if (deckCount === 0 && gameState.status === 'playing') {
        const alivePlayers = gameState.alivePlayers || [];
        if (alivePlayers.length > 0) {
            roomRef.child('game').update({
                status: 'finished',
                winner: alivePlayers[0]
            });
            addLog('🎊 Deck habis! Game selesai!');
        }
    }
    
    // Update discard pile - show last 10 cards
    const discardPile = gameState.discardPile || [];
    const last10Cards = discardPile.slice(-10);
    
    if (last10Cards.length > 0) {
        document.getElementById('last-played-card').innerHTML = last10Cards.map(card => `
            <div class="discard-card ${card.cssClass}">
                <div class="card-image">
                    <img src="${card.image}" alt="${card.name}">
                </div>
                <span class="name">${card.name}</span>
            </div>
        `).join('');
    } else {
        document.getElementById('last-played-card').innerHTML = '<div style="color: rgba(255,255,255,0.3); padding: 20px;">Belum ada kartu</div>';
    }
    
    // Update current player
    const currentPlayer = players[gameState.currentPlayerId];
    document.getElementById('current-player-name').textContent = currentPlayer 
        ? `${currentPlayer.avatar} ${currentPlayer.name}` 
        : '-';
    
    // Start/Update turn timer
    startTurnTimer();
    
    // Update player cards
    const gamePlayers = document.getElementById('game-players');
    gamePlayers.innerHTML = gameState.turnOrder.map(playerId => {
        const player = players[playerId];
        if (!player) return '';
        
        const isCurrentTurn = playerId === gameState.currentPlayerId;
        const isAlive = gameState.alivePlayers.includes(playerId);
        const cardCount = gameState.hands[playerId] ? gameState.hands[playerId].length : 0;
        
        return `
            <div class="game-player-card ${isCurrentTurn ? 'current-turn' : ''} ${!isAlive ? 'exploded' : ''}">
                <div class="avatar">${player.avatar}</div>
                <div class="name">${player.name}</div>
                <div class="card-count">${isAlive ? `🃏 ${cardCount} kartu` : '💀 Meledak'}</div>
            </div>
        `;
    }).join('');
    
    // Check for winner
    if (gameState.alivePlayers.length === 1) {
        const winnerId = gameState.alivePlayers[0];
        const winner = players[winnerId];
        showGameOver(winner);
    }
    
    // Show pending actions
    if (gameState.pendingAction) {
        showActionModal(gameState.pendingAction);
    }
}

// Timer functionality
function startTurnTimer() {
    // Clear existing timer
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    const timerDisplay = document.getElementById('turn-timer');
    let timeLeft = 60; // 60 detik per giliran
    
    // Set initial display
    timerDisplay.textContent = timeLeft;
    timerDisplay.style.color = 'var(--primary)';
    
    timerInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = timeLeft;
        
        // Change color based on time left
        if (timeLeft <= 10) {
            timerDisplay.style.color = 'var(--danger)';
            timerDisplay.style.animation = 'timerWarning 0.5s ease-in-out infinite';
        } else if (timeLeft <= 30) {
            timerDisplay.style.color = 'var(--warning)';
        }
        
        // Auto skip turn when time runs out
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            addLog(`⏰ Waktu habis! ${players[gameState.currentPlayerId]?.name} diskip otomatis`);
            
            // Force draw card or skip turn (implement auto-action here if needed)
            // For now, just advance turn
            if (roomRef && gameState) {
                advanceTurn(roomRef, gameState);
            }
        }
    }, 1000);
}

function showActionModal(action) {
    const modal = document.getElementById('action-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    
    switch(action.type) {
        case 'see_future':
            audioController.playBeep(1000, 100, 'sine');
            title.textContent = '🔮 Melihat Masa Depan...';
            const topCards = gameState.deck.slice(0, 3);
            body.innerHTML = `
                <p>${players[action.playerId]?.name} melihat 3 kartu teratas:</p>
                <div style="display:flex;gap:10px;justify-content:center;margin-top:15px;">
                    ${topCards.map((card, i) => `
                        <div class="card ${card.cssClass}" style="width:80px;height:110px;padding:5px;">
                            <div class="card-image" style="height:75px;width:100%;">
                                <img src="${card.image}" alt="${card.name}" style="width:100%;height:100%;object-fit:contain;">
                            </div>
                            <span class="name" style="font-size:0.65rem;">${i + 1}</span>
                        </div>
                    `).join('')}
                </div>
            `;
            modal.classList.remove('hidden');
            setTimeout(() => modal.classList.add('hidden'), 3000);
            break;
            
        case 'exploding':
            audioController.playExplodeSound();
            title.textContent = '💣 EXPLODING KITTEN!';
            body.innerHTML = `
                <p style="font-size:3rem;">💣🐱💥</p>
                <p>${players[action.playerId]?.name} mengambil Exploding Kitten!</p>
            `;
            modal.classList.remove('hidden');
            break;
            
        case 'defused':
            audioController.playDefuseSound();
            title.textContent = '🛡️ DEFUSED!';
            body.innerHTML = `
                <p style="font-size:3rem;">🛡️✨</p>
                <p>${players[action.playerId]?.name} berhasil menjinakkan bom!</p>
            `;
            modal.classList.remove('hidden');
            setTimeout(() => modal.classList.add('hidden'), 2000);
            break;
    }
}

function addLog(message) {
    const logContent = document.getElementById('game-log-content');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logContent.insertBefore(entry, logContent.firstChild);
}

function showGameOver(winner) {
    audioController.playWinSound();
    showScreen('gameover');
    document.getElementById('winner-display').innerHTML = `
        <div class="avatar" style="font-size:5rem;">${winner.avatar}</div>
        <h2>${winner.name}</h2>
        <p>🏆 Adalah Pemenangnya! 🏆</p>
    `;
}

function resetGame() {
    // Reset to waiting state
    roomRef.update({
        status: 'waiting',
        game: null
    });
    showScreen('lobby');
}

function backToLobby() {
    roomRef.remove();
    window.location.href = 'index.html';
}

// Listen for game logs
if (roomRef) {
    roomRef.child('game/lastAction').on('value', (snapshot) => {
        if (snapshot.exists()) {
            const action = snapshot.val();
            if (action && action.message) {
                addLog(action.message);
            }
        }
    });
}