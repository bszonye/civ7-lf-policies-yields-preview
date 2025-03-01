import { resolveModifierById } from "../modifiers.js";
import { addYieldsAmount, addYieldsPercentForCitySubject, addYieldTypeAmount, addYieldTypeAmountNoMultiplier, parseArgumentsArray } from "../yields.js";
import { AdjancenciesCache, findCityConstructiblesRespectingAdjacency, getPlayerBuildingsCountForModifier, getYieldsForConstructibleAdjacency } from "./constructibles.js";
import { getPlayerUnitsTypesMainteneance, isUnitTypeInfoTargetOfModifier, unitsMaintenanceEfficencyToReduction } from "./units.js";
import { resolveSubjectsWithRequirements } from "../requirements/resolve-subjects.js";

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

    // We can't apply new-only modifiers here. These are modifiers applied
    // only when the condition is met, dynamically, not constantly.
    // Check `IUS_REFORMANDI` in the Exploration Age
    if (modifier.Modifier.NewOnly) {
        return;
    }

    switch (modifier.EffectType) {
        // Player (subject = player)
        case "EFFECT_PLAYER_ADJUST_YIELD_PER_ACTIVE_TRADITION": {
            const activeTraditions = subject.Culture.getActiveTraditions();
            let count = 0;
            // TODO this is bugged for Regis, since the tradition itself is a CivUnique
            for (const tradition of activeTraditions) {
                const traditionType = GameInfo.Traditions.lookup(tradition);
                if (!traditionType.TraitType && modifier.Arguments.CivUnique?.Value === 'true') {
                    continue;
                }
                count++; 
            }
            const amount = Number(modifier.Arguments.Amount.Value) * count;
            return addYieldsAmount(yieldsDelta, modifier, amount);
        }

        case "EFFECT_DIPLOMACY_ADJUST_YIELD_PER_PLAYER_RELATIONSHIP": {
            const allPlayers = Players.getAlive();
            let allies = 0;
            allPlayers.forEach(otherPlayer => {
                if (!otherPlayer.isMajor || otherPlayer.id == GameContext.localPlayerID) {
                    return;
                }

                if (modifier.Arguments.UseAlliances.Value === 'true' &&
                    player.Diplomacy?.hasAllied(otherPlayer)) {
                    allies++;
                }
                // TODO We don't have examples without `UseAlliances` yet
            });
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
                player.Diplomacy?.hasAllied(otherPlayer)
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
            const cityStates = Players.getAlive().filter(otherPlayer => 
                otherPlayer.isMinor && 
                otherPlayer.Influence?.hasSuzerain &&
                otherPlayer.Influence.getSuzerain() === GameContext.localPlayerID
            ).length;
            const amount = Number(modifier.Arguments.Amount.Value) * cityStates;
            return addYieldsAmount(yieldsDelta, modifier, amount);
        }

        case "EFFECT_ATTACH_MODIFIERS": {
            // Nested modifiers; they are applied once for each subject from the parent modifier.
            const nestedModifierId = modifier.Arguments.ModifierId.Value;
            const nestedModifier = resolveModifierById(nestedModifierId);
            const nestedSubjects = resolveSubjectsWithRequirements(player, nestedModifier, subject);
            return applyYieldsForSubjects(yieldsDelta, nestedSubjects, nestedModifier);
        }


        // Player (Units)
        case "EFFECT_PLAYER_ADJUST_UNIT_MAINTENANCE_EFFICIENCY": {
            const unitTypes = getPlayerUnitsTypesMainteneance(player);
            let totalReduction = 0;
            let totalCost = 0;
            for (let unitType in unitTypes) {
                if (!isUnitTypeInfoTargetOfModifier(unitTypes[unitType], modifier)) {
                    continue;
                }

                const reduction = unitsMaintenanceEfficencyToReduction(
                    modifier, 
                    unitTypes[unitType].Count, 
                    unitTypes[unitType].MaintenanceCost
                );

                totalReduction += reduction;
                totalCost += unitTypes[unitType].MaintenanceCost;
            }
            
            return addYieldTypeAmountNoMultiplier(yieldsDelta, "YIELD_GOLD", totalReduction);
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
                const validConstructibles = findCityConstructiblesRespectingAdjacency(subject, adjacencyId);
                validConstructibles.forEach(constructible => {
                    const amount = getYieldsForConstructibleAdjacency(constructible, adjacencyType);
                    addYieldTypeAmount(yieldsDelta, adjacencyType.YieldType, amount);
                });
            });
            return;
        }

        // Plot
        case "EFFECT_PLOT_ADJUST_YIELD": {
            // TODO Percent?
            const amount = Number(modifier.Arguments.Amount.Value);
            return addYieldsAmount(yieldsDelta, modifier, amount);
        }

        // Ignored effects
        case "EFFECT_CITY_ADJUST_UNIT_PRODUCTION":
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


            return;

        default:
            console.warn(`Unhandled EffectType: ${modifier.EffectType}`);
            return;
    }
}