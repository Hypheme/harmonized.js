runSetup({
  global: {

  },
  storeConstructor: {
    name: '',
    beforeEach() {
      // some shit

    },
    beforeAll() {
    },
    cases: {
      constructInitialFetch: {
        before: () => {},
        after: () => {},
      },
    },
    environment: {
      store: Store,
      clientStorage: EmptyTransporter,
      clientStorageArgs: [],
      transporter: HttpTransporter,
      transporterArgs: [],
    },
    customSpecs: () => {
      it('should');
    },
  },
});
