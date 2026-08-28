// The shared rock-paper-scissors UI: a status line, a scoreboard, the two
// players' hands, and (on the hand only) the three choice buttons.
// Only flexbox + vmin so it renders on old TV browsers (Chromium 38-56):
// no CSS grid, aspect-ratio, or flex gap. Returns an update() function.

import { MOVES, SYMBOLS, label } from './rps-rules.js'

var STYLE_ID = 'rps-style'
var CSS = [
  ':root{font-size:calc(6px + 1.2vmin)}',
  '.rps-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;',
  'height:100%;box-sizing:border-box;padding:3vmin;font-family:Arial,sans-serif}',
  '.rps-status{font-size:1.6rem;text-align:center;margin-bottom:2vmin;min-height:6vmin}',
  '.rps-score{font-size:2.2rem;text-align:center;margin-bottom:2vmin}',
  '.rps-score b{color:#38bdf8}',
  '.rps-hands{display:flex;width:90vmin;margin-bottom:3vmin}',
  '.rps-hand{flex:1;margin:1vmin;padding:2vmin 0;border-radius:2vmin;background:#1e293b;',
  'text-align:center}',
  '.rps-hand.rps-won{background:#15803d}',
  '.rps-hand.rps-lost{opacity:0.55}',
  '.rps-sym{font-size:6rem;line-height:1.1}',
  '.rps-name{font-size:1.3rem;opacity:0.8}',
  '.rps-choices{display:flex;width:90vmin}',
  '.rps-choice{flex:1;margin:1vmin;padding:2vmin 0;border:none;border-radius:2vmin;',
  'background:#334155;color:#f8fafc;font-family:inherit;cursor:pointer}',
  '.rps-choice.rps-picked{background:#0ea5e9}',
  '.rps-choice:disabled{cursor:default;opacity:0.5}',
  '.rps-hidden{display:none}',
  '@media (min-aspect-ratio:1/1){.rps-status{font-size:2.7rem}.rps-score{font-size:3.4rem}',
  '.rps-sym{font-size:9rem}.rps-name{font-size:1.8rem}}',
].join('')

// Mounts the arena into `root`. `onPick(move)` fires when a choice is tapped;
// pass null for a view-only arena (the table), which hides the choice buttons.
//
// Returns update(view), where view is:
//   { status, names: [a, b], scores: [a, b], symbols: [a, b],
//     outcomes: ['won'|'lost'|'', ...], picking: bool, picked: move|null }
export function mountArena(root, onPick) {
  injectStyle()

  var wrap = el('div', 'rps-wrap')
  var status = el('div', 'rps-status')
  var score = el('div', 'rps-score')
  var hands = el('div', 'rps-hands')

  var symbols = []
  var names = []
  var panels = []
  for (var i = 0; i < 2; i++) {
    var panel = el('div', 'rps-hand')
    var sym = el('div', 'rps-sym')
    var name = el('div', 'rps-name')
    panel.appendChild(sym)
    panel.appendChild(name)
    hands.appendChild(panel)
    panels.push(panel)
    symbols.push(sym)
    names.push(name)
  }

  var choices = el('div', 'rps-choices')
  var buttons = []
  if (onPick) {
    for (var m = 0; m < MOVES.length; m++) {
      buttons.push(makeChoice(MOVES[m], onPick, choices))
    }
  } else {
    choices.className += ' rps-hidden'
  }

  wrap.appendChild(status)
  wrap.appendChild(score)
  wrap.appendChild(hands)
  wrap.appendChild(choices)
  root.appendChild(wrap)

  return function update(view) {
    status.textContent = view.status
    score.innerHTML = ''
    score.appendChild(document.createTextNode(view.scores[0] + '  '))
    score.appendChild(el('b', '', '—'))
    score.appendChild(document.createTextNode('  ' + view.scores[1]))

    for (var i = 0; i < 2; i++) {
      symbols[i].textContent = view.symbols[i]
      names[i].textContent = view.names[i]
      panels[i].className = 'rps-hand' + outcomeClass(view.outcomes[i])
    }

    for (var b = 0; b < buttons.length; b++) {
      var move = MOVES[b]
      buttons[b].disabled = !view.picking
      buttons[b].className = 'rps-choice' + (view.picked === move ? ' rps-picked' : '')
    }
  }
}

function outcomeClass(outcome) {
  if (outcome === 'won') return ' rps-won'
  if (outcome === 'lost') return ' rps-lost'
  return ''
}

function makeChoice(move, onPick, parent) {
  var button = el('button', 'rps-choice')
  button.appendChild(el('div', 'rps-sym', SYMBOLS[move]))
  button.appendChild(el('div', 'rps-name', label(move)))
  button.addEventListener('click', function () { onPick(move) })
  parent.appendChild(button)
  return button
}

function el(tag, className, text) {
  var node = document.createElement(tag)
  if (className) node.className = className
  if (text) node.textContent = text
  return node
}

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return
  var style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS
  document.head.appendChild(style)
}
