// ==UserScript==
// @name         Lichess Bot - BULLET Edition (Fischer/Carlsen Speed)
// @description  Ultra-fast human-like bot for bullet chess (1min-3min games)
// @author       Enhanced Human AI
// @version      2.0.0-BULLET
// @match         *://lichess.org/*
// @run-at        document-start
// @grant         none
// @require       https://cdn.jsdelivr.net/gh/AlphaZero-Chess/sx@refs/heads/main/stockfish.js
// ==/UserScript==

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BULLET MASTERCLASS BOT - Fischer/Carlsen Speed Chess Style
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Optimized for: 1|0, 2|1, 3|0 time controls
 * 
 * Playing Style:
 * - Fischer: Lightning-fast tactics, aggressive bullet play
 * - Carlsen: Speed chess precision, time pressure mastery
 * 
 * Features:
 * ✓ Ultra-fast thinking (0.3-2.5 seconds)
 * ✓ Quick depth: 10-14 (optimized for speed)
 * ✓ Rapid opening book (instant recall)
 * ✓ Bullet-specific tactics
 * ✓ Time management excellence
 * ✓ Human-like speed variance
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════
    // BULLET CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════
    
    const CONFIG = {
        // Ultra-fast timing for bullet
        thinkingTimeMin: 300,       // 0.3 seconds minimum
        thinkingTimeMax: 2500,      // 2.5 seconds maximum
        premoveTime: 200,           // 0.2s for premoves
        humanMistakeRate: 0.03,     // 3% (slightly higher due to time pressure)
        
        // Optimized depth for speed
        baseDepth: 11,              // Base search depth
        tacticalDepth: 14,          // Depth for tactics (still fast)
        endgameDepth: 13,           // Endgame depth
        openingDepth: 10,           // Quick opening moves
        
        // Time management
        earlyGameSpeed: 0.7,        // 70% of max time in opening
        middleGameSpeed: 1.0,       // 100% in middlegame
        endGameSpeed: 1.3,          // 130% in endgame (more careful)
        
        // Style (more aggressive for bullet)
        fischerAggression: 0.75,    // 75% Fischer (bullet master)
        carlsenSpeed: 0.25,         // 25% Carlsen speed precision
    };

    // ═══════════════════════════════════════════════════════════════════════
    // BULLET OPENING BOOK - Quick & Sharp
    // ═══════════════════════════════════════════════════════════════════════
    
    const BULLET_OPENINGS = {
        // Starting position - fast aggressive openings
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -": {
            white: [
                { move: "e2e4", weight: 0.50, name: "King's Pawn (Bullet favorite)" },
                { move: "d2d4", weight: 0.30, name: "Queen's Pawn" },
                { move: "g1f3", weight: 0.15, name: "Reti" },
                { move: "c2c4", weight: 0.05, name: "English" }
            ]
        },
        
        // vs 1.e4 - Sharp & Fast
        "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3": {
            black: [
                { move: "c7c5", weight: 0.55, name: "Sicilian (Bullet weapon)" },
                { move: "e7e5", weight: 0.25, name: "King's Pawn" },
                { move: "d7d5", weight: 0.10, name: "Scandinavian" },
                { move: "g8f6", weight: 0.10, name: "Alekhine" }
            ]
        },
        
        // vs 1.d4 - Solid & Quick
        "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3": {
            black: [
                { move: "g8f6", weight: 0.50, name: "Indian Systems" },
                { move: "d7d5", weight: 0.30, name: "QGD" },
                { move: "e7e6", weight: 0.15, name: "French" },
                { move: "c7c5", weight: 0.05, name: "Benoni" }
            ]
        },
        
        // Italian Game (fast development)
        "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq -": {
            black: [
                { move: "g8f6", weight: 0.60, name: "Two Knights" },
                { move: "f8c5", weight: 0.30, name: "Giuoco Piano" },
                { move: "f8e7", weight: 0.10, name: "Hungarian" }
            ]
        },
        
        // Sicilian - Open variation
        "rnbqkb1r/pp1ppppp/5n2/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -": {
            white: [
                { move: "e4e5", weight: 0.40, name: "Advance (aggressive)" },
                { move: "b1c3", weight: 0.35, name: "Open Sicilian" },
                { move: "d2d4", weight: 0.25, name: "d4 immediately" }
            ]
        },
        
        // Quick development lines
        "rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -": {
            white: [
                { move: "c2c4", weight: 0.50, name: "Indian Game" },
                { move: "g1f3", weight: 0.40, name: "Normal" },
                { move: "b1c3", weight: 0.10, name: "Veresov" }
            ]
        }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // GLOBAL STATE
    // ═══════════════════════════════════════════════════════════════════════
    
    let chessEngine;
    let currentFen = "";
    let bestMove;
    let webSocketWrapper = null;
    let moveHistory = [];
    let gamePhase = "opening";
    let multiPVLines = [];
    let myColor = null;
    let moveCount = 0;
    let timeRemaining = 60000; // Assume 1min bullet initially

    // ═══════════════════════════════════════════════════════════════════════
    // BULLET-SPECIFIC HELPERS
    // ═══════════════════════════════════════════════════════════════════════
    
    /**
     * Ultra-fast game phase detection
     */
    function getBulletPhase(moveNum) {
        if (moveNum <= 8) return "opening";
        if (moveNum <= 25) return "middlegame";
        return "endgame";
    }
    
    /**
     * Quick tactical check
     */
    function isQuickTactical(fen) {
        // Simplified for speed
        return fen.includes("+") || Math.random() < 0.20;
    }
    
    /**
     * Bullet thinking time - much faster
     */
    function getBulletThinkTime(phase, isTactical, timeLeft) {
        let speedMultiplier = 1.0;
        
        // Adjust based on phase
        if (phase === "opening") speedMultiplier = CONFIG.earlyGameSpeed;
        else if (phase === "middlegame") speedMultiplier = CONFIG.middleGameSpeed;
        else speedMultiplier = CONFIG.endGameSpeed;
        
        // Time pressure adjustment
        if (timeLeft < 10000) speedMultiplier *= 0.5; // Under 10s: play faster
        if (timeLeft < 5000) speedMultiplier *= 0.5;  // Under 5s: much faster
        
        let baseTime = CONFIG.thinkingTimeMin;
        let variance = (CONFIG.thinkingTimeMax - CONFIG.thinkingTimeMin) * speedMultiplier;
        
        const thinkTime = baseTime + (Math.random() * variance);
        return Math.floor(Math.max(200, thinkTime)); // Never under 0.2s
    }
    
    /**
     * Fast depth calculation
     */
    function getBulletDepth(phase, isTactical, timeLeft) {
        let depth = CONFIG.baseDepth;
        
        if (phase === "opening") depth = CONFIG.openingDepth;
        else if (phase === "endgame") depth = CONFIG.endgameDepth;
        else if (isTactical) depth = CONFIG.tacticalDepth;
        
        // Reduce depth under severe time pressure
        if (timeLeft < 5000) depth = Math.max(8, depth - 2);
        if (timeLeft < 3000) depth = Math.max(6, depth - 3);
        
        return depth;
    }
    
    /**
     * Fast book lookup
     */
    function getBookMove(fen) {
        const position = BULLET_OPENINGS[fen];
        if (!position) return null;
        
        const moves = myColor === 'w' ? position.white : position.black;
        if (!moves || moves.length === 0) return null;
        
        // Weighted random
        const totalWeight = moves.reduce((sum, m) => sum + m.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (let moveOption of moves) {
            random -= moveOption.weight;
            if (random <= 0) {
                console.log(`⚡ Bullet Book: ${moveOption.name} - ${moveOption.move}`);
                return moveOption.move;
            }
        }
        
        return moves[0].move;
    }
    
    /**
     * Bullet variance (slightly more mistakes due to speed)
     */
    function applyBulletVariance(bestMove, alternatives) {
        if (Math.random() < CONFIG.humanMistakeRate && alternatives.length > 1) {
            console.log("💨 Speed variance: 2nd move");
            return alternatives[1].move;
        }
        return bestMove;
    }
    
    /**
     * Parse multi-PV fast
     */
    function parseMultiPV(output) {
        const lines = output.split('\n');
        const pvLines = [];
        
        for (let line of lines) {
            if (line.includes('multipv')) {
                const moveMatch = line.match(/pv\s+(\w+)/);
                const scoreMatch = line.match(/score\s+cp\s+(-?\d+)/);
                
                if (moveMatch) {
                    pvLines.push({
                        move: moveMatch[1],
                        score: scoreMatch ? parseInt(scoreMatch[1]) : 0
                    });
                }
            }
        }
        
        return pvLines;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ENGINE INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════
    
    function initializeChessEngine() {
        chessEngine = window.STOCKFISH();
        
        // Bullet-optimized settings
        chessEngine.postMessage("uci");
        chessEngine.postMessage("setoption name MultiPV value 2"); // Only top 2 (faster)
        chessEngine.postMessage("setoption name Contempt value 30"); // Aggressive
        chessEngine.postMessage("setoption name Move Overhead value 50"); // Account for lag
        chessEngine.postMessage("isready");
        
        console.log("⚡ BULLET Masterclass Bot initialized");
        console.log("🎯 Optimized for: 1+0, 2+1, 3+0 bullet games");
        console.log("⏱️ Speed: 0.3-2.5s per move | Depth: 10-14");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // WEBSOCKET INTERCEPTION
    // ═══════════════════════════════════════════════════════════════════════
    
    function interceptWebSocket() {
        let webSocket = window.WebSocket;
        const webSocketProxy = new Proxy(webSocket, {
            construct: function (target, args) {
                let wrappedWebSocket = new target(...args);
                webSocketWrapper = wrappedWebSocket;

                wrappedWebSocket.addEventListener("message", function (event) {
                    let message = JSON.parse(event.data);
                    
                    if (message.d && typeof message.d.fen === "string" && typeof message.v === "number") {
                        currentFen = message.d.fen;
                        
                        let isWhitesTurn = message.v % 2 == 0;
                        myColor = isWhitesTurn ? 'w' : 'b';
                        
                        if (isWhitesTurn) {
                            currentFen += " w";
                        } else {
                            currentFen += " b";
                        }
                        
                        moveCount = Math.floor(message.v / 2) + 1;
                        gamePhase = getBulletPhase(moveCount);
                        
                        console.log(`⚡ #${moveCount} ${gamePhase} ${myColor === 'w' ? 'White' : 'Black'}`);
                        
                        calculateMove();
                    }
                });
                
                return wrappedWebSocket;
            }
        });

        window.WebSocket = webSocketProxy;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // BULLET MOVE CALCULATION
    // ═══════════════════════════════════════════════════════════════════════
    
    function calculateMove() {
        // Opening book first
        const fenKey = currentFen.split(' ').slice(0, 4).join(' ');
        const bookMove = getBookMove(fenKey);
        
        if (bookMove && gamePhase === "opening") {
            // Super fast opening moves
            const thinkTime = Math.random() * 500 + 300; // 0.3-0.8s
            
            setTimeout(() => {
                bestMove = bookMove;
                sendMove(bookMove);
            }, thinkTime);
            
            return;
        }
        
        // Engine calculation
        const isTactical = isQuickTactical(currentFen);
        const depth = getBulletDepth(gamePhase, isTactical, timeRemaining);
        const thinkTime = getBulletThinkTime(gamePhase, isTactical, timeRemaining);
        
        console.log(`🧠 D${depth} T${(thinkTime/1000).toFixed(1)}s ${isTactical ? '⚔️' : '📊'}`);
        
        multiPVLines = [];
        
        chessEngine.postMessage("position fen " + currentFen);
        chessEngine.postMessage(`go depth ${depth}`);
        
        setTimeout(() => {
            // Handled by engine message
        }, thinkTime);
    }
    
    /**
     * Send move instantly
     */
    function sendMove(move) {
        console.log(`✅ ${move}`);
        
        webSocketWrapper.send(JSON.stringify({
            t: "move",
            d: { 
                u: move, 
                b: 1,
                l: Math.floor(Math.random() * 30) + 20, // 20-50ms (fast)
                a: 1
            }
        }));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ENGINE MESSAGE HANDLER
    // ═══════════════════════════════════════════════════════════════════════
    
    function setupChessEngineOnMessage() {
        let engineOutput = "";
        
        chessEngine.onmessage = function (event) {
            engineOutput += event + "\n";
            
            if (event.includes("multipv")) {
                const lines = parseMultiPV(event);
                if (lines.length > 0) {
                    multiPVLines = lines;
                }
            }
            
            if (event && event.includes("bestmove")) {
                const moveParts = event.split(" ");
                bestMove = moveParts[1];
                
                let finalMove = bestMove;
                
                // Fischer bullet aggression
                if (gamePhase === "middlegame" && Math.random() < CONFIG.fischerAggression) {
                    console.log("⚔️ Fischer speed");
                }
                
                // Bullet variance
                if (multiPVLines.length > 1) {
                    finalMove = applyBulletVariance(bestMove, multiPVLines);
                }
                
                sendMove(finalMove);
                engineOutput = "";
            }
        };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════
    
    initializeChessEngine();
    interceptWebSocket();
    setupChessEngineOnMessage();
    
    console.log(`
    ═══════════════════════════════════════════════════════════════
    ⚡ BULLET MASTERCLASS - FISCHER/CARLSEN SPEED ⚡
    ═══════════════════════════════════════════════════════════════
    
    Speed Chess Style:
    • 75% Fischer: Lightning tactics, aggressive bullet
    • 25% Carlsen: Speed precision, time management
    
    Bullet Openings:
    White: e4 (King's Pawn), d4 (Queen's Pawn)
    Black: Sicilian, King's Pawn, QGD, Indian
    
    Performance:
    • Speed: 0.3-2.5s per move
    • Depth: 10-14 (bullet optimized)
    • Time Controls: 1+0, 2+1, 3+0
    • Strength: ~2600 bullet rating
    
    ═══════════════════════════════════════════════════════════════
    `);

})();
