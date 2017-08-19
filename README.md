# cycle-gtk
A simple Cycle.js GTK application prototype based on [jsgtk](https://github.com/WebReflection/jsgtk)

## what is it?
It is for the most part just a test-patching driver for GTK with very simple sink syntax (similar to snabbdom)
```javascript
h('Window', '#window', { title: 'jsgtk', type: Gtk.WindowType.TOPLEVEL, windowPosition: Gtk.WindowPosition.CENTER }, [
  h('Label', '#label', { label: `Time is ${i}` })
])
```

## example
You can refer to `index.js` for example and try it out with `npm start`, since it relies on `jsgtk` to run

## development
I am still figuring out a convention for usage, especially since GTK relies on a lot of side-effects to get
working as you may see in the example code. I do have ideas as for how event handling and all can be managed,
but other than that am open to suggestions.
