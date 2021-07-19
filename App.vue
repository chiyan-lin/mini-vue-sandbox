<template>
  <div class="app-wrapper">
    <div class="editor-wrapper">
      <div v-for="item in Object.values(codeMap)" :key="item.path">
        <div class="file-name">{{ item.path }}</div>
        <CodeMirror style="height:45vh" :value="codeMap[item.path].code" :options="cmOptions" @input="onCmCodeChange" />
      </div>
    </div>
    <div class="sandbox-wrapper">
      <!-- 利用 iframe 做沙盒隔离 -->
      <iframe id="sandbox" frameborder="0" />
    </div>
  </div>
</template>

<script>
import { sandbox } from "./sandbox";
import { codemirror } from "vue-codemirror";

let cache = {}

export default {
  components: {
    CodeMirror: codemirror,
  },
  data() {
    return {
      codeMap: {
        "/src/index.js": {
          code: `
new Vue({
  render: h => h(App),
}).$mount('#app')
`.trim(),
          path: "/src/index.js",
        },
        "/src/App.vue": {
          code: `
\<template\>
  <div class="red">
    data is {{ aa }} 3211
    <input></input>
  </div>
\<\/template\>

\<script\>
export default {
  name: 'MyComponent',
  data() {
    return {
      aa: 111
    }
  },
  methods: {
    clear () {
      this.$emit('onclear', true)
    }
  },
  mounted() {
    console.log('nnp')
  },
}
\<\/script\>

<style>
.red {
  color: red;
}
</style>
`.trim(),
          path: "/src/App.vue",
          style: {
            flex: 1,
          },
        },
      },
      cmOptions: {
        tabSize: 4,
        mode: "text/javascript",
        theme: "base16-dark",
        lineNumbers: true,
        line: true,
      },
      onCmCodeChange: {},
    };
  },
  mounted() {
    this.noticeSandboxUpdate();
    this.onCmCodeChange = this.easyDebounce(this.onCodeChange);
  },
  methods: {
    parseVue(code, type) {
      const len = type.length + 2;
      const start = code.indexOf("<" + type + ">");
      const end = code.lastIndexOf("<\/" + type + ">");
      return start > -1 ? code.slice(start + len, end) : "";
    },
    resolveCode(index, app) {
      // 获取 indexjs 的代码以及 appvue 的代码
      // 获取 template 的
      const template = this.parseVue(app, "template");
      const script = this.parseVue(app, "script");
      const style = this.parseVue(app, "style");
      return {
        wrap: index,
        code: app,
        template,
        script,
        style,
      };
    },
    noticeSandboxUpdate() {
      try {
        const wrap = this.codeMap["/src/index.js"].code;
        const code = this.codeMap["/src/App.vue"].code;
        const { template, script, style } = this.resolveCode(wrap, code);
        // 记录下来
        cache.template = template
        cache.script = script
        cache.style = style
        document.querySelector("#sandbox").srcdoc = sandbox;
        setTimeout(() => {
          // style 直接插入
          this.updateVue('style', style);
          this.updateVue('init', { wrap, template, script });
        }, 500)
      } catch (e) {
        console.error(e);
      }
    },
    easyDebounce(fn, wait = 1000) {
      let timer = null;
      return function() {
        clearTimeout(timer);
        timer = setTimeout(() => {
          fn.apply(this, arguments);
        }, wait);
      };
    },
    updateVue(type, code) {
      document.querySelector("#sandbox").contentWindow.postMessage({
        type,
        code
      });
    },
    onCodeChange(newCode) {
      console.log("code update", newCode);
      const { template, script, style } = this.resolveCode('', newCode);
      if (template !== cache.template) {
        this.updateVue('render', template)
        cache.template = template
      }
      if (script !== cache.script) {
        this.updateVue('app', { script, template })
        cache.script = script
      }
      if (style !== cache.style) {
        this.updateVue('style', style)
        cache.style = style
      }
    },
  },
};
</script>

<style>
body {
  margin: 0;
  padding: 0;
}

* {
  box-sizing: border-box;
}

.app-wrapper {
  display: flex;
}

.editor-wrapper {
  width: 400px;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.code-editor {
  color: #666;
  width: 100%;
}

.file-name {
  color: #333;
  font-weight: bold;
  height: 20px;
  line-height: 20px;
  margin: 8px 0;
}

.sandbox-wrapper {
  flex: 1;
  border: 1px solid #cacaca;
  height: 100vh;
}

.sandbox-wrapper #sandbox {
  width: 100%;
  height: 100vh;
}

.CodeMirror {
  height: 100% !important;
}
</style>
