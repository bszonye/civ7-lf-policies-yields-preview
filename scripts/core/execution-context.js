import { addYieldsAmount, addYieldTypeAmount, createEmptyYieldsDelta } from "../effects/yields.js";

export class PolicyExecutionContext {
    /**
     * Errors while evaluating the policy modifiers 
     * @type {string[]}
     */
    errors = [];

    /**
     * Requirements, args, etc. which have been found but not implemented 
     * @type {string[]}
     */
    missings = [];

    /**
     * @param {string} missing 
     */
    addMissing(missing) {
        this.missings.push(missing);
    }

    /**
     * @param {string} error 
     */
    addError(error) {
        this.errors.push(error);
    }

    /**
     * @param {Subject} subject
     * @returns {subject is CitySubject}
     */
    assertCitySubject(subject) {
        if (!subject || subject.type !== "City") {
            this.addError("City subject not found");
            return false;
        }
        return true;
    }
    
    /**
     * 
     * @param {Subject} subject 
     * @returns {subject is CitySubject | PlotSubject | UnitSubject}
     */
    assertPlotSubject(subject) {
        if (!subject || subject.type === "Player") {
            this.addError("Plot subject not found");
            return false;
        }
        return true;
    }

    /**
     * @param {Subject} subject
     * @returns {subject is PlayerSubject}
     */
    assertPlayerSubject(subject) {
        if (!subject || subject.type !== "Player") {
            this.addError("Player subject not found");
            return false;
        }
        return true
    }
}

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
    addYieldsTimes(modifier, multiplier) {
        addYieldsAmount(this.delta, modifier, this.getModifierArgumentAmount(modifier) * multiplier);
    }

    /**
     * @param {ResolvedModifier} modifier
     */
    getModifierArgumentAmount(modifier) {
        if (!modifier.Arguments.Amount?.Value) {
            this.addError("Amount argument not found");
        }
        return Number(modifier.Arguments.Amount?.Value || 1);
    }

    /**
     * Returns the argument value of the modifier, or null if not found.
     * If the argument is not found, an error is added to the context.
     * 
     * @param {ResolvedModifier} modifier
     * @param {string} argName
     */
    modifierArgument(modifier, argName) {
        if (!modifier.Arguments[argName]?.Value) {
            throw new Error(`Missing argument "${argName}" in modifier ${modifier.Modifier.ModifierId}`);
        }
        return modifier.Arguments[argName].Value;
    }
}