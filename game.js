/**
 * Tic-Tac-Toe — TypeScript IL game spec using @engine SDK.
 *
 * 3x3 grid, X vs O. Two AI players:
 *   - X: Minimax-based (perfect play)
 *   - O: Random valid moves
 * Player controls cursor and selects cells in playerVsAi mode.
 */

import { defineGame } from '@engine/core';
import { pickBestMove, pickRandomMove } from '@engine/ai';
import { consumeAction } from '@engine/input';
import {
  clearCanvas, drawBorder, drawRoundedRect,
  drawTextCell, drawLabel, drawHUD, drawGameOver,
} from '@engine/render';
import { drawTouchOverlay } from '@engine/touch';

// ── Constants ───────────────────────────────────────────────────────

const BOARD = 3;
const CELL = 120;
const MARGIN = 20;
const BOARD_PX = BOARD * CELL;
const LINE_W = 4;

const MARK_X = 'X';
const MARK_O = 'O';

// ── Game Definition ─────────────────────────────────────────────────

const game = defineGame({
  display: {
    type: 'custom',
    width: BOARD,
    height: BOARD,
    cellSize: CELL,
    canvasWidth: BOARD_PX + MARGIN * 2 + 180,
    canvasHeight: BOARD_PX + MARGIN * 2 + 40,
    offsetX: MARGIN,
    offsetY: MARGIN + 30,
    background: '#1a1a2e',
  },
  input: {
    up:      { keys: ['ArrowUp', 'w'] },
    down:    { keys: ['ArrowDown', 's'] },
    left:    { keys: ['ArrowLeft', 'a'] },
    right:   { keys: ['ArrowRight', 'd'] },
    select:  { keys: [' ', 'Enter'] },
    restart: { keys: ['r', 'R'] },
  },
});

// ── Resources ───────────────────────────────────────────────────────

game.resource('state', {
  score: 0,
  gameOver: false,
  winner: null, // 'X' | 'O' | 'draw'
  currentTurn: MARK_X,
  moveCount: 0,
  message: "X's turn",
  xWins: 0,
  oWins: 0,
  draws: 0,
});

game.resource('board', {
  grid: [
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ],
  winLine: null, // { cells: [{r,c}, ...] } for highlighting
});

game.resource('_aiTimer', { elapsed: 0 });
game.resource('_cursor', { r: 1, c: 1 });

// ── Game Logic ──────────────────────────────────────────────────────

function getValidMoves(grid) {
  const moves = [];
  for (let r = 0; r < BOARD; r++) {
    for (let c = 0; c < BOARD; c++) {
      if (grid[r][c] === null) moves.push({ r, c });
    }
  }
  return moves;
}

function checkWin(grid, mark) {
  // Rows
  for (let r = 0; r < BOARD; r++) {
    if (grid[r][0] === mark && grid[r][1] === mark && grid[r][2] === mark) {
      return [{ r, c: 0 }, { r, c: 1 }, { r, c: 2 }];
    }
  }
  // Columns
  for (let c = 0; c < BOARD; c++) {
    if (grid[0][c] === mark && grid[1][c] === mark && grid[2][c] === mark) {
      return [{ r: 0, c }, { r: 1, c }, { r: 2, c }];
    }
  }
  // Diagonals
  if (grid[0][0] === mark && grid[1][1] === mark && grid[2][2] === mark) {
    return [{ r: 0, c: 0 }, { r: 1, c: 1 }, { r: 2, c: 2 }];
  }
  if (grid[0][2] === mark && grid[1][1] === mark && grid[2][0] === mark) {
    return [{ r: 0, c: 2 }, { r: 1, c: 1 }, { r: 2, c: 0 }];
  }
  return null;
}

function isBoardFull(grid) {
  for (let r = 0; r < BOARD; r++) {
    for (let c = 0; c < BOARD; c++) {
      if (grid[r][c] === null) return false;
    }
  }
  return true;
}

/**
 * Minimax with alpha-beta pruning for perfect X play.
 */
function minimax(grid, depth, isMaximizing, alpha, beta) {
  const xWin = checkWin(grid, MARK_X);
  const oWin = checkWin(grid, MARK_O);

  if (xWin) return 10 - depth;
  if (oWin) return depth - 10;
  if (isBoardFull(grid)) return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let r = 0; r < BOARD; r++) {
      for (let c = 0; c < BOARD; c++) {
        if (grid[r][c] !== null) continue;
        grid[r][c] = MARK_X;
        const score = minimax(grid, depth + 1, false, alpha, beta);
        grid[r][c] = null;
        best = Math.max(best, score);
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break;
      }
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (let r = 0; r < BOARD; r++) {
      for (let c = 0; c < BOARD; c++) {
        if (grid[r][c] !== null) continue;
        grid[r][c] = MARK_O;
        const score = minimax(grid, depth + 1, true, alpha, beta);
        grid[r][c] = null;
        best = Math.min(best, score);
        beta = Math.min(beta, score);
        if (beta <= alpha) break;
      }
      if (beta <= alpha) break;
    }
    return best;
  }
}

function minimaxPick(grid) {
  const moves = getValidMoves(grid);
  let bestScore = -Infinity;
  let bestMove = moves[0];

  for (const move of moves) {
    grid[move.r][move.c] = MARK_X;
    const score = minimax(grid, 0, false, -Infinity, Infinity);
    grid[move.r][move.c] = null;
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  return bestMove;
}

function placeMark(board, state, r, c, mark) {
  board.grid[r][c] = mark;
  state.moveCount++;

  const winCells = checkWin(board.grid, mark);
  if (winCells) {
    state.gameOver = true;
    state.winner = mark;
    board.winLine = { cells: winCells };
    state.message = `${mark} wins!`;
    state.score += mark === MARK_X ? 100 : 50;
    if (mark === MARK_X) state.xWins++;
    else state.oWins++;
    return true;
  }

  if (isBoardFull(board.grid)) {
    state.gameOver = true;
    state.winner = 'draw';
    state.message = "It's a draw!";
    state.draws++;
    return true;
  }

  state.currentTurn = mark === MARK_X ? MARK_O : MARK_X;
  state.message = `${state.currentTurn}'s turn`;
  return false;
}

// ── Player Input System (Player vs AI) ──────────────────────────────

game.system('playerInput', function playerInputSystem(world, _dt) {
  const gm = world.getResource('gameMode');
  if (!gm || gm.mode !== 'playerVsAi') return;

  const state = world.getResource('state');
  if (state.gameOver) return;
  // Player controls X
  if (state.currentTurn !== MARK_X) return;

  const input = world.getResource('input');
  const cursor = world.getResource('_cursor');
  const board = world.getResource('board');

  if (consumeAction(input, 'up') && cursor.r > 0) cursor.r--;
  if (consumeAction(input, 'down') && cursor.r < BOARD - 1) cursor.r++;
  if (consumeAction(input, 'left') && cursor.c > 0) cursor.c--;
  if (consumeAction(input, 'right') && cursor.c < BOARD - 1) cursor.c++;

  if (consumeAction(input, 'select')) {
    if (board.grid[cursor.r][cursor.c] !== null) return; // cell occupied
    placeMark(board, state, cursor.r, cursor.c, MARK_X);
    if (!state.gameOver) {
      state.message = 'AI thinking...';
    }
  }
});

// ── AI Turn System ──────────────────────────────────────────────────

const AI_DELAY = 500;

game.system('ai', function aiSystem(world, dt) {
  const state = world.getResource('state');
  if (state.gameOver) return;

  // In Player vs AI mode, AI only plays O
  const gm = world.getResource('gameMode');
  if (gm && gm.mode === 'playerVsAi' && state.currentTurn === MARK_X) return;

  const timer = world.getResource('_aiTimer');
  timer.elapsed += dt;
  if (timer.elapsed < AI_DELAY) return;
  timer.elapsed = 0;

  const board = world.getResource('board');
  const grid = board.grid;
  const mark = state.currentTurn;
  const moves = getValidMoves(grid);

  if (moves.length === 0) return;

  let move;
  if (mark === MARK_X) {
    // Minimax AI for X (perfect play)
    move = minimaxPick(grid);
  } else {
    // Random AI for O
    move = pickRandomMove(moves);
  }

  placeMark(board, state, move.r, move.c, mark);
});

// ── Render System ───────────────────────────────────────────────────

game.system('render', function renderSystem(world, _dt) {
  const renderer = world.getResource('renderer');
  if (!renderer) return;

  const { ctx } = renderer;
  const state = world.getResource('state');
  const board = world.getResource('board');
  const ox = MARGIN;
  const oy = MARGIN + 30;

  clearCanvas(ctx, '#1a1a2e');

  // Title
  drawLabel(ctx, 'TIC-TAC-TOE', ox, oy - 10, { color: '#e0e0e0', fontSize: 18 });

  // Board background
  drawRoundedRect(ctx, ox, oy, BOARD_PX, BOARD_PX, 8, '#16213e', {
    strokeColor: '#2a3a5e', strokeWidth: 2,
  });

  // Grid lines
  ctx.strokeStyle = '#3a4a6e';
  ctx.lineWidth = LINE_W;

  // Vertical lines
  for (let c = 1; c < BOARD; c++) {
    ctx.beginPath();
    ctx.moveTo(ox + c * CELL, oy + 8);
    ctx.lineTo(ox + c * CELL, oy + BOARD_PX - 8);
    ctx.stroke();
  }
  // Horizontal lines
  for (let r = 1; r < BOARD; r++) {
    ctx.beginPath();
    ctx.moveTo(ox + 8, oy + r * CELL);
    ctx.lineTo(ox + BOARD_PX - 8, oy + r * CELL);
    ctx.stroke();
  }

  // Draw marks
  for (let r = 0; r < BOARD; r++) {
    for (let c = 0; c < BOARD; c++) {
      const mark = board.grid[r][c];
      if (!mark) continue;

      const cx = ox + c * CELL + CELL / 2;
      const cy = oy + r * CELL + CELL / 2;
      const size = CELL * 0.32;

      if (mark === MARK_X) {
        // Draw X with two diagonal lines
        ctx.strokeStyle = '#e53935';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - size, cy - size);
        ctx.lineTo(cx + size, cy + size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + size, cy - size);
        ctx.lineTo(cx - size, cy + size);
        ctx.stroke();
      } else {
        // Draw O with a circle
        ctx.strokeStyle = '#42a5f5';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, size, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  // Highlight winning line
  if (board.winLine) {
    const cells = board.winLine.cells;
    const startX = ox + cells[0].c * CELL + CELL / 2;
    const startY = oy + cells[0].r * CELL + CELL / 2;
    const endX = ox + cells[2].c * CELL + CELL / 2;
    const endY = oy + cells[2].r * CELL + CELL / 2;

    ctx.strokeStyle = state.winner === MARK_X ? '#ffcdd2' : '#bbdefb';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }

  // Draw cursor in player mode
  const gm = world.getResource('gameMode');
  if (gm && gm.mode === 'playerVsAi' && state.currentTurn === MARK_X && !state.gameOver) {
    const cursor = world.getResource('_cursor');
    ctx.strokeStyle = '#ffd740';
    ctx.lineWidth = 3;
    ctx.strokeRect(
      ox + cursor.c * CELL + 6,
      oy + cursor.r * CELL + 6,
      CELL - 12,
      CELL - 12
    );
  }

  // HUD panel
  const hudX = ox + BOARD_PX + 15;

  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = state.currentTurn === MARK_X ? '#e53935' : '#42a5f5';
  ctx.fillText(state.message, hudX, oy + 25);

  ctx.font = '12px monospace';
  ctx.fillStyle = '#888';
  ctx.fillText(`Moves: ${state.moveCount}`, hudX, oy + 55);

  // Player labels
  const isPlayerMode = gm && gm.mode === 'playerVsAi';

  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#e53935';
  ctx.fillText('X', hudX, oy + 90);
  ctx.font = '12px monospace';
  ctx.fillStyle = '#ccc';
  ctx.fillText(isPlayerMode ? '(You)' : '(Minimax)', hudX + 16, oy + 90);

  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#42a5f5';
  ctx.fillText('O', hudX, oy + 115);
  ctx.font = '12px monospace';
  ctx.fillStyle = '#ccc';
  ctx.fillText(isPlayerMode ? '(AI)' : '(Random)', hudX + 16, oy + 115);

  // Score tally
  ctx.fillStyle = '#666';
  ctx.font = '11px monospace';
  ctx.fillText(`X wins: ${state.xWins}`, hudX, oy + 150);
  ctx.fillText(`O wins: ${state.oWins}`, hudX, oy + 168);
  ctx.fillText(`Draws:  ${state.draws}`, hudX, oy + 186);

  // Board border
  drawBorder(ctx, ox, oy, BOARD_PX, BOARD_PX, '#2a3a5e');

  if (state.gameOver) {
    const title = state.winner === 'draw'
      ? 'DRAW!'
      : `${state.winner} WINS!`;
    const titleColor = state.winner === MARK_X ? '#e53935'
      : state.winner === MARK_O ? '#42a5f5' : '#fff';

    drawGameOver(ctx, ox, oy, BOARD_PX, BOARD_PX, {
      title,
      titleColor,
      subtitle: 'Press R to restart',
    });
  }

  drawTouchOverlay(ctx, ctx.canvas.width, ctx.canvas.height);
});

export default game;
