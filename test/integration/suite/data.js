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
