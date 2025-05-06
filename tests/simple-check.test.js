// Простой тест для проверки работоспособности Jest

describe('Simple tests', () => {
  test('addition works', () => {
    expect(1 + 1).toBe(2);
  });

  test('string concatenation works', () => {
    expect('a' + 'b').toBe('ab');
  });

  test('array operations work', () => {
    const arr = [1, 2, 3];
    expect(arr.length).toBe(3);
    expect(arr[0]).toBe(1);
  });
});