import * as TardiTable from '@juxhouse/tardi-core/table'
import { SYMBOLS, HIDDEN, TARGET, compare, isMove, label } from './shared/rps-rules.js'
import { mountArena } from './shared/arena.js'

// The table owns the game state. It is a view-only display: it shows the score,
// hides each throw until both are in, then reveals them. First to TARGET wins.
var REVEAL_MS = 2500

var players = []
var scores = [0, 0]
var picks = [null, null]
var phase = 'picking'
var round = 1
var over = false

var update = mountArena(document.body, null)

TardiTable.startMatch({ onMessage: onPick, onPlayersChange: onPlayers })
render()

function onPlayers(info) {
  players = info.players
  render()
  broadcast()
}

function onPick(message) {
  var seat = seatOf(message.playerId)
  var move = message.messageFromHand

  if (over || players.length < 2) return
  if (phase !== 'picking') return
  if (seat === -1 || picks[seat]) return  // no seat, or already locked in
  if (!isMove(move)) return

  picks[seat] = move

  if (picks[0] && picks[1]) {
    resolve()
  } else {
    render()
    broadcast()
  }
}

function resolve() {
  var result = compare(picks[0], picks[1])
  if (result === 1) scores[0]++
  else if (result === -1) scores[1]++

  phase = 'reveal'
  var champion = scores[0] >= TARGET ? 0 : scores[1] >= TARGET ? 1 : -1

  if (champion !== -1) {
    over = true
    render()
    broadcast()
    TardiTable.endMatch({ victor: players[champion].playerId })
  } else {
    render()
    broadcast()
    setTimeout(nextRound, REVEAL_MS)
  }
}

function nextRound() {
  picks = [null, null]
  phase = 'picking'
  round++
  render()
  broadcast()
}

function broadcast() {
  TardiTable.sendToAllHands({
    phase: phase,
    round: round,
    scores: scores,
    over: over,
    chosen: [!!picks[0], !!picks[1]],
    picks: phase === 'reveal' ? picks : [null, null],
  })
}

function render() {
  update({
    status: statusText(),
    names: [nickOf(0), nickOf(1)],
    scores: scores,
    symbols: [symbolOf(0), symbolOf(1)],
    outcomes: outcomes(),
    picking: false,
    picked: null,
  })
}

function statusText() {
  if (players.length < 2) return 'Waiting for players...'
  if (phase === 'picking') {
    if (picks[0] || picks[1]) return 'Round ' + round + ' — waiting for the other throw...'
    return 'Round ' + round + ' — first to ' + TARGET + ' wins'
  }
  var result = compare(picks[0], picks[1])
  if (result === 0) return label(picks[0]) + ' ties ' + label(picks[1])
  var win = result === 1 ? 0 : 1
  var text = label(picks[win]) + ' beats ' + label(picks[1 - win]) + ' — ' + nickOf(win)
  return over ? text + ' wins the match!' : text + ' scores'
}

function symbolOf(seat) {
  if (phase === 'reveal') return SYMBOLS[picks[seat]]
  return picks[seat] ? HIDDEN : ''
}

function outcomes() {
  if (phase !== 'reveal') return ['', '']
  var result = compare(picks[0], picks[1])
  if (result === 0) return ['', '']
  return result === 1 ? ['won', 'lost'] : ['lost', 'won']
}

function nickOf(seat) {
  var player = players[seat]
  return player ? (player.nick || 'Player ' + (seat + 1)) : 'Player ' + (seat + 1)
}

function seatOf(playerId) {
  for (var i = 0; i < players.length; i++) {
    if (players[i].playerId === playerId) return i
  }
  return -1
}
