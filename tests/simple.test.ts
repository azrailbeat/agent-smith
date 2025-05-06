/**
 * Простой тест для проверки работы Jest
 */
describe('Simple Test Suite', () => {
  it('should verify Jest is working', () => {
    expect(1 + 1).toBe(2);
  });
  
  it('should handle async functions', async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });
});