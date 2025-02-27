import { UnwrappedPlayerYieldsCacheInstance } from "./global-cache.js";

/**
 * Creates an empty yields object.
 * @returns {YieldsDelta}
 */
export function createEmptyYieldsDelta() {
    return {
        Amount: {},
        Percent: {},
        AmountNoMultiplier: {},
    };
}

/**
 * Same as `addYieldsAmount`, but instead of adding a fixed amount, it adds a percentage of the base amount.
 * This is useful for modifiers that add a percentage of the base amount, like +10% of base food, 
 * when applied to single Cities (so `addYieldsPercent` would not work since the percentage is
 * applied to Player's total yields).
 * 
 * @param {YieldsDelta} yieldsDelta
 * @param {ResolvedModifier} modifier
 * @param {any} subject
 * @param {number} percent 
 * @returns 
 */
export function addYieldsPercentForCitySubject(yieldsDelta, modifier, subject, percent) {
    if (typeof modifier.Arguments?.YieldType?.Value === "undefined") {
        console.error(`Modifier ${modifier.Modifier.ModifierId} is missing a YieldType argument.`, modifier.Arguments);
        return;
    }

    parseYieldsType(modifier.Arguments.YieldType.Value).forEach(type => {
        if (!yieldsDelta.Amount[type]) {
            yieldsDelta.Amount[type] = 0;
        }

        const baseYield = unwrapYieldsOfType(subject.Yields.getYieldsForType(type));
        const increase = baseYield.BaseAmount * (percent / 100);
        yieldsDelta.Amount[type] += increase;
    });
}

/**
 * Add an amount to the yields.
 * @param {YieldsDelta} yieldsDelta 
 * @param {ResolvedModifier} modifier 
 * @param {number} amount 
 */
export function addYieldsAmount(yieldsDelta, modifier, amount) {
    if (typeof modifier.Arguments?.YieldType?.Value === "undefined") {
        console.error(`Modifier ${modifier.Modifier.ModifierId} is missing a YieldType argument.`, modifier.Arguments);
        return;
    }   

    const percentMultiplier = modifier.Arguments.PercentMultiplier?.Value === "true";
    
    parseYieldsType(modifier.Arguments.YieldType.Value).forEach(type => {
        const key = percentMultiplier ? "AmountNoMultiplier" : "Amount";
        if (!yieldsDelta[key][type]) {
            yieldsDelta[key][type] = 0;
        }
        yieldsDelta[key][type] += amount;
    });
}

export function addYieldTypeAmount(yieldsDelta, type, amount) {
    if (!yieldsDelta.Amount[type]) {
        yieldsDelta.Amount[type] = 0;
    }
    yieldsDelta.Amount[type] += amount;
}

export function addYieldTypeAmountNoMultiplier(yieldsDelta, type, amount) {
    if (!yieldsDelta.AmountNoMultiplier[type]) {
        yieldsDelta.AmountNoMultiplier[type] = 0;
    }
    yieldsDelta.AmountNoMultiplier[type] += amount;
}

/**
 * Add a percentage to the yields.
 * @param {YieldsDelta} yieldsDelta
 * @param {ResolvedModifier} modifier
 * @param {number} percent
 */
export function addYieldsPercent(yieldsDelta, modifier, percent) {
    if (typeof modifier.Arguments?.YieldType?.Value === "undefined") {
        console.error(`Modifier ${modifier.Modifier.ModifierId} is missing a YieldType argument.`, modifier.Arguments);
        return;
    }   

    parseYieldsType(modifier.Arguments.YieldType.Value).forEach(type => {
        if (!yieldsDelta.Percent[type]) {
            yieldsDelta.Percent[type] = 0;
        }
        yieldsDelta.Percent[type] += percent;
    });
}

/**
 * E.g. "YIELD_FOOD, YIELD_PRODUCTION"
 * @param {string} yieldsType
 * @returns {string[]}
 */
function parseYieldsType(yieldsType) {
    return yieldsType.split(",").map(type => type.trim());
}

/**
 * @param {YieldsDelta} yieldsDelta 
 */
export function resolveYields(player, yieldsDelta) {
    const yields = {};
    const CachedPlayerYields = UnwrappedPlayerYieldsCacheInstance.get();

    for (const type in YieldTypes) {
        yields[type] = yieldsDelta.Amount[type] || 0;
        yields[type] *= 1 + ((CachedPlayerYields[type]?.Percent || 0) / 100);
    }

    for (const type in yieldsDelta.Percent) {
        const baseYield = CachedPlayerYields[type]?.BaseAmount || 0;        
        const increase = (baseYield + yieldsDelta.Amount[type] || 0) * (yieldsDelta.Percent[type] / 100);
        yields[type] += increase;
    }

    // TODO This is probably wrong, since even the previous net yield is probably
    // already including some multiplied / non-multiplied yields.
    for (const type in yieldsDelta.AmountNoMultiplier) {
        yields[type] += yieldsDelta.AmountNoMultiplier[type];
    }

    for (const type in yields) {
        yields[type] = Math.round(yields[type]);
    }

    return yields;
}

// TODO try-catch
function unwrapYieldsOfType(yields) {
    const rawStep = yields.base.steps[0];
    // if (rawStep.description !== "LOC_ATTR_YIELD_INCOMES") {
    //     console.error("Unexpected yields description", rawStep.description);
    //     return {
    //         BaseAmount: 0,
    //         Percent: 0,
    //     }
    // }

    return {
        BaseAmount: rawStep.base.value,
        Percent: rawStep.modifier.value,
    }
}

/**
 * Returns the unwrapped yields for the current player.
 * This value is useful for previewing the yields of a policy, since
 * we need to calculate _active_ bonuses, like percent modifiers, even
 * to bonuses.
 */
export function unwrapCurrentPlayerYields() {
    /**  @type {UnwrappedPlayerYields} */
    const unwrappedYields = {};
    const player = Players.get(GameContext.localPlayerID);
    const allYields = player.Stats.getYields();
    for (let index = 0; index < allYields.length; index++) {
        const yields = allYields[index];
        const type = GameInfo.Yields[index].YieldType;
        unwrappedYields[type] = unwrapYieldsOfType(yields);
    }
    return unwrappedYields;
}