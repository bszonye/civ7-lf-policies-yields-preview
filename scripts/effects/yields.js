import { parseArgumentsArray } from "../game/helpers.js";

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
 * @param {City} subject
 * @param {number} percent 
 * @returns 
 */
export function addYieldsPercentForCitySubject(yieldsDelta, modifier, subject, percent) {
    if (typeof modifier.Arguments?.YieldType?.Value === "undefined") {
        console.error(`Modifier ${modifier.Modifier.ModifierId} is missing a YieldType argument.`, modifier.Arguments);
        return;
    }

    parseArgumentsArray(modifier.Arguments, 'YieldType').forEach(type => {
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
    
    parseArgumentsArray(modifier.Arguments, 'YieldType').forEach(type => {
        const key = percentMultiplier ? "AmountNoMultiplier" : "Amount";
        if (!yieldsDelta[key][type]) {
            yieldsDelta[key][type] = 0;
        }
        yieldsDelta[key][type] += amount;
    });
}

/**
 * @param {YieldsDelta} yieldsDelta
 * @param {string} type
 * @param {number} amount 
 */
export function addYieldTypeAmount(yieldsDelta, type, amount) {
    type?.split(",").map(t => t.trim()).forEach(t => {
        if (!yieldsDelta.Amount[t]) {
            yieldsDelta.Amount[t] = 0;
        }
        yieldsDelta.Amount[t] += amount;
    });
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
    
    parseArgumentsArray(modifier.Arguments, 'YieldType').forEach(type => {
        if (!yieldsDelta.Percent[type]) {
            yieldsDelta.Percent[type] = 0;
        }
        yieldsDelta.Percent[type] += percent;
    });
}