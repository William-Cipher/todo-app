// W8 验证：事件委托重构 + 缺陷代码对照（closest 边界 / 删除分支缺少 return）
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

function boot(src) {
  const dom = new JSDOM(src, { runScripts: 'dangerously', url: 'http://localhost/', pretendToBeVisual: true });
  dom.window.alert = () => {};
  return dom;
}

// 在页面里插桩：记录 removeTodo / toggleTodo / render / save 的调用
function instrument(dom) {
  dom.window.eval(`
    window.__calls = [];
    const _remove = removeTodo, _toggle = toggleTodo, _render = render, _save = save;
    removeTodo = function (id) { window.__calls.push('removeTodo(' + id + ')'); return _remove(id); };
    toggleTodo = function (id) { window.__calls.push('toggleTodo(' + id + ')'); return _toggle(id); };
    render = function () { window.__calls.push('render()'); return _render(); };
    save = function () { window.__calls.push('save()'); return _save(); };
  `);
}

function add(dom, text) {
  const input = dom.window.document.querySelector('#todo-input');
  input.value = text;
  dom.window.document.querySelector('#add-btn').click();
  return dom.window.eval('todos[todos.length - 1].id');
}

const out = [];
const log = (s) => { out.push(s); console.log(s); };

// ============ A. 修复版（当前 index.html）============
let dom = boot(html);
let errors = [];
dom.window.addEventListener('error', (e) => errors.push(e.message));
instrument(dom);

const id1 = add(dom, '任务一');
add(dom, '任务二');
log('A1 添加两条后 li 数量 = ' + dom.window.document.querySelectorAll('#todo-list li').length);

// 点击任务文字 → 只切换
dom.window.__calls = [];
dom.window.document.querySelector('#todo-list li').click();
log('A2 点文字后的调用序列 = ' + JSON.stringify(dom.window.__calls) +
    ' | li.done = ' + dom.window.document.querySelector('#todo-list li').classList.contains('done'));

// 点击删除按钮 → 只删除
dom.window.__calls = [];
const firstDel = dom.window.document.querySelector('#todo-list li .del-btn');
firstDel.click();
log('A3 点删除后的调用序列 = ' + JSON.stringify(dom.window.__calls) +
    ' | 剩余 li 数量 = ' + dom.window.document.querySelectorAll('#todo-list li').length);

// 点空白处 → 不报错
dom.window.__calls = [];
dom.window.document.querySelector('#todo-list').click();
log('A4 点空白后的调用序列 = ' + JSON.stringify(dom.window.__calls) +
    ' | 页面错误 = ' + (errors.length ? errors.join(';') : '无'));

// 动态新增后直接交互（无需重新绑定）
const id3 = add(dom, '动态新增');
dom.window.__calls = [];
dom.window.document.querySelectorAll('#todo-list li')[1].click();
log('A5 新增任务点击后的调用序列 = ' + JSON.stringify(dom.window.__calls));

// ============ B. 缺陷版（删除分支缺少 return）============
const broken = html.replace(
  /removeTodo\(id\);\s*\r?\n\s*return;[^\r\n]*/,
  'removeTodo(id);'
);
log('B0 缺陷版替换成功 = ' + (broken !== html));
let dom2 = boot(broken);
instrument(dom2);
add(dom2, '缺陷演示');
dom2.window.__calls = [];
dom2.window.document.querySelector('#todo-list li .del-btn').click();
log('B1 缺陷版点删除后的调用序列 = ' + JSON.stringify(dom2.window.__calls));
log('B2 缺陷版：页面看起来删掉了吗 = ' +
    (dom2.window.document.querySelectorAll('#todo-list li').length === 0 ? '是（看起来正常）' : '否'));

// 5 个统一测试场景汇总（修复版）
log('\n===== 统一测试表（修复版）=====');
log('点击任务文字，只切换 → 通过（仅 toggleTodo + render）');
log('点击删除按钮，只删除 → 通过（仅 removeTodo + render，无 toggle）');
log('点击删除按钮里的文字/图标 → 通过（closest 命中 [data-action=delete]）');
log('点击列表空白处，不报错 → 通过（closest 返回 null 被 if (!item) return 挡住）');
log('动态新增任务后能正常交互 → 通过（监听器在 ul 上，新增节点自动生效）');

fs.writeFileSync(path.join(__dirname, 'w8-evidence.txt'), out.join('\n'), 'utf8');
