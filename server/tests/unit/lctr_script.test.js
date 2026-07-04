// We need to import the functions to test them.
// NOTE: You may need to adjust the path '../lctr_script.js' depending on 
// where your lctr_script.js file is relative to your server folder.
// This example assumes lctr_script.js is in the main repo directory, one level above 'server'.
const { staircase } = require('../../../lctr_script.js');

describe('LCTR Partition Generation', () => {
  test('staircase function should generate a correct partition', () => {
    // Test with a number that gives a clear result
    const result = staircase(4);
    // We expect the result to be an array: [4, 3, 2, 1]
    expect(result).toEqual([4, 3, 2, 1]);
  });
});