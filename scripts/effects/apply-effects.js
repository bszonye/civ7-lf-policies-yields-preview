import { addYieldsAmount, addYieldsPercentForCitySubject } from "../yields.js";

/**
 * @param {YieldsDelta} yieldsDelta 
 * @param {any[]} subjects 
 * @param {ResolvedModifier} modifier 
 * @returns 
 */
export function applyYieldsForSubjects(yieldsDelta, subjects, modifier) {
    subjects.forEach(subject => {
        applyYieldsForSubject(yieldsDelta, subject, modifier);
    });
}

/**
 * @param {YieldsDelta} yieldsDelta 
 * @param {ResolvedModifier} modifier
 */
function applyYieldsForSubject(yieldsDelta, subject, modifier) {
    const player = Players.get(GameContext.localPlayerID);

    switch (modifier.EffectType) {
        // Player
        case "EFFECT_PLAYER_ADJUST_YIELD_PER_ACTIVE_TRADITION": {
            const activeTraditions = subject.Culture.getActiveTraditions().length;
            const amount = Number(modifier.Arguments.Amount.Value) * activeTraditions;
            return addYieldsAmount(yieldsDelta, modifier, amount);
        }

        // City
        case "EFFECT_CITY_ADJUST_YIELD_PER_ATTRIBUTE": {
            const attributePoints = player.Identity?.getSpentAttributePoints(modifier.Arguments.AttributeType.Value) || 0;
            const amount = Number(modifier.Arguments.Amount.Value) * attributePoints;
            return addYieldsAmount(yieldsDelta, modifier, amount);
        }
                
        case "EFFECT_CITY_ADJUST_WORKER_YIELD": {
            const specialists = subject?.Workers?.getNumWorkers(true);
            const amount = Number(modifier.Arguments.Amount.Value) * specialists;
            return addYieldsAmount(yieldsDelta, modifier, amount);
        }

        case "EFFECT_CITY_ADJUST_YIELD": {
            if (modifier.Arguments.Percent) {
                addYieldsPercentForCitySubject(yieldsDelta, modifier, subject, Number(modifier.Arguments.Percent.Value)); 
            }
            else if (modifier.Arguments.Amount) {
                return addYieldsAmount(yieldsDelta, modifier, Number(modifier.Arguments.Amount.Value));
            }
            else {
                console.warn(`Unhandled ModifierArguments: ${modifier.Arguments}`);
                return;
            }
        }

        default:
            console.warn(`Unhandled EffectType: ${modifier.EffectType}`);
            return;
    }
}