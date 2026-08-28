const test = require('node:test');
const assert = require('node:assert/strict');
const utils = require('../utils.js');

function createStorage() {
  const store = {};

  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      Object.keys(store).forEach((key) => delete store[key]);
    }
  };
}

test('getStoredArray returns parsed arrays and safe fallback', () => {
  const storage = createStorage();
  global.localStorage = storage;

  utils.saveArrayToStorage('genres', ['冒険', 'ファンタジー']);
  assert.deepEqual(utils.getStoredArray('genres'), ['冒険', 'ファンタジー']);
  assert.deepEqual(utils.getStoredArray('missing', ['既定値']), ['既定値']);
});

test('getStoredText returns stored text and fallback', () => {
  const storage = createStorage();
  global.localStorage = storage;

  utils.saveTextToStorage('customIdea', '月の猫');
  assert.equal(utils.getStoredText('customIdea'), '月の猫');
  assert.equal(utils.getStoredText('missing', '未入力'), '未入力');
});

test('format selections stay mutually exclusive so storybook does not linger', () => {
  const normalized = utils.normalizeStyleSelection(['絵本', '小説', 'リズム']);
  assert.deepEqual(normalized, ['小説', 'リズム']);

  const toggled = utils.normalizeStyleSelection(['絵本', '詩', '心の声']);
  assert.deepEqual(toggled, ['詩', '心の声']);
});

test('style storage is normalized when reading stale multi-format values', () => {
  const storage = createStorage();
  global.localStorage = storage;

  utils.saveArrayToStorage('style', ['絵本', '小説', '日記']);
  assert.deepEqual(utils.getStoredArray('style'), ['小説', '日記']);
});

test('generation progress stays below 100 until the result is ready', () => {
  const steps = utils.createGenerationProgressPlan();

  assert.ok(Array.isArray(steps) && steps.length >= 6);
  assert.ok(steps.every((value) => value < 100));
  assert.equal(steps[steps.length - 1], 96);
  assert.ok(steps.every((value, index, list) => index === 0 || value > list[index - 1]));
  assert.ok(steps.every((value, index, list) => index === 0 || value - list[index - 1] <= 12));
});

test('safe JSON parser explains when the backend is not running instead of throwing a syntax error', async () => {
  const response = {
    text: async () => '<!DOCTYPE html><html><body>Not running</body></html>'
  };

  await assert.rejects(
    () => utils.parseJsonResponse(response),
    /バックエンドのAPIサーバーが起動していません/
  );
});

test('resetStoryWizardState clears only the story-builder values and leaves the library alone', () => {
  const storage = createStorage();
  global.localStorage = storage;

  storage.setItem('genres', JSON.stringify(['冒険']));
  storage.setItem('storyGoal', '月の花を探す');
  storage.setItem('storyLibrary', JSON.stringify([{ title: '保存済み' }]));

  utils.resetStoryWizardState();

  assert.equal(storage.getItem('genres'), null);
  assert.equal(storage.getItem('storyGoal'), null);
  assert.equal(storage.getItem('storyLibrary'), JSON.stringify([{ title: '保存済み' }]));
});
