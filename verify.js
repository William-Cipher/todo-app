// 自动化验证脚本：用 jsdom 加载 todo-app/index.html，模拟真实用户操作
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

// 记录 alert 调用
let alerts = [];

function boot() {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'http://localhost/',   // 提供 origin，localStorage 才可用
    pretendToBeVisual: true,
  });
  dom.window.alert = (msg) => alerts.push(msg);
  return dom;
}

function simulateAdd(dom, text) {
  const input = dom.window.document.querySelector('#todo-input');
  const btn = dom.window.document.querySelector('#add-btn');
  input.value = text;
  btn.click();
}

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else { console.log('PASS:', msg); }
}

// 脚本顶层 let 变量不挂在 window 上，用 eval 访问数据层
const getTodos = (dom) => dom.window.eval('todos');

// ========== 场景 1：添加 / 空输入拦截 ==========
let dom = boot();
simulateAdd(dom, '学习 Web 编程');
simulateAdd(dom, '完成第7周实验');
assert(dom.window.document.querySelectorAll('#todo-list li').length === 2, '添加两条任务后列表有 2 项');
assert(dom.window.document.querySelector('#todo-input').value === '', '添加后输入框被清空');
simulateAdd(dom, '   ');
assert(alerts.length === 1 && alerts[0].includes('不能为空'), '纯空格输入被拦截并 alert 提示');
assert(dom.window.document.querySelectorAll('#todo-list li').length === 2, '空输入不增加列表项');

// ========== 场景 2：切换完成状态（点击后重渲染，需重新查询） ==========
dom.window.document.querySelectorAll('#todo-list li')[0].click();
const liAfter = dom.window.document.querySelectorAll('#todo-list li')[0];
assert(liAfter.classList.contains('done'), '点击列表项后出现 done 样式（划线）');
assert(getTodos(dom).length === 2 && getTodos(dom)[0].completed === true, '数据层：第 1 条 completed=true');

// ========== 场景 3：筛选 ==========
dom.window.document.querySelector('[data-filter="done"]').click();
assert(dom.window.document.querySelectorAll('#todo-list li').length === 1, '筛选「已完成」只显示 1 项');
dom.window.document.querySelector('[data-filter="active"]').click();
assert(dom.window.document.querySelectorAll('#todo-list li').length === 1, '筛选「未完成」只显示 1 项');
dom.window.document.querySelector('[data-filter="all"]').click();
assert(dom.window.document.querySelectorAll('#todo-list li').length === 2, '筛选「全部」恢复显示 2 项');

// ========== 场景 4：持久化（localStorage） ==========
const stored = JSON.parse(dom.window.localStorage.getItem('todos'));
assert(stored.length === 2 && stored[0].completed === true, 'localStorage 中已保存 2 条数据且状态正确');

// 刷新场景：新页面实例 + 同一份存储数据 → load() 恢复
const dom2 = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/', pretendToBeVisual: true });
dom2.window.localStorage.setItem('todos', JSON.stringify(stored));
const loaded = dom2.window.eval('load()');
assert(loaded.length === 2 && loaded[0].completed === true, '刷新场景：load() 能从 localStorage 恢复数据');

// ========== 场景 5：删除 ==========
dom.window.document.querySelectorAll('#todo-list li .del-btn')[1].click();
assert(dom.window.document.querySelectorAll('#todo-list li').length === 1, '点击 × 后列表只剩 1 项');
assert(JSON.parse(dom.window.localStorage.getItem('todos')).length === 1, '删除后 localStorage 同步更新');

// ========== 场景 6：clearCompleted()（控制台调用） ==========
// 注意：用 UI 依次添加（真实点击间隔 > 1ms），避免同一毫秒内 Date.now() 生成重复 id
simulateAdd(dom, '新任务A');
simulateAdd(dom, '新任务B');
const lis = dom.window.document.querySelectorAll('#todo-list li');
lis[lis.length - 1].click();   // 点最后一条 → 切换为已完成
assert(dom.window.document.querySelectorAll('#todo-list li').length === 3, '再添加 2 条并完成 1 条后列表 3 项');
dom.window.eval('clearCompleted()');
const after = dom.window.eval('todos');
assert(after.length === 1 && after.every(t => !t.completed), '控制台调用 clearCompleted() 后已完成任务全部清除，剩 1 条未完成');
assert(dom.window.document.querySelectorAll('#todo-list li').length === 1, 'clearCompleted() 后页面同步重渲染为 1 项');

console.log('\n===== 验证完成 =====');
