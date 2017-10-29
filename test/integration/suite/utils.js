export const expectItem = (item, expectedValues) => Object.keys(expectedValues)
  .forEach((key) => {
    if (typeof expectedValues[key] === 'object') {
      return expectItem(item[key], expectedValues[key]);
    }

    return expect(item[key]).toEqual(expectedValues[key]);
  });
