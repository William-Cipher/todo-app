// 验证 V2.1 编辑分支 + 事件委托回归
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/', pretendToBeVisual: true });
const d = dom.window.document;
let alerts = [];
dom.window.alert = (m) => alerts.push(m);

const add = (t) => { d.querySelector('#todo-input').value = t; d.querySelector('#add-btn').click(); };
const lis = () => d.querySelectorAll('#todo-list li');
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS: ' : 'FAIL: ') + msg); if (!cond) fails++; };

add('任务一');
add('任务二');
ok(lis().length === 2, '添加两条');

// 点编辑按钮
lis()[0].querySelector('[data-action="edit"]').click();
const inp = d.querySelector('#todo-list .edit-input');
ok(!!inp, '点编辑后出现输入框');
ok(inp && inp.value === '任务一', '输入框预填原文本');
ok(lis()[0].classList.contains('editing'), '该行进入 editing 状态');

// 编辑中点击整行不应切换完成状态
lis()[0].click();
ok(!lis()[0].classList.contains('done'), '编辑中点击整行不会切换完成状态');

// 修改并保存
inp.value = '任务一（已改）';
d.querySelector('#todo-list [data-action="save"]').click();
ok(lis()[0].textContent.includes('任务一（已改）'), '保存后页面显示新文本');
ok(dom.window.eval('todos')[0].text === '任务一（已改）', '数据层文本已更新');
ok(JSON.parse(dom.window.localStorage.getItem('todos'))[0].text === '任务一（已改）', 'localStorage 已同步');

// Esc 取消
lis()[1].querySelector('[data-action="edit"]').click();
const inp2 = d.querySelector('#todo-list .edit-input');
inp2.value = '不该保存';
d.querySelector('#todo-list .edit-input').dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
ok(!d.querySelector('#todo-list .edit-input'), 'Esc 取消后输入框消失');
ok(lis()[1].textContent.includes('任务二'), '取消后文本保持不变');

// 空内容保存被拦截
lis()[1].querySelector('[data-action="edit"]').click();
d.querySelector('#todo-list .edit-input').value = '   ';
d.querySelector('#todo-list [data-action="save"]').click();
ok(alerts.length === 1 && d.querySelector('#todo-list .edit-input'), '空内容保存被拦截并保持编辑态');
d.querySelector('#todo-list .edit-input').dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

// 删除仍正常
lis()[0].querySelector('[data-action="delete"]').click();
ok(lis().length === 1, '删除仍正常');

// 动态新增后仍可交互
add('新任务');
lis()[0].querySelector('[data-action="edit"]').click();
ok(!!d.querySelector('#todo-list .edit-input'), '动态新增的任务也能进入编辑');

console.log(fails === 0 ? '\n全部通过' : '\n有失败项: ' + fails);
process.exitCode = fails ? 1 : 0;
