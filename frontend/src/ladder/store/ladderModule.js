import Ranker from "@/ladder/entities/ranker";

export default {
  state: {
    ladder: [new Ranker({})],
  },
  mutations: {
    importLadder(state, payload) {
      // TODO: Import a Ladder
      state.ladder = [];
      console.log(payload);
    },
  },
  actions: {},
  getters: {},
};
