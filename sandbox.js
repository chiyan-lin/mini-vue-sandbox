export const sandbox = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"/>
    <style id="miancss"></style>
    <title>Sandbox</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/vue/2.6.14/vue.js" integrity="sha512-pSyYzOKCLD2xoGM1GwkeHbdXgMRVsSqQaaUoHskx/HF09POwvow2VfVEdARIYwdeFLbu+2FCOTRYuiyeGxXkEg==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
</head>
<body>
<div id="app"></div>
</body>

<script>
// vue hot reload core
window.map = Object.create(null);

window.createRecord = function (id, options) {
  console.log('createRecord', id)
  var Ctor = null
  // 判断传入的options是对象还是函数
  if (typeof options === 'function') {
    Ctor = options
    options = Ctor.options
  }
  makeOptionsHot(id, options)
  map[id] = {
    Ctor: Vue.extend(options),
    instances: [],
    options: options
  }
}

function injectHook (options, name, hook) {
  var existing = options[name]
  options[name] = existing
    ? Array.isArray(existing)
      ? existing.concat(hook)
      : [existing, hook]
    : [hook]
}

function makeOptionsHot (id, options) {
  injectHook(options, 'beforeCreate', function () {
    map[id].instances.push(this)
  })
  injectHook(options, 'beforeDestroy', function () {
    var instances = map[id].instances
    instances.splice(instances.indexOf(this), 1)
  })
}

function tryWrap (fn) {
  return function (id, arg) {
    try { fn(id, arg) } catch (e) {
      console.error(e)
      console.warn('Something went wrong during Vue component hot-reload. Full reload required.')
    }
  }
}

window.rerender = tryWrap(function (id, options) {
  var record = map[id]
  if (!options) {
    record.instances.slice().forEach(function (instance) {
      instance.$forceUpdate()
    })
    return
  }
  // 判断是否是构造函数还是proto
  if (typeof options === 'function') {
    options = options.options
  }

  // 修改map对象中的Ctor以便记录
  record.Ctor.options.render = options.render
  record.Ctor.options.staticRenderFns = options.staticRenderFns
  // .slice方法保证了instances的length是有效的
  record.instances.slice().forEach(function (instance) {
    instance.$options.render = options.render
    instance.$options.staticRenderFns = options.staticRenderFns
    instance._staticTrees = []
    instance.$forceUpdate()
  })
})

window.reload = tryWrap(function (id, options) {
  var record = map[id]
  if (options) {
    if (typeof options === 'function') {
      options = options.options
    }
    makeOptionsHot(id, options)
    var newCtor = Vue.extend(options)
    record.Ctor.options = newCtor.options
    record.Ctor.cid = newCtor.cid
    record.Ctor.prototype = newCtor.prototype
  }
  record.instances.slice().forEach(function (instance) {
    if (instance.$vnode && instance.$vnode.context) {
      instance.$vnode.context.$forceUpdate()
    } else {
      console.warn('Root or manually mounted instance modified. Full reload required.')
    }
  })
})

window.merge = function (script, template) {
  const App = new Function(script.replace('export default', 'return '))()
  const render = Vue.compile(template)
  App.render = render.render
  App.staticRenderFns = render.staticRenderFns
  return App
}
</script>

<script>

</script>

<script>
// 监听器，设置在 iframe 中，和主页面逻辑隔离
window.onmessage = function(event) {
  const { type, code } = event.data
  console.warn('event.data', event.data)
  if (type === 'style') {
    document.getElementById('miancss').innerHTML = code
    return
  }
  if (type === 'init') {
    const { script, template, wrap } = code
    const App = merge(script, template)
    createRecord('App', App)
    new Function('App', wrap)(App)
  }
  if (type === 'render') {
    window.rerender('App', Vue.compile(code))
  }
  if (type === 'app') {
    const { script, template } = code
    window.reload('App', merge(script, template))
  }
}
</script>
</html>
`
