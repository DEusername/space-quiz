const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const storageKey = "orbit-personal-best";

class FakeClassList {
  constructor() {
    this.classes = new Set();
  }

  add(...names) {
    names.forEach((name) => this.classes.add(name));
  }

  remove(...names) {
    names.forEach((name) => this.classes.delete(name));
  }

  contains(name) {
    return this.classes.has(name);
  }

  toggle(name, force) {
    const shouldAdd = force ?? !this.contains(name);
    if (shouldAdd) this.add(name);
    else this.remove(name);
    return shouldAdd;
  }
}

class FakeText {
  constructor(text) {
    this.textContent = String(text);
  }
}

class FakeElement {
  constructor(document) {
    this.document = document;
    this.children = [];
    this.listeners = new Map();
    this.classList = new FakeClassList();
    this._className = "";
    this._textContent = "";
    this.style = {};
    this.attributes = new Map();
    this.disabled = false;
  }

  get className() {
    return this._className;
  }

  set className(value) {
    this._className = String(value);
    this.classList.classes = new Set(this._className.split(/\s+/).filter(Boolean));
  }

  get textContent() {
    if (this.children.length) {
      return this.children.map((child) => child.textContent).join("");
    }
    return this._textContent;
  }

  set textContent(value) {
    this.children = [];
    this._textContent = String(value);
  }

  set innerHTML(value) {
    this.children = [];
    this._textContent = "";
    for (const [, classNames] of String(value).matchAll(/class="([^"]+)"/g)) {
      const child = new FakeElement(this.document);
      child.className = classNames;
      this.append(child);
    }
  }

  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(callback);
  }

  dispatch(type, event = {}) {
    this.listeners.get(type)?.forEach((callback) => callback(event));
  }

  click() {
    if (!this.disabled) this.dispatch("click");
  }

  focus() {
    this.document.activeElement = this;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  append(...nodes) {
    nodes.forEach((node) => this.children.push(node));
  }

  replaceChildren(...nodes) {
    this.children = [...nodes];
  }

  querySelector(selector) {
    const className = selector.slice(1);
    for (const child of this.children) {
      if (child.classList?.contains(className)) return child;
      const nested = child.querySelector?.(selector);
      if (nested) return nested;
    }
    return null;
  }

  querySelectorAll(selector) {
    const className = selector.slice(1);
    return this.children.filter((child) => child.classList?.contains(className));
  }
}

function loadApp({ randomValues = [] } = {}) {
  const elements = new Map();
  const document = {
    activeElement: null,
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, new FakeElement(document));
      return elements.get(id);
    },
    createElement() {
      return new FakeElement(document);
    },
    createTextNode(text) {
      return new FakeText(text);
    },
    addEventListener() {}
  };
  const values = new Map();
  const window = {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value))
    }
  };
  const context = vm.createContext({ document, window });
  vm.runInContext(`
    const randomValues = ${JSON.stringify(randomValues)};
    let randomIndex = 0;
    Math.random = () => randomValues[randomIndex++] ?? 0.999999;
  `, context);
  vm.runInContext(script, context);
  return { context, document, elements, values };
}

function answerQuiz(context, missedQuestionIndexes) {
  return JSON.parse(vm.runInContext(`
    const missed = new Set(${JSON.stringify(missedQuestionIndexes)});
    const shownQuestions = [];
    for (let index = 0; index < quizQuestions.length; index += 1) {
      const item = quizQuestions[questionIndex];
      shownQuestions.push(questionText.textContent);
      const selectedIndex = missed.has(questionIndex)
        ? (item.correct + 1) % item.answers.length
        : item.correct;
      answersContainer.children[selectedIndex].click();
      nextButton.click();
    }
    JSON.stringify(shownQuestions);
  `, context));
}

function completeRun(context, missedQuestionIndexes) {
  vm.runInContext("startQuiz()", context);
  return answerQuiz(context, missedQuestionIndexes);
}

test("reviews only missed answers with the chosen answer, correct answer, and explanation", () => {
  const { context, elements, document } = loadApp();
  completeRun(context, [0, 3]);

  assert.equal(elements.get("review-btn").textContent, "Review 2 missed answers");
  elements.get("review-btn").click();

  const reviewItems = elements.get("review-list").children;
  assert.equal(reviewItems.length, 2);
  const firstReview = reviewItems[0].textContent;
  assert.match(firstReview, /Question 1: Which planet is home to Olympus Mons/);
  assert.match(firstReview, /Your answer: Mercury/);
  assert.match(firstReview, /Correct answer: Mars/);
  assert.match(firstReview, /Olympus Mons rises about 22 km/);
  assert.equal(elements.get("result-screen").classList.contains("hidden"), true);
  assert.equal(elements.get("review-screen").classList.contains("hidden"), false);
  assert.equal(document.activeElement, elements.get("review-title"));
});

test("omits the review action when every answer is correct", () => {
  const { context, elements } = loadApp();
  completeRun(context, []);

  assert.equal(elements.get("review-btn").classList.contains("hidden"), true);
  assert.equal(elements.get("review-list").children.length, 0);
});

test("returns to the unchanged results after reviewing missed answers", () => {
  const { context, elements, document, values } = loadApp();
  completeRun(context, [1]);
  const before = {
    score: elements.get("final-score").textContent,
    correct: elements.get("correct-count").textContent,
    best: elements.get("result-best").textContent,
    storedBest: values.get(storageKey)
  };

  elements.get("review-btn").click();
  elements.get("return-results-btn").click();

  assert.equal(elements.get("result-screen").classList.contains("hidden"), false);
  assert.equal(elements.get("review-screen").classList.contains("hidden"), true);
  assert.equal(document.activeElement, elements.get("review-btn"));
  assert.deepEqual({
    score: elements.get("final-score").textContent,
    correct: elements.get("correct-count").textContent,
    best: elements.get("result-best").textContent,
    storedBest: values.get(storageKey)
  }, before);
});

test("shuffles each quiz run and reviews missed answers against that run's questions", () => {
  const randomValues = [...Array(9).fill(0), ...Array(9).fill(0.999999)];
  const { context, elements } = loadApp({ randomValues });
  const sourceQuestions = JSON.parse(vm.runInContext("JSON.stringify(questions)", context));

  elements.get("start-btn").click();
  const firstOrder = answerQuiz(context, [0]);
  assert.equal(new Set(firstOrder).size, sourceQuestions.length);
  assert.deepEqual(firstOrder, sourceQuestions.map((question) => question.question).slice(1).concat(sourceQuestions[0].question));

  const missedItem = JSON.parse(vm.runInContext("JSON.stringify(quizQuestions[0])", context));
  elements.get("review-btn").click();
  const reviewText = elements.get("review-list").children[0].textContent;
  assert.match(reviewText, new RegExp(missedItem.question.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(reviewText, new RegExp(`Your answer: ${missedItem.answers[(missedItem.correct + 1) % missedItem.answers.length]}`));
  assert.match(reviewText, new RegExp(`Correct answer: ${missedItem.answers[missedItem.correct]}`));
  assert.match(reviewText, new RegExp(missedItem.explanation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  elements.get("restart-btn").click();
  const secondOrder = JSON.parse(vm.runInContext("JSON.stringify(quizQuestions.map((question) => question.question))", context));
  assert.deepEqual(secondOrder, sourceQuestions.map((question) => question.question));
  assert.notDeepEqual(secondOrder, firstOrder);
  assert.equal(elements.get("question-text").textContent, secondOrder[0]);
  assert.equal(elements.get("score").textContent, "0");
  assert.equal(elements.get("current-number").textContent, "1");
  assert.equal(elements.get("progress-value").style.width, "10%");
  assert.equal(vm.runInContext("missedAnswers.length", context), 0);
});
