/**
 * dom.ts —— 事件对象收窄层（第9周 任务1 产物）
 *
 * 为什么单独拆一个文件：PPT 第8页把「e.target 是 EventTarget，没有 dataset」
 * 列成最容易反复卡住的类型坑，index.html 里同一段判断写了三遍。
 * 集中到这里，一是只写一次，二是它不碰任何渲染逻辑，容易对照。
 *
 * 收窄顺序（不能反）：instanceof Element → closest → instanceof HTMLElement → parseTodoId
 * 先收窄、再转换，任何一步不成立就返回 null，让调用方自己决定怎么处理。
 */

import { parseTodoId, type TodoFilter } from './todo';

/**
 * 从点击事件里读出这条待办的 id。
 * e.target 的类型是 EventTarget，上面根本没有 closest 和 dataset，
 * 所以第一行必须先 instanceof Element 把类型收窄成 Element，才能调 closest。
 */
export function readTodoIdFromEvent(e: Event): number | null {
  if (!(e.target instanceof Element)) return null;
  const item = e.target.closest('li');
  if (!(item instanceof HTMLElement)) return null;
  return parseTodoId(item.dataset.id);
}

/**
 * 读出被点中的按钮声明的动作（delete / edit / save / cancel）。
 * dataset.action 的类型是 string | undefined，用 ?? 兜成 null，
 * 而不是用 ! 断言它一定存在。
 */
export function readActionFromEvent(e: Event): string | null {
  if (!(e.target instanceof Element)) return null;
  const el = e.target.closest('[data-action]');
  if (!(el instanceof HTMLElement)) return null;
  return el.dataset.action ?? null;
}

/**
 * 读出筛选按钮的值。
 * dataset.filter 同样是 string | undefined，这里逐个字面量比对，
 * 只有真的是 'all' / 'active' / 'done' 才返回，其余一律 null ——
 * 不能 as TodoFilter，否则一个手写的 data-filter="xxx" 就能混进类型里。
 */
export function readFilterFromEvent(e: Event): TodoFilter | null {
  if (!(e.target instanceof Element)) return null;
  const el = e.target.closest('[data-filter]');
  if (!(el instanceof HTMLElement)) return null;
  const raw = el.dataset.filter;
  if (raw === 'all' || raw === 'active' || raw === 'done') return raw;
  return null;
}

/** 编辑框里的文本。它只在 keydown / blur 时用，和 id 分开取更清楚。 */
export function readEditTextFromEvent(e: Event): string | null {
  if (!(e.target instanceof HTMLInputElement)) return null;
  if (!e.target.classList.contains('edit-input')) return null;
  return e.target.value;
}
