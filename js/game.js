// Game Logic for Exploding Kittens
// Core game mechanics and state management

// Advance to next player's turn
async function advanceTurn(roomRef, gameState) {
    let nextIndex = gameState.currentTurnIndex + 1;
    
    // Loop until we find an alive player
    while (nextIndex < gameState.turnOrder.length) {
        const nextPlayerId = gameState.turnOrder[nextIndex];
        if (gameState.alivePlayers.includes(nextPlayerId)) {
            // Found next alive player
            await roomRef.child('game').update({
                currentTurnIndex: nextIndex,
                currentPlayerId: nextPlayerId,
                turnsRemaining: gameState.turnsRemaining - 1
            });
            return;
        }
        nextIndex++;
    }
    
    // If we reach here, wrap around to the beginning
    nextIndex = 0;
    while (nextIndex < gameState.turnOrder.length) {
        const nextPlayerId = gameState.turnOrder[nextIndex];
        if (gameState.alivePlayers.includes(nextPlayerId)) {
            await roomRef.child('game').update({
                currentTurnIndex: nextIndex,
                currentPlayerId: nextPlayerId,
                turnsRemaining: gameState.turnsRemaining - 1
            });
            return;
        }
        nextIndex++;
    }
}

// Remove a card from player's hand
function removeCardFromHand(hand, cardUid) {
    const index = hand.findIndex(c => c.uid === cardUid);
    if (index !== -1) {
        return hand.filter((_, i) => i !== index);
    }
    return hand;
}

// Add card to player's hand
function addCardToHand(hand, card) {
    return [...hand, card];
}

// Draw card from deck
function drawCardFromDeck(deck) {
    if (deck.length === 0) {
        // Deck habis - ini seharusnya tidak terjadi kecuali semua bom sudah defused
        return { deck: [], card: null, deckEmpty: true };
    }
    const newDeck = [...deck];
    const card = newDeck.shift(); // Draw from top
    return { deck: newDeck, card, deckEmpty: false };
}

// Insert card into deck at specific position
function insertCardInDeck(deck, card, position) {
    const newDeck = [...deck];
    // Clamp position between 0 and deck length
    const insertPos = Math.max(0, Math.min(position, newDeck.length));
    newDeck.splice(insertPos, 0, card);
    return newDeck;
}

// Check if player has a specific card type
function hasCardType(hand, cardId) {
    return hand.some(card => card.id === cardId);
}

// Count cards of a specific type
function countCardType(hand, cardId) {
    return hand.filter(card => card.id === cardId).length;
}

// Get pairs of cat cards
function getCatPairs(hand) {
    const catTypes = ['cat_taco', 'cat_melon', 'cat_potato', 'cat_beard', 'cat_rainbow'];
    const pairs = [];
    
    catTypes.forEach(catType => {
        const count = countCardType(hand, catType);
        if (count >= 2) {
            const cards = hand.filter(c => c.id === catType).slice(0, 2);
            pairs.push({
                type: catType,
                cards: cards
            });
        }
    });
    
    return pairs;
}

// Validate if an action can be performed
function canPlayCard(gameState, playerId, cardId) {
    // Player must be alive
    if (!gameState.alivePlayers.includes(playerId)) {
        return { valid: false, reason: 'Pemain sudah mati' };
    }
    
    // Check if it's player's turn for certain cards
    if (gameState.currentPlayerId !== playerId && cardId !== 'nope') {
        return { valid: false, reason: 'Bukan giliran kamu' };
    }
    
    // Check if player has the card
    const hand = gameState.hands[playerId];
    if (!hasCardType(hand, cardId)) {
        return { valid: false, reason: 'Kartu tidak ada di tangan' };
    }
    
    // Certain cards can't be played manually
    const unplayableCards = ['exploding_kitten', 'defuse'];
    if (unplayableCards.includes(cardId)) {
        return { valid: false, reason: 'Kartu ini tidak bisa dimainkan langsung' };
    }
    
    return { valid: true };
}

// Process card effect
async function processCardEffect(roomRef, gameState, playerId, card, targetId = null) {
    const newGameState = { ...gameState };
    const playerHand = [...newGameState.hands[playerId]];
    
    // Remove card from hand and add to discard pile
    newGameState.hands[playerId] = removeCardFromHand(playerHand, card.uid);
    newGameState.discardPile = [...(newGameState.discardPile || []), card];
    
    // Process based on card type
    switch (card.id) {
        case 'attack':
            // Next player takes 2 turns
            newGameState.turnsRemaining = (newGameState.turnsRemaining || 1) + 1;
            newGameState.lastAction = {
                type: 'attack',
                playerId: playerId,
                timestamp: Date.now()
            };
            // End current turn immediately
            await roomRef.child('game').update(newGameState);
            await advanceTurn(roomRef, newGameState);
            break;
            
        case 'skip':
            // End turn without drawing
            newGameState.turnsRemaining = Math.max(0, (newGameState.turnsRemaining || 1) - 1);
            newGameState.lastAction = {
                type: 'skip',
                playerId: playerId,
                timestamp: Date.now()
            };
            await roomRef.child('game').update(newGameState);
            if (newGameState.turnsRemaining === 0) {
                await advanceTurn(roomRef, newGameState);
            }
            break;
            
        case 'shuffle':
            // Shuffle the deck
            newGameState.deck = shuffleDeck(newGameState.deck);
            newGameState.lastAction = {
                type: 'shuffle',
                playerId: playerId,
                timestamp: Date.now()
            };
            await roomRef.child('game').update(newGameState);
            break;
            
        case 'see_the_future':
            // Show top 3 cards (handled in player.js)
            newGameState.lastAction = {
                type: 'see_future',
                playerId: playerId,
                cards: newGameState.deck.slice(0, 3),
                timestamp: Date.now()
            };
            await roomRef.child('game').update(newGameState);
            break;
            
        case 'favor':
            // Request card from target player
            if (!targetId) {
                return { success: false, reason: 'Target tidak dipilih' };
            }
            newGameState.pendingAction = {
                type: 'favor',
                fromPlayerId: playerId,
                toPlayerId: targetId,
                timestamp: Date.now()
            };
            newGameState.lastAction = {
                type: 'favor',
                playerId: playerId,
                targetId: targetId,
                timestamp: Date.now()
            };
            await roomRef.child('game').update(newGameState);
            break;
            
        default:
            // Unknown card
            await roomRef.child('game').update(newGameState);
    }
    
    return { success: true };
}

// Handle exploding kitten draw
async function handleExplosion(roomRef, gameState, playerId) {
    const playerHand = gameState.hands[playerId];
    const hasDefuse = hasCardType(playerHand, 'defuse');
    
    if (hasDefuse) {
        // Player can defuse - return defuse option
        return {
            survived: true,
            hasDefuse: true,
            message: 'Gunakan Defuse untuk survive!'
        };
    } else {
        // Player explodes
        const newGameState = { ...gameState };
        newGameState.alivePlayers = newGameState.alivePlayers.filter(id => id !== playerId);
        newGameState.lastAction = {
            type: 'exploded',
            playerId: playerId,
            timestamp: Date.now()
        };
        
        // Check for winner
        if (newGameState.alivePlayers.length === 1) {
            newGameState.status = 'finished';
            newGameState.winner = newGameState.alivePlayers[0];
        } else {
            // Advance to next player
            await roomRef.child('game').update(newGameState);
            await advanceTurn(roomRef, newGameState);
        }
        
        await roomRef.child('game').update(newGameState);
        
        return {
            survived: false,
            hasDefuse: false,
            message: '💥 BOOM! Kamu meledak!'
        };
    }
}

// Use defuse card
async function useDefuse(roomRef, gameState, playerId, explodingCard, insertPosition) {
    const newGameState = { ...gameState };
    const playerHand = [...newGameState.hands[playerId]];
    
    // Find and remove defuse card
    const defuseCard = playerHand.find(c => c.id === 'defuse');
    if (!defuseCard) {
        return { success: false, reason: 'Tidak punya kartu Defuse' };
    }
    
    newGameState.hands[playerId] = removeCardFromHand(playerHand, defuseCard.uid);
    newGameState.discardPile = [...(newGameState.discardPile || []), defuseCard];
    
    // Insert exploding kitten back into deck at chosen position
    newGameState.deck = insertCardInDeck(newGameState.deck, explodingCard, insertPosition);
    
    newGameState.lastAction = {
        type: 'defused',
        playerId: playerId,
        position: insertPosition,
        timestamp: Date.now()
    };
    
    // End turn and advance
    await roomRef.child('game').update(newGameState);
    await advanceTurn(roomRef, newGameState);
    
    return { success: true };
}

// Transfer card between players (for Favor)
async function transferCard(roomRef, gameState, fromPlayerId, toPlayerId, cardUid) {
    const newGameState = { ...gameState };
    
    const fromHand = [...newGameState.hands[fromPlayerId]];
    const card = fromHand.find(c => c.uid === cardUid);
    
    if (!card) {
        return { success: false, reason: 'Kartu tidak ditemukan' };
    }
    
    // Remove from giver, add to receiver
    newGameState.hands[fromPlayerId] = removeCardFromHand(fromHand, cardUid);
    newGameState.hands[toPlayerId] = addCardToHand(newGameState.hands[toPlayerId], card);
    
    // Clear pending action
    newGameState.pendingAction = null;
    
    newGameState.lastAction = {
        type: 'favor_completed',
        fromPlayerId: fromPlayerId,
        toPlayerId: toPlayerId,
        timestamp: Date.now()
    };
    
    await roomRef.child('game').update(newGameState);
    
    return { success: true };
}

// Play cat pair to steal random card
async function playCatPair(roomRef, gameState, playerId, catCards, targetId) {
    if (catCards.length !== 2) {
        return { success: false, reason: 'Butuh 2 kartu kucing yang sama' };
    }
    
    if (catCards[0].id !== catCards[1].id) {
        return { success: false, reason: 'Kartu kucing harus sama' };
    }
    
    const newGameState = { ...gameState };
    const playerHand = [...newGameState.hands[playerId]];
    const targetHand = [...newGameState.hands[targetId]];
    
    if (targetHand.length === 0) {
        return { success: false, reason: 'Target tidak punya kartu' };
    }
    
    // Remove cat cards from player
    catCards.forEach(card => {
        newGameState.hands[playerId] = removeCardFromHand(newGameState.hands[playerId], card.uid);
    });
    
    // Add to discard pile
    newGameState.discardPile = [...(newGameState.discardPile || []), ...catCards];
    
    // Steal random card from target
    const randomIndex = Math.floor(Math.random() * targetHand.length);
    const stolenCard = targetHand[randomIndex];
    
    newGameState.hands[targetId] = removeCardFromHand(targetHand, stolenCard.uid);
    newGameState.hands[playerId] = addCardToHand(newGameState.hands[playerId], stolenCard);
    
    newGameState.lastAction = {
        type: 'cat_pair_steal',
        playerId: playerId,
        targetId: targetId,
        stolenCard: stolenCard,
        timestamp: Date.now()
    };
    
    await roomRef.child('game').update(newGameState);
    
    return { success: true, stolenCard: stolenCard };
}

// Check game over condition
function checkGameOver(gameState) {
    if (gameState.alivePlayers.length <= 1) {
        return {
            isOver: true,
            winner: gameState.alivePlayers[0] || null
        };
    }
    return { isOver: false };
}

// Format time remaining
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Get player name from players object
function getPlayerName(players, playerId) {
    return players[playerId] ? players[playerId].name : 'Unknown';
}

// Get player avatar
function getPlayerAvatar(players, playerId) {
    return players[playerId] ? players[playerId].avatar : '❓';
}
