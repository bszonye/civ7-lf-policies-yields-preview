/**
 * @param {*} player 
 * @returns {UnitTypesInfo}
 */
export function getPlayerUnitsTypesMainteneance(player) {
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


// -- TO BE MOVED --

/**
 * @param {ResolvedModifier} modifier 
 * @param {number} count
 * @param {number} maintenanceCost Total maintenance cost
 */
// TODO Move in utils
export function calculateMaintenanceEfficencyToReduction(modifier, count, maintenanceCost) {
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


// TRADE (TODO Move to trade.js)
/**
 * @param {TradeRouteInstance} route 
 */
export function calculateRouteGoldYield(route) {
    // const ageMultiplier = GameInfo.Ages.lookup(Game.age).TradeSystemParameterSet
}

/**
 * @param {City} city 
 */
export function getCitySpecialistsCount(city) {
    const specialists = city.population - city.urbanPopulation - city.ruralPopulation
    return specialists;
}