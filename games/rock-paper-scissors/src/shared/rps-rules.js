// Rock-paper-scissors rules, shared by the table and the hand.

export var MOVES = ['rock', 'paper', 'scissors']

export var SYMBOLS = { rock: '✊', paper: '✋', scissors: '✌' }

// Shown on the table for a player who has chosen but not yet been revealed.
export var HIDDEN = '?'

// Round wins needed to take the match.
export var TARGET = 3

var BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' }

// 1 if a beats b, -1 if b beats a, 0 for a tie.
export function compare(a, b) {
  if (a === b) return 0
  return BEATS[a] === b ? 1 : -1
}

export function isMove(move) {
  return MOVES.indexOf(move) !== -1
}

export function label(move) {
  return move.charAt(0).toUpperCase() + move.slice(1)
}
