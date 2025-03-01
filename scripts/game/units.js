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
            // TODO Cache
            Tags: GameInfo.TypeTags.filter(tag => tag.Type === unit.type).map(tag => tag.Tag),
            Count: player?.Units.getNumUnitsOfType(unit.type),
            MaintenanceCost: maintenance,
        };
    }

    return unitTypes;
}

/**
 * @param {UnitTypeInfo} unitType
 * @param {ResolvedModifier} modifier
 */
export function isUnitTypeInfoTargetOfModifier(unitType, modifier) {
    if (modifier.Arguments.UnitTag?.Value) {
        const tags = modifier.Arguments.UnitTag.Value.split(",").map(tag => tag.trim());
        if (!unitType.Tags.some(tag => tags.includes(tag))) {
            return false;
        }
    }
    if (modifier.Arguments.UnitClass?.Value) {
        if (!unitType.Tags.includes(modifier.Arguments.UnitClass.Value)) {
            return false;
        }
    }
    if (modifier.Arguments.UnitDomain?.Value) {
        if (unitType.UnitType.Domain !== modifier.Arguments.UnitDomain.Value) {
            return false;
        }
    }
    return true;
}


// TRADE (TODO Move to trade.js)
/**
 * @param {TradeRouteInstance} route 
 */
export function calculateRouteGoldYield(route) {
    // const ageMultiplier = GameInfo.Ages.lookup(Game.age).TradeSystemParameterSet
}

