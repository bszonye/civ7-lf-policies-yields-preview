import { PolicyYieldsCache } from "scripts/cache";

/**
 * @param {*} player 
 * @returns {UnitTypesInfo}
 */
export function retrieveUnitTypesMaintenance(player) {
    const units = player.Units?.getUnits() || [];
    /** @type {UnitTypesInfo} */
    const unitTypes = {};

    for (const unit of units) {
        if (unitTypes[unit.type]) continue;

        const count = player?.Units.getNumUnitsOfType(unit.type);
        const maintenance = player?.Treasury.getMaintenanceForAllUnitsOfType(unit.type) * -1;

        const unitTypeInfo = GameInfo.Units.lookup(unit.type);

        unitTypes[unit.type] = {
            UnitType: unitTypeInfo,
            Count: count,
            MaintenanceCost: maintenance,
        };
    }

    return unitTypes;
}

/**
 * @param {Unit} unitType
 * @param {ResolvedArguments} args
 */
export function isUnitTypeInfoTargetOfArguments(unitType, args) {
    if (args.UnitTag?.Value) {
        const tags = args.UnitTag.Value.split(",").map(tag => tag.trim());
        if (!tags.some(tag => PolicyYieldsCache.hasTypeTag(unitType.UnitType, tag))) {
            return false;
        }
    }
    if (args.UnitClass?.Value) {
        if (!PolicyYieldsCache.hasTypeTag(unitType.UnitType, args.UnitClass.Value)) {
            return false;
        }
    }
    if (args.UnitDomain?.Value) {
        if (unitType.Domain !== args.UnitDomain.Value) {
            return false;
        }
    }
    return true;
}

/**
 * @param {Player} player 
 */
export function getArmyCommanders(player) {
    const unitIds = player.Units.getUnitIds();
    const commanders = unitIds
        .map(id => Units.get(id))
        .filter(unit => unit.Experience.canEarnExperience && unit.isArmyCommander);

    return commanders;
}

/**
 * 
 * @param {UnitInstance} unit
 * @param {string} tag 
 */
export function hasUnitTag(unit, tag) {
    return Units.hasTag(unit.id, tag);
}

// TRADE (TODO Move to trade.js)
/**
 * @param {TradeRouteInstance} route 
 */
export function calculateRouteGoldYield(route) {
    // const ageMultiplier = GameInfo.Ages.lookup(Game.age).TradeSystemParameterSet
}

