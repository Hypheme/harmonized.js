export const storeConstructor = {
  transporter: {
    items: (index) => {
      const data = ['hans', 'wurst'];

      if (index === undefined) {
        return data;
      }

      return data[index];
    },
  },
};

export const itemMethods = {
  item: () => ({
    name: 'hans',
    knownFor: 'hot sh!t',
      // hobbies: [''] // for the first iteration we ignore relations
    facts: {
      birth: 1234,
      death: 5678,
      archievments: {},
    },
  }),
  itemUpdates: () => ({
    knownFor: 'sth else',
    facts: {
      death: 666,
    },
  }),
};
