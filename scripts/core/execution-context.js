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
}