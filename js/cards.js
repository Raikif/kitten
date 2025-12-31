// Card Definitions for Exploding Kittens
const CARD_TYPES = {
    EXPLODING_KITTEN: {
        id: 'exploding_kitten',
        name: 'Exploding Kitten',
        emoji: '💣',
        image: 'assets/exploiding-kitten.webp',
        description: 'Kamu meledak! Gunakan Defuse atau kamu kalah!',
        cssClass: 'exploding'
    },
    DEFUSE: {
        id: 'defuse',
        name: 'Defuse',
        emoji: '🛡️',
        image: 'assets/defuse.webp',
        description: 'Menjinakkan Exploding Kitten',
        cssClass: 'defuse'
    },
    ATTACK: {
        id: 'attack',
        name: 'Attack',
        emoji: '⚔️',
        image: 'assets/attack.webp',
        description: 'Akhiri giliran tanpa ambil kartu. Pemain berikutnya ambil 2 kartu.',
        cssClass: 'attack'
    },
    SKIP: {
        id: 'skip',
        name: 'Skip',
        emoji: '⏭️',
        image: 'assets/skip.webp',
        description: 'Akhiri giliran tanpa ambil kartu.',
        cssClass: 'skip'
    },
    FAVOR: {
        id: 'favor',
        name: 'Favor',
        emoji: '🎁',
        image: 'assets/favor.webp',
        description: 'Paksa pemain lain memberikan 1 kartu.',
        cssClass: 'favor'
    },
    SHUFFLE: {
        id: 'shuffle',
        name: 'Shuffle',
        emoji: '🔀',
        image: 'assets/shuffle.webp',
        description: 'Kocok ulang deck.',
        cssClass: 'shuffle'
    },
    SEE_THE_FUTURE: {
        id: 'see_the_future',
        name: 'See Future',
        emoji: '🔮',
        image: 'assets/see-future.webp',
        description: 'Lihat 3 kartu teratas deck.',
        cssClass: 'see-future'
    },
    NOPE: {
        id: 'nope',
        name: 'Nope',
        emoji: '🚫',
        image: 'assets/nope.webp',
        description: 'Batalkan aksi pemain lain (kecuali Exploding/Defuse).',
        cssClass: 'nope'
    },
    // Cat Cards (untuk kombinasi)
    CAT_TACO: {
        id: 'cat_taco',
        name: 'Taco Cat',
        emoji: '🌮',
        image: 'assets/cat-taco.webp',
        description: 'Kartu kucing. Kumpulkan 2 sama untuk mencuri kartu.',
        cssClass: 'cat'
    },
    CAT_MELON: {
        id: 'cat_melon',
        name: 'Melon Cat',
        emoji: '🍈',
        image: 'assets/cat-melon.webp',
        description: 'Kartu kucing. Kumpulkan 2 sama untuk mencuri kartu.',
        cssClass: 'cat'
    },
    CAT_POTATO: {
        id: 'cat_potato',
        name: 'Potato Cat',
        emoji: '🥔',
        image: 'assets/cat-potato.webp',
        description: 'Kartu kucing. Kumpulkan 2 sama untuk mencuri kartu.',
        cssClass: 'cat'
    },
    CAT_BEARD: {
        id: 'cat_beard',
        name: 'Beard Cat',
        emoji: '🧔',
        image: 'assets/cat-beard.webp',
        description: 'Kartu kucing. Kumpulkan 2 sama untuk mencuri kartu.',
        cssClass: 'cat'
    },
    CAT_RAINBOW: {
        id: 'cat_rainbow',
        name: 'Rainbow Cat',
        emoji: '🌈',
        image: 'assets/cat-rainbow.webp',
        description: 'Kartu kucing. Kumpulkan 2 sama untuk mencuri kartu.',
        cssClass: 'cat'
    }
};

// Create deck based on player count (2-8 players)
function createDeck(playerCount) {
    let deck = [];
    
    // JANGAN tambahkan Exploding Kittens dulu - akan ditambah setelah deal
    // Ini memastikan tidak ada player yang langsung dapat bom
    
    // Add Defuse cards - hanya 2 extra di deck
    // Setiap player sudah dapat 1 Defuse di tangan
    // Total Defuse = playerCount (di tangan) + 2 (di deck)
    for (let i = 0; i < 2; i++) {
        deck.push({ ...CARD_TYPES.DEFUSE, uid: generateCardId() });
    }
    
    // Add Attack cards (4)
    for (let i = 0; i < 4; i++) {
        deck.push({ ...CARD_TYPES.ATTACK, uid: generateCardId() });
    }
    
    // Add Skip cards (4)
    for (let i = 0; i < 4; i++) {
        deck.push({ ...CARD_TYPES.SKIP, uid: generateCardId() });
    }
    
    // Add Favor cards (4)
    for (let i = 0; i < 4; i++) {
        deck.push({ ...CARD_TYPES.FAVOR, uid: generateCardId() });
    }
    
    // Add Shuffle cards (4)
    for (let i = 0; i < 4; i++) {
        deck.push({ ...CARD_TYPES.SHUFFLE, uid: generateCardId() });
    }
    
    // Add See the Future cards (5)
    for (let i = 0; i < 5; i++) {
        deck.push({ ...CARD_TYPES.SEE_THE_FUTURE, uid: generateCardId() });
    }
    
    // Add Nope cards (5)
    for (let i = 0; i < 5; i++) {
        deck.push({ ...CARD_TYPES.NOPE, uid: generateCardId() });
    }
    
    // Add Cat cards (4 of each type)
    const catTypes = ['CAT_TACO', 'CAT_MELON', 'CAT_POTATO', 'CAT_BEARD', 'CAT_RAINBOW'];
    catTypes.forEach(catType => {
        for (let i = 0; i < 4; i++) {
            deck.push({ ...CARD_TYPES[catType], uid: generateCardId() });
        }
    });
    
    return deck;
}

// Shuffle deck
function shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Generate unique card ID
function generateCardId() {
    return 'card_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Deal initial hands
function dealCards(deck, players) {
    const hands = {};
    
    // Shuffle deck (tidak ada bom di deck ini)
    const shuffledDeck = shuffleDeck([...deck]);
    
    // Deal 7 cards + 1 Defuse to each player
    Object.keys(players).forEach(playerId => {
        hands[playerId] = [];
        
        // Give 1 Defuse
        hands[playerId].push({ ...CARD_TYPES.DEFUSE, uid: generateCardId() });
        
        // Deal 7 cards
        for (let i = 0; i < 7; i++) {
            if (shuffledDeck.length > 0) {
                hands[playerId].push(shuffledDeck.pop());
            }
        }
    });
    
    // SEKARANG tambahkan Exploding Kittens
    // Formula: Total Bom = Total Defuse + (playerCount - 1)
    // Total Defuse = playerCount (di tangan) + 2 (di deck) = playerCount + 2
    // Maka: Bom = (playerCount + 2) + (playerCount - 1) = 2*playerCount + 1
    const numPlayers = Object.keys(players).length;
    const totalDefuse = numPlayers + 2; // Each player gets 1, plus 2 extra in deck
    const totalBombs = totalDefuse + (numPlayers - 1);
    
    const explodingKittens = [];
    for (let i = 0; i < totalBombs; i++) {
        explodingKittens.push({ ...CARD_TYPES.EXPLODING_KITTEN, uid: generateCardId() });
    }
    
    // Gabungkan sisa deck dengan bom
    const combinedDeck = [...shuffledDeck, ...explodingKittens];
    
    // Shuffle BENAR-BENAR ACAK berkali-kali untuk memastikan distribusi merata
    // Bom bisa di posisi mana saja: awal, tengah, atau akhir
    let finalDeck = shuffleDeck(combinedDeck);
    finalDeck = shuffleDeck(finalDeck); // Shuffle lagi untuk extra randomness
    finalDeck = shuffleDeck(finalDeck); // Dan sekali lagi!
    
    return { hands, deck: finalDeck };
}

// Get card display info
function getCardHTML(card, index = 0) {
    return `
        <div class="card ${card.cssClass}" data-index="${index}" data-id="${card.id}" data-uid="${card.uid}">
            <div class="card-image">
                <img src="${card.image}" alt="${card.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <span class="emoji-fallback" style="display:none;">${card.emoji}</span>
            </div>
            <span class="name">${card.name}</span>
        </div>
    `;
}

// Check if card is playable
function isPlayableCard(card) {
    const nonPlayable = ['exploding_kitten', 'defuse'];
    const catCards = ['cat_taco', 'cat_melon', 'cat_potato', 'cat_beard', 'cat_rainbow'];
    
    // Cat cards need pairs to play
    if (catCards.includes(card.id)) {
        return false; // Will be handled separately for pairs
    }
    
    return !nonPlayable.includes(card.id);
}

// Avatar list
const AVATARS = ['🐱', '🐶', '🐼', '🦊', '🐨', '🐯', '🦁', '🐸'];

function getRandomAvatar(usedAvatars = []) {
    const available = AVATARS.filter(a => !usedAvatars.includes(a));
    if (available.length === 0) return AVATARS[Math.floor(Math.random() * AVATARS.length)];
    return available[Math.floor(Math.random() * available.length)];
}