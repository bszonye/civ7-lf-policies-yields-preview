import { PolicyYieldsCache } from "../cache.js";

/**
 * @param {ResolvedModifier} modifier
 * @param {number} count
 * @param {number} maintenanceCost Total maintenance cost
 */
export function calculateMaintenanceEfficiencyToReduction(modifier, count, maintenanceCost) {
    if (modifier.Arguments.Amount?.Value) {
        const reduction = Number(modifier.Arguments.Amount.Value) * count;
        return reduction;
    }
    if (modifier.Arguments.Percent?.Value) {
        const percent = Number(modifier.Arguments.Percent.Value) / 100;
        // Can be negative / positive.
        const value = percent > 0 ?
            // Positive percent is applied to yields, not to cost; this means that 2 golds
            // provide X% more gold, not X% less gold.
            maintenanceCost - maintenanceCost / (1 + percent) :
            // Negative percent instead is applied directly to the maintenance cost.
            maintenanceCost * percent;

        return value;
    }
    console.warn(`Unhandled ModifierArguments: ${JSON.stringify(modifier.Arguments)}. Cannot calculate maintenance reduction.`);
    return 0;
}

/**
 * E.g. "YIELD_FOOD, YIELD_PRODUCTION" -> ["YIELD_FOOD", "YIELD_PRODUCTION"]
 * @param {ResolvedArguments} args
 * @param {string} name The name of the argument
 * @returns {string[]}
 */
export function parseArgumentsArray(args, name) {
    if (!args[name]) {
        console.error(`Argument ${name} is missing.`, args);
        return [];
    }
    return args[name].Value.split(",").map(type => type.trim());
}

/**
 * Check if the constructible is ageless
 * @param {string} constructibleType 
 * @returns {boolean}
 */
export function isConstructibleAgeless(constructibleType) {
    return !PolicyYieldsCache.hasTypeTag(constructibleType, 'AGELESS');
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

    const isAgeless = isConstructibleAgeless(constructibleType.ConstructibleType);
    const currentAge = GameInfo.Ages.lookup(Game.age).AgeType;
    if (!isAgeless && currentAge != constructibleType.Age) return false;
    
    return true;
}
