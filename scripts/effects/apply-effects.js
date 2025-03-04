import { resolveModifierById } from "../modifiers.js";
import { addYieldsAmount, addYieldsPercentForCitySubject, addYieldTypeAmount, addYieldTypeAmountNoMultiplier } from "./yields.js";
import { computeConstructibleMaintenanceEfficiencyReduction, findCityConstructibles, findCityConstructiblesMatchingAdjacency, getBuildingsCountForModifier, getPlayerBuildingsCountForModifier } from "../game/constructibles.js";
import { getYieldsForAdjacency, getPlotsGrantingAdjacency, AdjancenciesCache } from "../game/adjacency.js";
import { retrieveUnitTypesMaintenance, isUnitTypeInfoTargetOfArguments, getArmyCommanders } from "../game/units.js";
import { getCityAssignedResourcesCount, getCityGreatWorksCount, getCitySpecialistsCount, getCityYieldHappiness } from "../game/city.js";
import { calculateMaintenanceEfficiencyToReduction, parseArgumentsArray } from "../game/helpers.js";
import { resolveSubjectsWithRequirements } from "../requirements/resolve-subjects.js";
import { getPlayerActiveTraditionsForModifier, getPlayerCityStatesSuzerain, getPlayerRelationshipsCountForModifier } from "../game/player.js";
import { findCityConstructiblesMatchingWarehouse, getYieldsForWarehouseChange } from "../game/warehouse.js";
import { PolicyYieldsContext } from "scripts/core/execution-context.js";

/**
 * @param {PolicyYieldsContext} yieldsContext 
 * @param {any[]} subjects 
 * @param {ResolvedModifier} modifier 
 * @returns 
 */
export function applyYieldsForSubjects(yieldsContext, subjects, modifier) {
    subjects.forEach(subject => {
        applyYieldsForSubject(yieldsContext, subject, modifier);
    });
}

/**
 * @param {PolicyYieldsContext} context 
 * @param {Subject} subject
 * @param {ResolvedModifier} modifier
 */
function applyYieldsForSubject(context, subject, modifier) {
    const player = Players.get(GameContext.localPlayerID);

    // We can't apply new-only modifiers here. These are modifiers applied
    // only when the condition is met, dynamically, not constantly.
    // Check `IUS_REFORMANDI` in the Exploration Age
    if (modifier.Modifier.NewOnly) {
        return;
    }

    switch (modifier.EffectType) {
        // ==============================
        // ========== Player ============
        // ==============================
        case "EFFECT_PLAYER_ADJUST_YIELD_PER_ACTIVE_TRADITION": {
            if (!context.assertPlayerSubject(subject)) return;
            const count = subject.isEmpty ? 0 : getPlayerActiveTraditionsForModifier(subject.player, modifier);
            return context.addYieldsTimes(modifier, count);
            const amount = context.getModifierArgumentAmount(modifier) * count;
            return context.addYieldsAmount(modifier, amount);
        }

        case "EFFECT_DIPLOMACY_ADJUST_YIELD_PER_PLAYER_RELATIONSHIP": {
            const allies = getPlayerRelationshipsCountForModifier(player, modifier);
            const amount = Number(modifier.Arguments.Amount.Value) * allies;
            return addYieldsAmount(yieldsDelta, modifier, amount);
        }

        // TODO Converts x% of yield from trade route into another yield
        case "EFFECT_MODIFY_PLAYER_TRADE_YIELD_CONVERSION": {
            return;
        }

        case "EFFECT_PLAYER_ADJUST_CONSTRUCTIBLE_YIELD": {
            const buildingsCount = getPlayerBuildingsCountForModifier(player, modifier);
            const amount = Number(modifier.Arguments.Amount.Value) * buildingsCount;
            return addYieldsAmount(yieldsDelta, modifier, amount);
        }

        case "EFFECT_PLAYER_ADJUST_CONSTRUCTIBLE_YIELD_BY_ATTRIBUTE": {
            const attributePoints = player.Identity?.getSpentAttributePoints(modifier.Arguments.AttributeType.Value) || 0;
            const buildingsCount = getPlayerBuildingsCountForModifier(player, modifier);
            const amount = Number(modifier.Arguments.Amount.Value) * attributePoints * buildingsCount;
            return addYieldsAmount(yieldsDelta, modifier, amount);
        }

        case "EFFECT_PLAYER_ADJUST_YIELD_PER_ATTRIBUTE_AND_ALLIANCES": {
            const attributePoints = player.Identity?.getSpentAttributePoints(modifier.Arguments.AttributeType.Value) || 0;
            const allPlayers = Players.getAlive();
            const allies = allPlayers.filter(otherPlayer => 
                otherPlayer.isMajor && 
                otherPlayer.id != GameContext.localPlayerID && 
                player.Diplomacy?.hasAllied(otherPlayer.id)
            ).length;
            const amount = Number(modifier.Arguments.Amount.Value) * attributePoints * allies;
            return addYieldsAmount(yieldsDelta, modifier, amount);
        }

        case "EFFECT_PLAYER_ADJUST_YIELD": {
            return addYieldsAmount(yieldsDelta, modifier, Number(modifier.Arguments.Amount.Value));
        }

        // TODO This is really complex, like "+1 for each time a disaster provided fertility".
        // We'd need to check disasters, not sure how right now.
        case "EFFECT_PLAYER_ADJUST_YIELD_FROM_DISTATERS": {
            return;
        }

        case "EFFECT_PLAYER_ADJUST_YIELD_PER_NUM_CITIES": {
            let numSettlements = 0;
            if (modifier.Arguments.Cities?.Value === 'true') numSettlements += player.Stats.numCities;            
            if (modifier.Arguments.Towns?.Value === 'true') numSettlements += player.Stats.numTowns;
            const amount = Number(modifier.Arguments.Amount.Value) * numSettlements;
            return addYieldsAmount(yieldsDelta, modifier, amount);
        }

        case "EFFECT_PLAYER_ADJUST_YIELD_PER_NUM_TRADE_ROUTES": {
            const amount = Number(modifier.Arguments.Amount.Value) * player.Trade.countPlayerTradeRoutes();
            return addYieldsAmount(yieldsDelta, modifier, amount);
        }

        case "EFFECT_PLAYER_ADJUST_YIELD_PER_RESOURCE": {
            const resourcesCount = modifier.Arguments.Imported?.Value === 'true'
                ? player.Resources.getCountImportedResources()
                : player.Resources.getResources().length;
            const amount = Number(modifier.Arguments.Amount.Value) * resourcesCount;
            return addYieldsAmount(yieldsDelta, modifier, amount);
        }

        case "EFFECT_PLAYER_ADJUST_YIELD_PER_SUZERAIN": {
            const cityStates = getPlayerCityStatesSuzerain(player).length;
            const amount = Number(modifier.Arguments.Amount.Value) * cityStates;
            return addYieldsAmount(yieldsDelta, modifier, amount);
        }

        case "EFFECT_ATTACH_MODIFIERS": {
            // Nested modifiers; they are applied once for each subject from the parent modifier.
            const nestedModifierId = context.modifierArgument(modifier, 'ModifierId');
            const nestedModifier = resolveModifierById(nestedModifierId);
            const nestedSubjects = resolveSubjectsWithRequirements(player, nestedModifier, subject);
            return applyYieldsForSubjects(context, nestedSubjects, nestedModifier);
        }


        // Player (Units)
        case "EFFECT_PLAYER_ADJUST_UNIT_MAINTENANCE_EFFICIENCY": {
            const unitTypes = retrieveUnitTypesMaintenance(player);
            let totalReduction = 0;
            let totalCost = 0;
            for (let unitType in unitTypes) {
                if (!isUnitTypeInfoTargetOfArguments(unitTypes[unitType].UnitType, modifier.Arguments)) {
                    continue;
                }

                const reduction = calculateMaintenanceEfficiencyToReduction(
                    modifier, 
                    unitTypes[unitType].Count, 
                    unitTypes[unitType].MaintenanceCost
                );

                totalReduction += reduction;
                totalCost += unitTypes[unitType].MaintenanceCost;
            }
            
            return addYieldTypeAmountNoMultiplier(yieldsDelta, "YIELD_GOLD", totalReduction);
        }


        // ==============================
        // ========== City ==============
        // ==============================
        case "EFFECT_CITY_ADJUST_YIELD_PER_ATTRIBUTE": {
            const attributePoints = player.Identity?.getSpentAttributePoints(modifier.Arguments.AttributeType.Value) || 0;
            const amount = Number(modifier.Arguments.Amount.Value) * attributePoints;
            return addYieldsAmount(yieldsDelta, modifier, amount);
        }

        case "EFFECT_CITY_ADJUST_YIELD": {
            // TODO Check `TRADITION_TIRAKUNA` for `Arguments.Apply` with `Rate` value.
            // TODO Implement `Arguments.PercentMultiplier` (check TRADITION_ASSEMBLY_LINE) 
            if (modifier.Arguments.Percent) {
                return addYieldsPercentForCitySubject(yieldsDelta, modifier, subject, Number(modifier.Arguments.Percent.Value)); 
            }
            else if (modifier.Arguments.Amount) {
                return addYieldsAmount(yieldsDelta, modifier, Number(modifier.Arguments.Amount.Value));
            }
            else {
                console.warn(`Unhandled ModifierArguments: ${modifier.Arguments}`);
                return;
            }
        }

        case "EFFECT_CITY_ACTIVATE_CONSTRUCTIBLE_ADJACENCY": {
            const adjancencies = parseArgumentsArray(modifier.Arguments, 'ConstructibleAdjacency'); 
            adjancencies.forEach(adjacencyId => {
                const adjacencyType = AdjancenciesCache.get(adjacencyId);
                if (!adjacencyType) {
                    console.error(`AdjacencyType not found for ID: ${adjacencyId}`);
                    return;
                }
                const validConstructibles = findCityConstructiblesMatchingAdjacency(subject, adjacencyId);
                validConstructibles.forEach(constructible => {
                    const amount = getYieldsForAdjacency(constructible.location, adjacencyType);
                    addYieldTypeAmount(yieldsDelta, adjacencyType.YieldType, amount);
                });
            });
            return;
        }
        
        case "EFFECT_CITY_ADJUST_ADJACENCY_FLAT_AMOUNT": {
            const adjancencies = parseArgumentsArray(modifier.Arguments, 'Adjacency_YieldChange');
            adjancencies.forEach(adjacencyId => {
                const adjacencyType = AdjancenciesCache.get(adjacencyId);
                const constructibles = findCityConstructibles(subject);
                constructibles.forEach(({ constructible }) => {
                    if (!adjacencyType) {
                        console.error(`AdjacencyType not found for ID: ${adjacencyId}`);
                        return;
                    }

                    const adjacentPlots = getPlotsGrantingAdjacency(constructible.location, adjacencyType).length; 
                    // TODO Are we sure about `Divisor`?
                    const amount = Number(modifier.Arguments.Amount?.Value) * adjacentPlots / Number(modifier.Arguments.Divisor?.Value || 1);
                    addYieldTypeAmount(yieldsDelta, adjacencyType.YieldType, amount);
                });
            });
            return;
        }

        case "EFFECT_CITY_GRANT_WAREHOUSE_YIELD": {
            const warehousesYieldChanges = parseArgumentsArray(modifier.Arguments, 'WarehouseYieldChange');
            warehousesYieldChanges.forEach(warehouseYield => {
                const warehouseYieldType = GameInfo.Warehouse_YieldChanges.find(wyc => wyc.ID === warehouseYield);
                if (!warehouseYieldType) {
                    console.error(`WarehouseYieldType not found for ID: ${warehouseYield}`);
                    return;
                }
                
                const amount = getYieldsForWarehouseChange(subject, warehouseYieldType);
                addYieldTypeAmount(yieldsDelta, warehouseYieldType.YieldType, amount);
            });
            return;
        }

        case "EFFECT_CITY_ACTIVATE_CONSTRUCTIBLE_WAREHOUSE_YIELD": {
            const warehousesYields = parseArgumentsArray(modifier.Arguments, 'ConstructibleWarehouseYield');
            warehousesYields.forEach(warehouseYield => {
                const warehouseYieldType = GameInfo.Warehouse_YieldChanges.find(wyc => wyc.ID === warehouseYield);
                const constructibles = findCityConstructiblesMatchingWarehouse(subject, warehouseYieldType);
                if (!constructibles.length) {
                    return;
                }

                // The amount is the same for each Constructible, since it's a bonus based on all the plots
                // in the city.
                // So we calculate it once and apply it to all the Constructibles.
                // I personally suppose that there is only _one_ Constructible per city that can get this bonus,
                // but I'm not sure.
                const amount = getYieldsForWarehouseChange(subject, warehouseYieldType);
                constructibles.forEach(constructible => {
                    addYieldTypeAmount(yieldsDelta, warehouseYieldType.YieldType, amount);
                });
            });
            return;
        }

        case "EFFECT_CITY_ADJUST_BUILDING_MAINTENANCE_EFFICIENCY": {
            /** @type {City}  */
            const city = subject;
            const constructibles = findCityConstructibles(subject);
            let totalGoldReduction = 0;
            let totalHappinessReduction = 0;
            constructibles.forEach(({ constructible, constructibleType }) => {
                const { gold, happiness } = computeConstructibleMaintenanceEfficiencyReduction(
                    city, 
                    constructible, 
                    constructibleType, 
                    modifier
                );
                totalGoldReduction += gold;
                totalHappinessReduction += happiness;
            });

            addYieldTypeAmountNoMultiplier(yieldsDelta, "YIELD_GOLD", totalGoldReduction);
            addYieldTypeAmountNoMultiplier(yieldsDelta, "YIELD_HAPPINESS", totalHappinessReduction);
            return;
        }

        case "EFFECT_CITY_ADJUST_CONSTRUCTIBLE_YIELD": {
            const buildingsCount = getBuildingsCountForModifier([subject], modifier);
            const amount = Number(modifier.Arguments.Amount.Value) * buildingsCount;
            return addYieldsAmount(yieldsDelta, modifier, amount);
        }

        // TODO Is it just food? Or just the growth rate, so no yield type?
        case "EFFECT_CITY_ADJUST_GROWTH": {
            console.warn(`EFFECT_CITY_ADJUST_GROWTH not implemented`);
            return;
        }

        // +X% to Production to overbuild
        case "EFFECT_CITY_ADJUST_OVERBUILD_PRODUCTION_MOD": return;
        // +X% to Production to adjust project production
        case "EFFECT_CITY_ADJUST_PROJECT_PRODUCTION": return;

        case "EFFECT_CITY_ADJUST_TRADE_YIELD": {
            // TODO Hard to find trade yields. Seems a bug in `city.Yields.getTradeYields()`
            return;
        }

        // City (Workers)
        case "EFFECT_CITY_ADJUST_WORKER_YIELD": {
            const specialists = getCitySpecialistsCount(subject);
            const amount = Number(modifier.Arguments.Amount.Value) * specialists;
            return addYieldsAmount(yieldsDelta, modifier, amount);
        }

        case "EFFECT_CITY_ADJUST_WORKER_MAINTENANCE_EFFICIENCY": {
            const specialists = getCitySpecialistsCount(subject);
            const maintenanceCost = 2 * specialists; // Total Maintenance Cost is 2 per specialist
            const value = calculateMaintenanceEfficiencyToReduction(
                modifier,
                specialists,
                maintenanceCost
            );
            return addYieldsAmount(yieldsDelta, modifier, value);
        }

        case "EFFECT_CITY_ADJUST_YIELD_PER_COMMANDER_LEVEL": {
            const commanders = getArmyCommanders(subject);
            const totalLevels = commanders.reduce((acc, commander) => acc + commander.Experience.getLevel, 0);
            const amount = Number(modifier.Arguments.Amount.Value) * totalLevels;
            return addYieldsAmount(yieldsDelta, modifier, amount);
        }

        case "EFFECT_CITY_ADJUST_YIELD_PER_GREAT_WORK": {
            const greatWorks = getCityGreatWorksCount(subject);            
            const amount = Number(modifier.Arguments.Amount.Value) * greatWorks;
            return addYieldsAmount(yieldsDelta, modifier, amount);
        }

        case "EFFECT_CITY_ADJUST_YIELD_PER_POPULATION": {
            const amount = Number(modifier.Arguments.Amount.Value);
            if (modifier.Arguments.Urban?.Value === 'true') {
                const urbanFactor = subject.urbanPopulation / Number(modifier.Arguments.Divisor?.Value || 1);
                addYieldsAmount(yieldsDelta, modifier, amount * urbanFactor);
            }
            if (modifier.Arguments.Rural?.Value === 'true') {
                const ruralFactor = subject.ruralPopulation / Number(modifier.Arguments.Divisor?.Value || 1);
                addYieldsAmount(yieldsDelta, modifier, amount * ruralFactor);
            }
            return;
        }

        case "EFFECT_CITY_ADJUST_YIELD_PER_RESOURCE": {
            const assignedResources = getCityAssignedResourcesCount(subject);
            const amount = Number(modifier.Arguments.Amount.Value) * assignedResources;
            return addYieldsAmount(yieldsDelta, modifier, amount);
        }

        case "EFFECT_CITY_ADJUST_YIELD_PER_SUZERAIN": {
            const cityStates = getPlayerCityStatesSuzerain(player).length;
            const amount = Number(modifier.Arguments.Amount.Value) * cityStates;
            return addYieldsAmount(yieldsDelta, modifier, amount);
        }

        case "EFFECT_CITY_ADJUST_YIELD_PER_SURPLUS_HAPPINESS": {
            const happiness = getCityYieldHappiness(subject);
            const surplusAmount = happiness / Number(modifier.Arguments.Divisor?.Value || 1);
            const amount = Number(modifier.Arguments.Amount.Value) * surplusAmount;
            return addYieldsAmount(yieldsDelta, modifier, amount);
        }

        case "EFFECT_DIPLOMACY_ADJUST_CITY_YIELD_PER_PLAYER_RELATIONSHIP": {
            const allies = getPlayerRelationshipsCountForModifier(player, modifier);
            const amount = Number(modifier.Arguments.Amount.Value) * allies;
            return addYieldsAmount(yieldsDelta, modifier, amount);
        }

        case "EFFECT_CITY_ADJUST_YIELD_PER_ACTIVE_TRADITION": {
            const count = getPlayerActiveTraditionsForModifier(player, modifier);
            const amount = Number(modifier.Arguments.Amount.Value) * count;
            return addYieldsAmount(yieldsDelta, modifier, amount);
        }

        // ==============================
        // ========== Plot ==============
        // ==============================
        case "EFFECT_PLOT_ADJUST_YIELD": {
            // TODO Percent?
            const amount = Number(modifier.Arguments.Amount.Value);
            return addYieldsAmount(yieldsDelta, modifier, amount);
        }

        // ==============================
        // ========== Unit ==============
        // ==============================

        case "EFFECT_DIPLOMACY_ADJUST_UNIT_MAINTENANCE_PER_PLAYER_RELATIONSHIP": {
            const allies = getPlayerRelationshipsCountForModifier(player, modifier);
            const bonus = Number(modifier.Arguments.Amount.Value) * allies;            
            
            // A way to limit the bonus to the maintenance cost of the unit.
            // not sure if it's correct.
            const unitType = GameInfo.Units.lookup(subject.type);
            const amount = Math.max(bonus, unitType.Maintenance);
            return addYieldTypeAmount(yieldsDelta, "YIELD_GOLD", amount);
        }
        

        // Ignored effects
        case "EFFECT_CITY_ADJUST_UNIT_PRODUCTION":
        case "EFFECT_CITY_ADJUST_AVOID_RANDOM_EVENT":
        case "EFFECT_UNIT_ADJUST_MOVEMENT":
        case "EFFECT_ADJUST_PLAYER_OR_CITY_BUILDING_PURCHASE_EFFICIENCY":
        case "EFFECT_ADJUST_PLAYER_OR_CITY_UNIT_PURCHASE_EFFICIENCY":
        case "EFFECT_ADJUST_PLAYER_UNITS_PILLAGE_BUILDING_MODIFIER":
        case "EFFECT_ADJUST_PLAYER_UNITS_PILLAGE_IMPROVEMENT_MODIFIER":
        case "EFFECT_DIPLOMACY_ADJUST_DIPLOMATIC_ACTION_TYPE_EFFICIENCY":
        case "EFFECT_DIPLOMACY_ADJUST_DIPLOMATIC_ACTION_TYPE_EFFICIENCY_PER_GREAT_WORK":
        case "EFFECT_DIPLOMACY_AGENDA_TIMED_UPDATE":
        case "EFFECT_DISTRICT_ADJUST_FORTIFIED_COMBAT_STRENGTH":
        case "EFFECT_PLAYER_ADJUST_SETTLEMENT_CAP":
        case "EFFECT_CITY_ADJUST_RESOURCE_CAP":
        case "EFFECT_CITY_ADJUST_TRADE_ROUTE_RANGE":
        case "EFFECT_CITY_ADJUST_UNIT_PRODUCTION":
        case "EFFECT_CITY_ADJUST_WONDER_PRODUCTION":
        case "EFFECT_CITY_ADJUST_UNIT_PRODUCTION_MOD_PER_SETTLEMENT":
        case "TRIGGER_PLAYER_GRANT_YIELD_ON_UNIT_CREATED":
        case "EFFECT_CITY_GRANT_UNIT":
        case "TRIGGER_CITY_GRANT_YIELD_ON_CONSTRUCTIBLE_CREATED":
        case "EFFECT_ADJUST_UNIT_POST_COMBAT_YIELD":
        case "EFFECT_ADJUST_UNIT_STRENGTH_MODIFIER":
        case "EFFECT_ADJUST_UNIT_CIV_UNIQUE_TRADITION_COMBAT_MODIFIER":
        case "EFFECT_ADJUST_UNIT_IGNORE_ZOC":     
        case "EFFECT_ADJUST_UNIT_SIGHT":
        case "EFFECT_ADJUST_UNIT_SPREAD_CHARGES":
        case "EFFECT_ARMY_ADJUST_EXPERIENCE_RATE":
        case "EFFECT_ARMY_ADJUST_MOVEMENT_RATE": 
        case "EFFECT_UNIT_ADJUST_ABILITY":
        case "EFFECT_UNIT_ADJUST_COMMAND_AWARD":
        case "EFFECT_UNIT_ADJUST_HEAL_PER_TURN":
        case "EFFECT_UNIT_ADJUST_MOVEMENT":      
            return;

        default:
            console.warn(`Unhandled EffectType: ${modifier.EffectType}`);
            return;
    }
}