const xs = require('xstream').default
const R = require('ramda/dist/ramda.min.js')
const Gtk = require('Gtk')

function h (type, selector, options, children = []) {
  // Function patch acts as a reducer on widgets
  // This way we know if we should create a widget
  // or modify an existing widget based on the selector
  function patch (widgets, parent = false) {
    if (!R.is(Object, widgets)) {
      throw new Error('Patch function did not receive widgets dict!')
    }

    function updateWidget () {
      const widget = widgets[selector]

      if (!widget) {
        throw new Error(`Cannot update undefined widget ${selector}!`)
      }

      // Do not patch widget if nothing has changed
      if (R.equals(widget.options, options)) {
        return widget.widget
      }

      // Set the value for every key in options
      R.forEachObjIndexed(function setOption (value, key) {
        widget.widget[key] = value
      }, options)

      // Indicate that a change was made
      return widget.widget
    }

    function createWidget () {
      const widget = new Gtk[type](options)

      if (parent && parent.add) {
        parent.add(widget)
      }

      widgets[selector] = {
        options,
        widget
      }

      return widget
    }

    if (R.has(selector, widgets)) {
      return updateWidget()
    }

    return createWidget()
  }
  patch.selector = selector

  return [ patch, children ]
}

function makeGtkDriver () {
  Gtk.init(null)
  const widgets = {}
  const widgetsStreams = {}
  const widgetsProxy = new Proxy(widgets, {
    set: (obj, prop, value) => {
      if (obj[prop]) {
        throw new Error(`Cannot override property ${prop}!`)
      }
      obj[prop] = value

      if (!widgetsStreams[prop]) {
        const widget$ = xs.create()
        widgetsStreams[prop] = widget$
      }

      widgetsStreams[prop].shamefullySendNext(value)
    }
  })

  function getSelectors (reducers, seed = []) {
    return R.reduce((selectors, child) => {
      if (typeof child === 'function') {
        return [ ...selectors, child.selector ]
      }
      return getSelectors(child, selectors)
    }, seed, reducers)
  }

  function performPatch (reducers, seed = false) {
    return R.reduce((root, child) => {
      if (typeof child === 'function') {
        return child(widgetsProxy, root)
      }
      return performPatch(child, root)
    }, seed, reducers)
  }

  return function gtkDriver (sink$) {
    const selectors$ = xs.create()
    const patch$ = xs.create()

    sink$.addListener({
      next: function runGtkAction (sink) {
        const selectors = getSelectors(sink)

        selectors$.shamefullySendNext(selectors)
        patch$.shamefullySendNext(sink)
      }
    })

    const delete$ = selectors$
      .fold((last, current) => ({ last: last.current, current }), { current: [] })
      .drop(1)

    delete$.addListener({
      next: ({ last, current }) => {
        if (!R.equals(last, current)) {
          const deleteWidgets = R.filter(selector => !R.contains(selector, current), last)
          R.map(function destroyWidget (selector) {
            widgets[selector].widget.destroy()
            delete widgets[selector]
          }, deleteWidgets)
        }
      }
    })

    patch$.addListener({
      next: reducers => {
        performPatch(reducers)
      }
    })

    return {
      select: function select (name) {
        if (!widgetsStreams[name]) {
          const widget$ = xs.create()
          widgetsStreams[name] = widget$
          return widget$
        }

        return widgetsStreams[name]
      }
    }
  }
}

module.exports = {
  h,
  makeGtkDriver
}
