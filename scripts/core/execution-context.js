import { parseArgumentsArray } from "../game/helpers.js";
import { addYieldsAmount, addYieldTypeAmount, createEmptyYieldsDelta } from "../effects/yields.js";

export class PolicyExecutionContext {}

export class PolicyYieldsContext extends PolicyExecutionContext {
    /** @type {YieldsDelta} */
    delta;

    constructor() {
        super();
        this.delta = createEmptyYieldsDelta();
    }

    /**
     * @param {string} yieldType
     * @param {number} amount
     */
    addYieldTypeAmount(yieldType, amount) {
        addYieldTypeAmount(this.delta, yieldType, amount);
    }

    /**
     * Add an amount to the yields, calculating the type based on the modifier arguments. 
     * @param {ResolvedModifier} modifier 
     * @param {number} amount 
     */
    addYieldsAmount(modifier, amount) {
        addYieldsAmount(this.delta, modifier, amount);
    }

    /**
     * Add the amount specified in the modifier, multiplied by the amount passed as argument.
     * @param {ResolvedModifier} modifier
     * @param {number} multiplier
     */
    addYieldsAmountTimes(modifier, multiplier) {
        const amount = Number(modifier.Arguments.getAsserted('Amount'));
        addYieldsAmount(this.delta, modifier, amount * multiplier);
    }

    /**
     * Add the amount specified in the modifier for the subject
     * @param {Subject} subject 
     * @param {ResolvedModifier} modifier
     * @param {number} multiplier
     */
    addSubjectYieldsTimes(subject, modifier, multiplier) {
        if (modifier.Arguments.Amount?.Value) {
            const amount = Number(modifier.Arguments.Amount.Value);
            return addYieldsAmount(this.delta, modifier, amount * multiplier);
        }

        if (modifier.Arguments.Percent?.Value) {
            const percent = Number(modifier.Arguments.Percent.Value);
            const yieldTypes = parseArgumentsArray(modifier.Arguments, 'YieldType');
            yieldTypes.forEach(yieldType => {
                // TODO: This is not precise. Yields returned are already subject of other modifiers (e.g. happiness penalty)
                // See what we're doing in `addYieldsPercentForCitySubject` for a more precise calculation, which still
                // has its quirks. We should unify the methods.
                const base = Math.abs(getSubjectBaseYield(subject, yieldType)); // Negative yield should still be positive
                const amount = base * (percent * multiplier) / 100;
                addYieldTypeAmount(this.delta, yieldType, amount);
            });
            return;
        }

        throw new Error(`${modifier.Modifier.ModifierId}: Unhandled ModifierArguments: ${JSON.stringify(modifier.Arguments)}. Cannot calculate yields.`);
    }
}

/**
 * @param {Subject} subject
 * @param {string} yieldType
 */
function getSubjectBaseYield(subject, yieldType) {
    if (subject.isEmpty) return 0;

    switch (subject.type) {
        case "City":
            return subject.city.Yields.getNetYield(yieldType);
        case "Plot": {
            const loc = GameplayMap.getLocationFromIndex(subject.plot);
            return GameplayMap.getYield(loc.x, loc.y, yieldType, subject.player.id);
        }
        case "Player": {
            return subject.player.Stats.getNetYield(yieldType);
        }
        case "Unit":
            throw new Error("Unit yields not implemented");
        default:
            throw new Error(`Unknown subject type: ${JSON.stringify(subject)}`);
    }
}