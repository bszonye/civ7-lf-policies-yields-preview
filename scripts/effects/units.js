/**
 * @param {*} player 
 * @returns {UnitTypesInfo}
 */
export function getPlayerUnitsTypesMainteneance(player) {
    const units = player.getUnits();
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

/**
 * @param {ResolvedModifier} modifier 
 * @param {number} unitsCount
 * @param {number} maintenanceCost
 */
export function unitsMaintenanceEfficencyToReduction(modifier, unitsCount, maintenanceCost) {
    if (modifier.Arguments.Amount?.Value) {
        const reduction = Number(modifier.Arguments.Amount.Value) * unitsCount;     
        return reduction; 
    }
    if (modifier.Arguments.Percent?.Value) {
        const reduction = maintenanceCost * Number(modifier.Arguments.Percent.Value) / 100;
        return reduction;
    }
    console.warn(`Unhandled ModifierArguments: ${JSON.stringify(modifier.Arguments)}. Cannot calculate maintenance reduction.`);
    return 0;
}