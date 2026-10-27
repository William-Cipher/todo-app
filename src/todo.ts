/**
 * todo.ts —— 待办清单的纯逻辑层（第9周 任务1 产物）
 *
 * 设计边界：
 *   本文件只做「数据 → 数据」，不碰 DOM、不碰 localStorage。
 *   好处是它能在 Node 里被 Vitest 直接 import，任务2 的单测才有东西可测。
 *
 * 三条红线（PPT 第8页）：
 *   不用 any、不用非空断言 !、不用 as 硬转。
 *   本文件里出现的每一处类型判断，都是靠 typeof / in / isSafeInteger 收窄出来的。
 */

/** 一条待办。这是整份代码里唯一的数据结构定义，别处一律引用它。 */
export interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

/** 视图筛选状态。它只影响「显示哪些」，不属于任务数据，所以不写进 Todo。 */
export type TodoFilter = 'all' | 'active' | 'done';

/** localStorage 的键名，集中一处，避免字符串散落。 */
export const TODO_STORAGE_KEY = 'todos';

/**
 * 脏数据入口 ①：dataset.id。
 *
 * dataset 里的值永远是 string，而且可能是 undefined（元素没有 data-id）。
 * 直接 Number() 也不够，PPT 第7页列了三种坏值：
 *   '123abc' → NaN            被 isSafeInteger 挡住
 *   '1.5'    → 1.5 不是整数    被 isSafeInteger 挡住
 *   ''       → 0             isSafeInteger(0) 竟然为 true，必须单独挡
 * 所以顺序是：先判空串，再转换，再验整数。
 */
export function parseTodoId(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  if (raw.trim() === '') return null;
  const id = Number(raw);
  if (!Number.isSafeInteger(id)) return null;
  return id;
}

/**
 * 类型守卫：判断一个 unknown 是不是合法的 Todo。
 * 这里不能写 as Todo —— 那只是让编译器闭嘴，运行时的脏数据照样能进来。
 * 用 typeof + in 逐字段收窄，才是真的验过。
 */
export function isTodo(value: unknown): value is Todo {
  if (typeof value !== 'object' || value === null) return false;
  if (!('id' in value) || !('text' in value) || !('completed' in value)) return false;
  return (
    typeof value.id === 'number' &&
    Number.isSafeInteger(value.id) &&
    typeof value.text === 'string' &&
    typeof value.completed === 'boolean'
  );
}

/**
 * 脏数据入口 ②：localStorage。
 *
 * JSON.parse 的返回值是不受控的，可能不是数组、可能元素缺字段、
 * 也可能是上一版遗留的旧结构，甚至是用户手改过的字符串。
 * 所以每一步都要验：解析失败 → 空数组；不是数组 → 空数组；元素不合法 → 丢掉。
 */
export function parseTodos(raw: string | null): Todo[] {
  if (raw === null) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const list: unknown[] = parsed;
  return list.filter((item: unknown): item is Todo => isTodo(item));
}

/** 写入 localStorage 前统一序列化，避免各处自己 stringify。 */
export function serializeTodos(todos: Todo[]): string {
  return JSON.stringify(todos);
}

/**
 * 生成新 id。
 *
 * 不用裸的 Date.now()：W8 实测过，同一毫秒内连续 addTodo 会拿到相同 id，
 * 之后按 id 删除会把两条一起删掉。这里在 Date.now() 基础上跳过已占用的值。
 */
function nextId(todos: Todo[]): number {
  const used = new Set<number>(todos.map(t => t.id));
  let id = Date.now();
  while (used.has(id)) id += 1;
  return id;
}

/**
 * 添加一条任务。空串与纯空格都拒绝 —— 注意空白判断用 trim 后的结果，
 * 三个空格看起来像有内容，trim 之后才是真的空。
 */
export function addTodo(todos: Todo[], text: string): void {
  const clean = text.trim();
  if (clean === '') return;
  todos.push({ id: nextId(todos), text: clean, completed: false });
}

/** 切换完成状态。找不到就是找不到，安静返回，不抛错（契约见任务2 第5条用例）。 */
export function toggleTodo(todos: Todo[], id: number): void {
  const target = todos.find(t => t.id === id);
  if (target === undefined) return;
  target.completed = !target.completed;
}

/** 删除。用 findIndex + splice，因为要原地改数组（保持函数签名为 void）。 */
export function removeTodo(todos: Todo[], id: number): void {
  const index = todos.findIndex(t => t.id === id);
  if (index === -1) return;
  todos.splice(index, 1);
}

/** 修改文本。返回 boolean 让调用方知道这次改到底成没成，而不是自己去猜。 */
export function updateTodo(todos: Todo[], id: number, text: string): boolean {
  const clean = text.trim();
  if (clean === '') return false;
  const target = todos.find(t => t.id === id);
  if (target === undefined) return false;
  target.text = clean;
  return true;
}

/** 清除已完成。倒序遍历，这样 splice 不会让后面的下标错位。 */
export function clearCompleted(todos: Todo[]): void {
  for (let i = todos.length - 1; i >= 0; i -= 1) {
    if (todos[i].completed) todos.splice(i, 1);
  }
}

/**
 * 视图筛选：把 filter 翻译成「显示哪些」。
 * filter 是视图状态，不属于任务数据，所以它是一个独立的纯函数，
 * 而不是 Todo 上的一个字段。
 */
export function visibleTodos(todos: Todo[], filter: TodoFilter): Todo[] {
  if (filter === 'all') return todos;
  if (filter === 'done') return todos.filter(t => t.completed);
  return todos.filter(t => !t.completed);
}
