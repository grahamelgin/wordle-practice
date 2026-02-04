// Word lists - will be loaded from file
let WORDS = [];
let VALID_GUESSES = [];

// Load words from file
async function loadWords() {
    try {
        const response = await fetch('words.txt');
        const text = await response.text();
        const allWords = text.split('\n')
            .map(word => word.trim().toUpperCase())
            .filter(word => word.length === 5);
        
        WORDS = allWords;
        VALID_GUESSES = [...allWords];
        
        console.log(`Loaded ${WORDS.length} words`);
    } catch (error) {
        console.error('Error loading words:', error);
        alert('Failed to load word list. Please refresh the page.');
    }
}

// Game state
let currentRow = 0;
let currentTile = 0;
let currentGuess = '';
let targetWord = '';
let gameOver = false;

// Keyboard layout
const keys = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK']
];

// Initialize the game
async function init() {
    await loadWords(); // Load words first
    createBoard();
    createKeyboard();
    selectRandomWord();
    
    // Listen for keyboard input
    document.addEventListener('keydown', handleKeyPress);
}

// Create the game board (6 rows x 5 tiles)
function createBoard() {
    const board = document.getElementById('game-board');
    board.innerHTML = '';
    
    for (let i = 0; i < 6; i++) {
        const row = document.createElement('div');
        row.classList.add('row');
        
        for (let j = 0; j < 5; j++) {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            tile.setAttribute('data-row', i);
            tile.setAttribute('data-tile', j);
            row.appendChild(tile);
        }
        
        board.appendChild(row);
    }
}

// Create the on-screen keyboard
function createKeyboard() {
    const keyboard = document.getElementById('keyboard');
    keyboard.innerHTML = '';
    
    keys.forEach(row => {
        const keyboardRow = document.createElement('div');
        keyboardRow.classList.add('keyboard-row');
        
        row.forEach(key => {
            const button = document.createElement('button');
            button.classList.add('key');
            button.textContent = key;
            button.setAttribute('data-key', key);
            
            if (key === 'ENTER' || key === 'BACK') {
                button.classList.add('wide');
            }
            
            button.addEventListener('click', () => handleKeyClick(key));
            keyboardRow.appendChild(button);
        });
        
        keyboard.appendChild(keyboardRow);
    });
}

// Select a random word from the list
function selectRandomWord() {
    targetWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    console.log('Target word:', targetWord); // For testing - remove in production
}

// Handle physical keyboard input
function handleKeyPress(e) {
    if (gameOver) return;
    
    const key = e.key.toUpperCase();
    
    if (key === 'ENTER') {
        submitGuess();
    } else if (key === 'BACKSPACE') {
        deleteLetter();
    } else if (/^[A-Z]$/.test(key)) {
        addLetter(key);
    }
}

// Handle on-screen keyboard clicks
function handleKeyClick(key) {
    if (gameOver) return;
    
    if (key === 'ENTER') {
        submitGuess();
    } else if (key === 'BACK') {
        deleteLetter();
    } else {
        addLetter(key);
    }
}

// Add a letter to the current guess
function addLetter(letter) {
    if (currentTile < 5) {
        const tile = document.querySelector(`[data-row="${currentRow}"][data-tile="${currentTile}"]`);
        tile.textContent = letter;
        tile.classList.add('filled');
        currentGuess += letter;
        currentTile++;
    }
}

// Delete the last letter
function deleteLetter() {
    if (currentTile > 0) {
        currentTile--;
        const tile = document.querySelector(`[data-row="${currentRow}"][data-tile="${currentTile}"]`);
        tile.textContent = '';
        tile.classList.remove('filled');
        currentGuess = currentGuess.slice(0, -1);
    }
}

// Submit the current guess
function submitGuess() {
    if (currentTile !== 5) {
        showMessage('Not enough letters', 1500);
        return;
    }
    
    if (!VALID_GUESSES.includes(currentGuess)) {
        showMessage('Not in word list', 1500);
        shakeTiles();
        return;
    }
    
    revealTiles();
}

// Reveal tiles with color feedback
function revealTiles() {
    const letterCount = {};
    
    // Count letters in target word
    for (let letter of targetWord) {
        letterCount[letter] = (letterCount[letter] || 0) + 1;
    }
    
    const tiles = [];
    const guessArray = currentGuess.split('');
    
    // First pass: mark correct letters (green)
    for (let i = 0; i < 5; i++) {
        const tile = document.querySelector(`[data-row="${currentRow}"][data-tile="${i}"]`);
        tiles.push(tile);
        
        if (guessArray[i] === targetWord[i]) {
            tile.setAttribute('data-status', 'correct');
            letterCount[guessArray[i]]--;
        }
    }
    
    // Second pass: mark present and absent letters
    for (let i = 0; i < 5; i++) {
        const tile = tiles[i];
        const letter = guessArray[i];
        
        if (tile.getAttribute('data-status') === 'correct') {
            continue;
        }
        
        if (letterCount[letter] > 0) {
            tile.setAttribute('data-status', 'present');
            letterCount[letter]--;
        } else {
            tile.setAttribute('data-status', 'absent');
        }
    }
    
    // Animate tiles with delay
    tiles.forEach((tile, index) => {
        setTimeout(() => {
            const status = tile.getAttribute('data-status');
            tile.classList.add(status);
            updateKeyboard(tile.textContent, status);
        }, index * 300);
    });
    
    // Check win/loss after animations complete
    setTimeout(() => {
        checkGameEnd();
    }, 1500);
}

// Update keyboard key colors
function updateKeyboard(letter, status) {
    const key = document.querySelector(`[data-key="${letter}"]`);
    if (!key) return;
    
    const currentStatus = key.classList.contains('correct') ? 'correct' :
                         key.classList.contains('present') ? 'present' :
                         key.classList.contains('absent') ? 'absent' : '';
    
    // Only update if new status is better
    if (status === 'correct' || 
        (status === 'present' && currentStatus !== 'correct') ||
        (status === 'absent' && !currentStatus)) {
        key.classList.remove('correct', 'present', 'absent');
        key.classList.add(status);
    }
}

// Check if game is won or lost
function checkGameEnd() {
    if (currentGuess === targetWord) {
        gameOver = true;
        showEndMessage(true);
    } else if (currentRow === 5) {
        gameOver = true;
        showEndMessage(false);
    } else {
        currentRow++;
        currentTile = 0;
        currentGuess = '';
    }
}

// Show temporary message
function showMessage(text, duration) {
    const messageEl = document.getElementById('message');
    messageEl.innerHTML = `<p>${text}</p>`;
    messageEl.classList.remove('hidden');
    
    setTimeout(() => {
        messageEl.classList.add('hidden');
    }, duration);
}

// Show end game message with play again button
function showEndMessage(won) {
    const messageEl = document.getElementById('message');
    
    if (won) {
        messageEl.innerHTML = `
            <h2>🎉 You won!</h2>
            <p>You guessed the word in ${currentRow + 1} ${currentRow === 0 ? 'try' : 'tries'}!</p>
            <button id="play-again">Play Again</button>
        `;
    } else {
        messageEl.innerHTML = `
            <h2>Game Over</h2>
            <p>The word was: <strong>${targetWord}</strong></p>
            <button id="play-again">Play Again</button>
        `;
    }
    
    messageEl.classList.remove('hidden');
    
    // Add event listener to play again button
    document.getElementById('play-again').addEventListener('click', resetGame);
}

// Shake tiles for invalid word
function shakeTiles() {
    const tiles = document.querySelectorAll(`[data-row="${currentRow}"]`);
    tiles.forEach(tile => {
        tile.style.animation = 'shake 0.5s';
        setTimeout(() => {
            tile.style.animation = '';
        }, 500);
    });
}

// Add shake animation to CSS (we'll need to add this)
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

// Reset game for new round
function resetGame() {
    currentRow = 0;
    currentTile = 0;
    currentGuess = '';
    gameOver = false;
    
    // Clear board
    const tiles = document.querySelectorAll('.tile');
    tiles.forEach(tile => {
        tile.textContent = '';
        tile.className = 'tile';
        tile.removeAttribute('data-status');
    });
    
    // Clear keyboard colors
    const keyboardKeys = document.querySelectorAll('.key');
    keyboardKeys.forEach(key => {
        key.classList.remove('correct', 'present', 'absent');
    });
    
    // Hide message
    document.getElementById('message').classList.add('hidden');
    
    // Select new word
    selectRandomWord();
}

// Start the game
init();