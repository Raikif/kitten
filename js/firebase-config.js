// Firebase Configuration for Exploding Kittens
const firebaseConfig = {
    apiKey: "AIzaSyBB38WWl3fpJbeql1UL_P5PjPzkfYq8t9Y",
    authDomain: "exploiding-kittens.firebaseapp.com",
    databaseURL: "https://exploiding-kittens-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "exploiding-kittens",
    storageBucket: "exploiding-kittens.firebasestorage.app",
    messagingSenderId: "624348413644",
    appId: "1:624348413644:web:40474e9bedf6ca3c2e8c69"
};

// Firebase akan di-load via CDN di HTML
let db = null;
let firebaseReady = false;

function initFirebase() {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        db = firebase.database();
        firebaseReady = true;
        console.log('✅ Firebase connected!');
        window.dispatchEvent(new Event('firebaseReady'));
    }
}

// Generate Room Code (6 karakter)
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Generate Player ID
function generatePlayerId() {
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}