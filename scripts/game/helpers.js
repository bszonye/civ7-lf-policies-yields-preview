import { PolicyYieldsCache } from "../cache.js";

/**
 * Maintenance reduction cannot be more than the maintenance cost itself.
   Negative values are unbounded.
 * 
   @param {number} maintenanceCost Positive amount (e.g. 3 to indicate 3 golds spent)
 * @param {number} value The value to be bounded in order to not exceed the maintenance cost 
 */
function getBoundedMaintenanceReduction(value, maintenanceCost) {
    return Math.min(value, maintenanceCost);
}

/**
 * @param {ResolvedModifier} modifier
 * @param {number} count
 * @param {number} maintenanceCost Total maintenance cost (expected a _positive_ value)
 * @param {boolean} isConstructible
 */
export function calculateMaintenanceEfficiencyToReduction(modifier, count, maintenanceCost, isConstructible = false) {
    // constructibles mislabel percent efficiency as Amount
    if (modifier.Arguments.Amount?.Value && !isConstructible) {
        const reduction = Number(modifier.Arguments.Amount.Value) * count;
        return getBoundedMaintenanceReduction(reduction, maintenanceCost);
    }
    const arg = modifier.Arguments.Percent ?? modifier.Arguments.Amount;
    if (arg?.Value) {
        if (maintenanceCost < 0) {
            console.warn(`Maintenance cost is negative: ${maintenanceCost}. Cannot calculate maintenance reduction.`);
            return 0;
        }

        let percent = Number(arg.Value) / 100;

        // Can be negative / positive.
        let value = percent > 0 ?
            // Positive percent is applied to yields, not to cost; this means that 2 golds
            // provide X% more gold, not X% less gold to actual cost.
            maintenanceCost - maintenanceCost / (1 + percent) :
            // Negative percent instead is applied directly to the maintenance cost.
            // Since percent < 0 and maintenanceCost > 0, the result is negative (reduction).
            maintenanceCost * percent;

        return getBoundedMaintenanceReduction(value, maintenanceCost);
    }
    throw new Error(`Unhandled ModifierArguments: ${JSON.stringify(modifier.Arguments)}. Cannot calculate maintenance reduction.`);
}

/**
 * E.g. "YIELD_FOOD, YIELD_PRODUCTION" -> ["YIELD_FOOD", "YIELD_PRODUCTION"]
 * @param {ResolvedArguments} args
 * @param {string} name The name of the argument
 * @returns {string[]}
 */
export function parseArgumentsArray(args, name) {
    return args.getAsserted(name).split(",").map(type => type.trim());
}

/**
 * Check if the constructible is ageless
 * @param {string} constructibleType 
 * @returns {boolean}
 */
export function isConstructibleAgeless(constructibleType) {
    return PolicyYieldsCache.hasTypeTag(constructibleType, 'AGELESS');
}

/**
 * Check if the constructible could receive adjacency bonuses
 * @param {Constructible} constructibleType
 */
export function isConstructibleValidForCurrentAge(constructibleType) {
    const isAgeless = isConstructibleAgeless(constructibleType.ConstructibleType);
    const currentAge = GameInfo.Ages.lookup(Game.age)?.AgeType;
    if (currentAge == null) {
        console.error(`Cannot find age ${Game.age}`);
        return false;
    }
    if (!isAgeless && currentAge != constructibleType.Age) return false;
    
    return true;
}


/**
 * Check if the constructible is a full tile
 * @param {string} constructibleType
 * @returns {boolean}
 */
export function isConstructibleFullTile(constructibleType) {
    return PolicyYieldsCache.hasTypeTag(constructibleType, 'FULL_TILE');
}

/**
 * @param {Constructible} constructibleType 
 */
export function isConstructibleValidForQuarter(constructibleType) {
    const isIgnored = PolicyYieldsCache.hasTypeTag(
        constructibleType.ConstructibleType, 
        'IGNORE_DISTRICT_PLACEMENT_CAP'
    );
    if (isIgnored) return false;

    return isConstructibleValidForCurrentAge(constructibleType);
}

/**
 * @template T
 * @param {T | null | undefined} value 
 * @returns {value is T}
 */
export function isNotNull(value) {
    return value !== null;
}
