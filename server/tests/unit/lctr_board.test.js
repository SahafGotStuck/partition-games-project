const { Board } = require('../../../lctr_script.js');

// 'describe' groups related tests together
describe('LCTR Board Class', () => {
  let board;

  // 'beforeEach' runs before each test in this suite.
  // This ensures each test starts with a fresh, identical board.
  beforeEach(() => {
    board = new Board([5, 4, 4, 2]);
  });

  test('should remove the top row correctly', () => {
    board.removeTopRow();
    // After removing the top row, the board's rows should be [4, 4, 2]
    expect(board.rows).toEqual([4, 4, 2]);
  });

  test('should remove the left column correctly', () => {
    board.removeLeftColumn();
    // After removing the left column, each row is reduced by 1
    expect(board.rows).toEqual([4, 3, 3, 1]);
  });

  test('should return the correct height', () => {
    // The initial height is the number of rows
    expect(board.height()).toBe(4);
  });

  test('should be empty after removing all rows', () => {
    board.removeTopRow(); // Becomes [4, 4, 2]
    board.removeTopRow(); // Becomes [4, 2]
    board.removeTopRow(); // Becomes [2]
    board.removeTopRow(); // Becomes []
    expect(board.isEmpty()).toBe(true);
  });
});