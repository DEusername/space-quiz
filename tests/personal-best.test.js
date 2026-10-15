const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const storageKey = "orbit-personal-best";

class Element {
  constructor() {
    const classes = new Set();
    this._textContent = "";
    this.classList = {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      contains: (name) => classes.has(name),
      toggle: (name, force) => {
        const shouldAdd = force ?? !classes.has(name);
        if (shouldAdd) classes.add(name);
        else classes.delete(name);
        return shouldAdd;
      }
    };
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(value) {
    this._textContent = String(value);
  }

  addEventListener() {}
  focus() {}
}

function loadApp(window) {
  const elements = new Map();
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, new Element());
      return elements.get(id);
    },
    addEventListener() {}
  };
  const context = vm.createContext({ document, window });
  vm.runInContext(script, context);
  return { context, elements };
}

function completeRun(context, score) {
  vm.runInContext(`score = ${score}; showResults();`, context);
}

test("saves a new high score and shows it after completing the quiz", () => {
  const values = new Map([[storageKey, "5"]]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value))
  };
  const { context, elements } = loadApp({ localStorage: storage });

  completeRun(context, 7);

  assert.equal(values.get(storageKey), "7");
  assert.equal(elements.get("welcome-best").textContent, "7");
  assert.equal(elements.get("result-best").textContent, "7");
});

test("keeps a higher saved score and displays it after reload and a lower run", () => {
  const values = new Map([[storageKey, "7"]]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value))
  };
  const { context, elements } = loadApp({ localStorage: storage });

  assert.equal(elements.get("welcome-best").textContent, "7");
  completeRun(context, 4);

  assert.equal(values.get(storageKey), "7");
  assert.equal(elements.get("result-best").textContent, "7");
});

test("continues showing results when browser storage is unavailable", () => {
  const window = {};
  Object.defineProperty(window, "localStorage", {
    get() {
      throw new Error("Storage unavailable");
    }
  });
  const { context, elements } = loadApp(window);

  assert.doesNotThrow(() => completeRun(context, 6));
  assert.equal(elements.get("welcome-best").textContent, "6");
  assert.equal(elements.get("result-best").textContent, "6");
});
