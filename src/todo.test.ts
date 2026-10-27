// todo.test.ts
import { describe, expect, it } from 'vitest';
import { addTodo, toggleTodo } from './todo';
import type { Todo } from './todo';

describe('addTodo', () => {
  it('正常添加：长度 +1，且 todos[0].text 等于输入', () => {
    const todos: Todo[] = [];
    addTodo(todos, '买牛奶');
    expect(todos).toHaveLength(1);
    expect(todos[0]?.text).toBe('买牛奶');
    expect(todos[0]?.completed).toBe(false);
  });

  it('纯空格：长度不变', () => {
    const todos: Todo[] = [];
    addTodo(todos, '   ');
    expect(todos).toHaveLength(0);
  });

  it('空字符串：长度不变', () => {
    const todos: Todo[] = [];
    addTodo(todos, '');
    expect(todos).toHaveLength(0);
  });
});

describe('toggleTodo', () => {
  it('正常切换：目标翻转，其他用例不受影响', () => {
    const todos: Todo[] = [
      { id: 1, text: '任务A', completed: false },
      { id: 2, text: '任务B', completed: true },
    ];
    toggleTodo(todos, 1);
    expect(todos).toHaveLength(2);
    expect(todos[0]?.completed).toBe(true);
    expect(todos[1]?.completed).toBe(true);
    expect(todos[0]?.text).toBe('任务A');
    expect(todos[1]?.text).toBe('任务B');
  });

  it('不存在的 ID：不崩溃，长度不变', () => {
    const todos: Todo[] = [
      { id: 1, text: '任务A', completed: false },
      { id: 2, text: '任务B', completed: true },
    ];
    expect(() => toggleTodo(todos, 999)).not.toThrow();
    expect(todos).toHaveLength(2);
    expect(todos[0]?.completed).toBe(false);
    expect(todos[1]?.completed).toBe(true);
  });
});
