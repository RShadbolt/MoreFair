import Decimal from "break_infinity.js";
import { computed } from "vue";
import { LadderType, useLadderStore } from "~/store/ladder";
import { useRoundStore } from "~/store/round";

export const useLadderUtils = () => {
  const ladder = useLadderStore();
  const round = useRoundStore();

  const getMinimumPointsForPromote = computed<Decimal>(() => {
    return ladder.state.basePointsToPromote;
  });

  const getMinimumPeopleForPromote = computed<number>(() => {
    return Math.max(
      round.state.settings.minimumPeopleForPromote,
      ladder.state.number
    );
  });

  const getVinegarThrowCost = computed<Decimal>(() => {
    return round.state.settings.baseVinegarNeededToThrow.mul(
      new Decimal(ladder.state.number)
    );
  });

  const canThrowVinegar = computed<boolean>(() => {
    return (
      ladder.yourRanker.value !== undefined &&
      ladder.state.rankers[0].growing &&
      ladder.yourRanker.value.rank !== 1 &&
      ladder.state.rankers[0].points.cmp(getMinimumPointsForPromote.value) >=
        0 &&
      ladder.state.rankers.length >= getMinimumPeopleForPromote.value &&
      ladder.yourRanker.value.vinegar.cmp(getVinegarThrowCost.value) >= 0
    );
  });

  const getPointsNeededForPromote = computed<Decimal>(() => {
    // If not enough Players -> Infinity
    if (
      ladder.state.rankers.length < 2 ||
      ladder.yourRanker.value === undefined
    ) {
      return new Decimal(Infinity);
    }

    const leadingRanker =
      ladder.state.rankers[0].accountId === ladder.yourRanker.value.accountId
        ? ladder.yourRanker.value
        : ladder.state.rankers[0];
    const pursuingRanker =
      ladder.state.rankers[0].accountId === ladder.yourRanker.value.accountId
        ? ladder.state.rankers[1]
        : ladder.yourRanker.value;

    // How many more points does the ranker gain against his pursuer, every second
    const powerDiff = (
      leadingRanker.growing ? leadingRanker.power : new Decimal(0)
    ).sub(pursuingRanker.growing ? pursuingRanker.power : 0);

    // Calculate the needed Point difference, to have f.e. 30seconds of point generation with the difference in power
    const neededPointDiff = powerDiff
      .mul(round.state.settings.manualPromoteWaitTime)
      .abs();

    return Decimal.max(
      (leadingRanker.accountId === ladder.yourRanker.value.accountId
        ? pursuingRanker
        : leadingRanker
      ).points.add(neededPointDiff),
      getMinimumPointsForPromote.value
    );
  });

  const canPromote = computed<boolean>(() => {
    if (ladder.yourRanker.value === undefined) return false;
    if (
      ladder.yourRanker.value.points.cmp(getPointsNeededForPromote.value) < 0
    ) {
      return false;
    }

    if (ladder.state.rankers.length < getMinimumPeopleForPromote.value) {
      return false;
    }

    return ladder.yourRanker.value.rank <= 1;
  });

  const canBuyAutoPromote = computed<boolean>(() => {
    if (ladder.yourRanker.value === undefined) return false;
    if (
      ladder.yourRanker.value.autoPromote ||
      ladder.state.types.has(LadderType.FREE_AUTO) ||
      ladder.state.types.has(LadderType.NO_AUTO)
    ) {
      return false;
    }

    return (
      ladder.yourRanker.value.grapes.cmp(
        getAutoPromoteCost(ladder.yourRanker.value.rank)
      ) >= 0 && ladder.state.number >= round.state.autoPromoteLadder
    );
  });

  function getAutoPromoteCost(rank: number): Decimal {
    const minPeople = getMinimumPeopleForPromote.value;
    const divisor = Math.max(rank, minPeople + 1, 1);
    return round.state.settings.baseGrapesNeededToAutoPromote
      .div(new Decimal(divisor))
      .floor();
  }

  function getNextUpgradeCost(currentUpgrade: number): Decimal {
    let flatMulti = 1;
    let ladderMulti = 1;
    if (ladder.state.types.has(LadderType.CHEAP)) {
      ladderMulti = 0.5;
      flatMulti = 0.5;
    }
    if (ladder.state.types.has(LadderType.EXPENSIVE)) {
      ladderMulti = 1.5;
      flatMulti = 1.5;
    }

    let ladderDec = new Decimal(ladder.state.number);
    ladderDec = ladderDec.mul(ladderMulti).add(new Decimal(1));
    const result = ladderDec.pow(currentUpgrade + 1).mul(flatMulti);
    return result.round().max(new Decimal(1));
  }

  return {
    getMinimumPointsForPromote,
    getMinimumPeopleForPromote,
    getVinegarThrowCost,
    canThrowVinegar,
    getPointsNeededForPromote,
    canPromote,
    canBuyAutoPromote,
    getAutoPromoteCost,
    getNextUpgradeCost,
  };
};
