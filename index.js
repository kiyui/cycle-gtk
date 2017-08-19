#!/usr/bin/env jsgtk

const xs = require('xstream').default
const run = require('@cycle/run').run
const Gtk = require('Gtk')
const { h, makeGtkDriver } = require('./drivers/gtk')

function gtkShowAll (sink$) {
  sink$.addListener({
    next: ({ widget, options }) => {
      widget.showAll()
    }
  })
}

function app (sink$) {
  const quit$ = xs.create()

  sink$.addListener({
    next: ({ widget, options }) => {
      widget.once('show', () => {
        widget.setKeepAbove(true)
      })

      widget.on('destroy', function quit () {
        quit$.shamefullySendNext(true)
      })
    }
  })

  return {
    quit$
  }
}

function main ({ gtk, app }) {
  const gtkWindow$ = gtk.select('#window')
  const gtkLabel$ = gtk.select('#label')
  const gtkThree$ = gtk.select('#three')

  const showAll$ = xs.merge(gtkWindow$, gtkLabel$, gtkThree$)
    .endWhen(app.quit$)

  const timer$ = xs.periodic(1000)
    .map(function createTimerWindow (i) {
      if (i % 3 === 0) {
        return h('Window', '#window', { title: 'jsgtk', type: Gtk.WindowType.TOPLEVEL, windowPosition: Gtk.WindowPosition.CENTER }, [
          h('Label', '#three', { label: `Time * 3 is ${i * 3}` })
        ])
      }
      return h('Window', '#window', { title: 'jsgtk', type: Gtk.WindowType.TOPLEVEL, windowPosition: Gtk.WindowPosition.CENTER }, [
        h('Label', '#label', { label: `Time is ${i}` })
      ])
    })
    .endWhen(app.quit$)

  return {
    gtk: timer$,
    showAll: showAll$,
    app: gtkWindow$
  }
}

const drivers = {
  gtk: makeGtkDriver(),
  showAll: gtkShowAll,
  app
}

run(main, drivers)
