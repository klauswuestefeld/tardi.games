import * as TardiHand from '@juxhouse/tardi-core/hand'
import { SYMBOLS, HIDDEN, TARGET, compare, label } from './shared/rps-rules.js'
import { mountArena } from './shared/arena.js'

// The hand is this player's controller. It sends a throw to the table, which
// decides what is legal and when to reveal. `picked` is local: only this player
// sees their own throw until the table reveals both.
var state = null
var seat = -1
var picked = null
var pickedRound = 0

var update = mountArena(document.body, onThrow)

TardiHand.joinMatch({ onStateChange: onStateChange })
render()

function onStateChange(envelope) {
  seat = seatOf(envelope.players, envelope.playerId)
  state = envelope.messageFromTable
  if (state && state.round !== pickedRound) picked = null
  render()
}

function onThrow(move) {
  if (!canPick()) return
  picked = move
  pickedRound = state.round
  render()
  TardiHand.sendToTable(move)
}

function canPick() {
  return !!state && !state.over && state.phase === 'picking' && !picked
}

function render() {
  if (!state || seat === -1) {
    update({
      status: 'Waiting for the table...',
      names: ['You', 'Opponent'], scores: [0, 0], symbols: ['', ''],
      outcomes: ['', ''], picking: false, picked: null,
    })
    return
  }
  var them = 1 - seat
  update({
    status: statusText(),
    names: ['You', 'Opponent'],
    scores: [state.scores[seat], state.scores[them]],
    symbols: [symbolOf(seat), symbolOf(them)],
    outcomes: outcomes(),
    picking: canPick(),
    picked: picked,
  })
}

function statusText() {
  var them = 1 - seat
  if (state.phase === 'reveal') {
    var result = compare(state.picks[seat], state.picks[them])
    var summary = label(state.picks[seat]) + ' vs ' + label(state.picks[them]) + ' — '
    if (result === 0) return summary + 'tie'
    if (state.over) return summary + (result === 1 ? 'you win the match!' : 'you lose the match')
    return summary + (result === 1 ? 'you score' : 'they score')
  }
  if (picked) return 'You threw ' + label(picked) + ' — waiting for your opponent...'
  return 'Round ' + state.round + ' — throw! First to ' + TARGET + ' wins'
}

// Own throw is visible immediately; the opponent's stays hidden until reveal.
function symbolOf(which) {
  if (state.phase === 'reveal') return SYMBOLS[state.picks[which]]
  if (which === seat) return picked ? SYMBOLS[picked] : ''
  return state.chosen[which] ? HIDDEN : ''
}

function outcomes() {
  if (state.phase !== 'reveal') return ['', '']
  var result = compare(state.picks[seat], state.picks[1 - seat])
  if (result === 0) return ['', '']
  return result === 1 ? ['won', 'lost'] : ['lost', 'won']
}

function seatOf(players, playerId) {
  for (var i = 0; i < players.length; i++) {
    if (players[i].playerId === playerId) return i
  }
  return -1
}
