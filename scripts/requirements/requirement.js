import { hasUnitTag, isUnitTypeInfoTargetOfArguments } from "../game/units.js";
import { hasCityBuilding, hasCityOpenResourcesSlots, hasCityResourcesAmountAssigned, hasCityTerrain } from "../game/city.js";
import { hasPlotConstructibleByArguments, getPlotConstructiblesByLocation, hasPlotDistrictOfClass, isPlotQuarter, getAdjacentPlots, isPlotAdjacentToCoast } from "../game/plot.js";
import { isPlayerAtPeaceWithMajors, isPlayerAtWarWithOpposingIdeology } from "../game/player.js";

/**
 *
 * @param {Player} player
 * @param {*} subject
 * @param {ResolvedRequirement} requirement
 * @returns
 */
export function isRequirementSatisfied(player, subject, requirement) {
    switch (requirement.Requirement.RequirementType) {
        case "REQUIREMENT_CITY_IS_CAPITAL":
            return subject.isCapital;
        case "REQUIREMENT_CITY_IS_CITY":
            return !subject.isTown;
        case "REQUIREMENT_CITY_IS_TOWN":
            return subject.isTown;
        case "REQUIREMENT_CITY_IS_ORIGINAL_OWNER":
            return subject.originalOwner === player.id;
        case "REQUIREMENT_CITY_HAS_BUILDING":
            return hasCityBuilding(subject, requirement.Arguments);
        case "REQUIREMENT_CITY_HAS_PROJECT": {
            if (requirement.Arguments.HasAnyProject?.Value === "true") {
                return subject.Growth.projectType !== -1;
            }

            if (subject.Growth.projectType === -1) return false;

            const projectTypeName = GameInfo.Projects.lookup(subject.projectType)?.ProjectType;
            return projectTypeName === requirement.Arguments.ProjectType?.Value;
        }
        case "REQUIREMENT_CITY_HAS_TERRAIN":
            return hasCityTerrain(subject, requirement.Arguments);

        case "REQUIREMENT_CITY_IS_DISTANT_LANDS":
            return subject.isDistantLands;

        case "REQUIREMENT_CITY_POPULATION": {
            if (requirement.Arguments.MinUrbanPopulation?.Value) {
                return subject.urbanPopulation >= Number(requirement.Arguments.MinUrbanPopulation.Value);
            }
            console.warn(`Unhandled RequirementType: ${requirement.Requirement.RequirementType} with Arguments: ${JSON.stringify(requirement.Arguments)}`);
            return false;
        }

        case "REQUIREMENT_CITY_HAS_X_OPEN_RESOURCE_SLOTS": {
            const amount = Number(requirement.Arguments.Amount?.Value);
            return hasCityOpenResourcesSlots(subject, amount);
        }

        case "REQUIREMENT_CITY_HAS_X_RESOURCES_ASSIGNED": {
            const amount = Number(requirement.Arguments.Amount?.Value);
            return hasCityResourcesAmountAssigned(subject, amount);
        }

        case "REQUIREMENT_CITY_IS_INFECTED": {
            return subject.isInfected;
        }

        case "REQUIREMENT_CITY_HAS_BUILD_QUEUE": {
            // Old comment: I'm not sure about the sense of this.
            // Update: It can be seen in REQSET_ONLY_TOWNS, which is the Inverse of this requirement, so it's just towns
            return !subject.isTown;
        }

        case "REQUIREMENT_CITY_HAS_GARRISON_UNIT": {
            const loc = subject.location;
            const units = MapUnits.getUnits(loc.x, loc.y);
            return units.some(unit => unit.owner == player.id);
        }

        // City (Religion)
        case "REQUIREMENT_CITY_FOLLOWS_RELIGION": {
            const playerReligion = Players.Religion?.get(player.id);
            const hasPlayerReligion = playerReligion != null && playerReligion.getReligionType() != -1; 
            if (!hasPlayerReligion && requirement.Arguments.hasReligion?.Value === 'true') {
                return false;
            }
            
            const cityReligion = subject.Religion?.majorityReligion;
            if (cityReligion == -1 && requirement.Arguments.cityReligion?.Value === 'true') {
                return false;
            }

            return cityReligion === playerReligion.getReligionType();
        }

        // Plot
        case "REQUIREMENT_PLOT_DISTRICT_CLASS": {
            return hasPlotDistrictOfClass(subject.plot, requirement);
        }

        case "REQUIREMENT_PLOT_RESOURCE_VISIBLE": {
            const loc = GameplayMap.getLocationFromIndex(subject.plot);
            const resource = GameplayMap.getResourceType(loc.x, loc.y);
			if (resource == ResourceTypes.NO_RESOURCE) return false;

            const isVisible = GameplayMap.getRevealedState(GameContext.localPlayerID, loc.x, loc.y) != RevealedStates.HIDDEN;
            if (!isVisible) return false;

            return true;
        }

        case "REQUIREMENT_PLOT_IS_COASTAL_LAND": {
            const loc = GameplayMap.getLocationFromIndex(subject.plot);
            return GameplayMap.isCoastalLand(loc.x, loc.y);
        }

        case "REQUIREMENT_PLOT_ADJACENT_TO_COAST": {
            return isPlotAdjacentToCoast(subject.plot);
        }

        case "REQUIREMENT_PLOT_HAS_CONSTRUCTIBLE": {
            const loc = GameplayMap.getLocationFromIndex(subject.plot);
            return hasPlotConstructibleByArguments(loc, requirement.Arguments);
        }

        case "REQUIREMENT_PLOT_HAS_NUM_CONSTRUCTIBLES": {
            const amount = Number(requirement.Arguments.Amount?.Value);
            const loc = GameplayMap.getLocationFromIndex(subject.plot);
            const constructibles = getPlotConstructiblesByLocation(loc.x, loc.y);
            return constructibles.length >= amount;
        }

        case "REQUIREMENT_PLOT_IS_QUARTER": {
            return isPlotQuarter(subject.plot);
        }

        case "REQUIREMENT_PLOT_TERRAIN_TYPE_MATCHES": {
            const loc = GameplayMap.getLocationFromIndex(subject.plot);
            const terrainType = GameplayMap.getTerrainType(loc.x, loc.y);
            const terrain = GameInfo.Terrains.lookup(terrainType);
            return terrain.TerrainType == requirement.Arguments.TerrainType.Value;
        }

        case "REQUIREMENT_PLOT_ADJACENT_TERRAIN_TYPE_MATCHES": {
            return getAdjacentPlots(subject.plot).some(plot => {
                const loc = GameplayMap.getLocationFromIndex(plot);
                const terrainType = GameplayMap.getTerrainType(loc.x, loc.y);
                const terrain = GameInfo.Terrains.lookup(terrainType);
                return terrain.TerrainType == requirement.Arguments.TerrainType.Value;
            });
        }

        case "REQUIREMENT_PLOT_ADJACENT_CONSTRUCTIBLE_TYPE_MATCHES": {
            const range = Number(requirement.Arguments.MaxRange?.Value || 1);
            return getAdjacentPlots(subject.plot, range).some(plot => {
                const loc = GameplayMap.getLocationFromIndex(plot);
                return hasPlotConstructibleByArguments(loc, requirement.Arguments);
            });
        }

        case "REQUIREMENT_PLOT_IS_OWNER": {
            const loc = GameplayMap.getLocationFromIndex(subject.plot);
            return GameplayMap.getOwner(loc.x, loc.y) == player.id;
        }

        // Units
        case "REQUIREMENT_UNIT_TAG_MATCHES": {
            return hasUnitTag(subject, requirement.Arguments.Tag?.Value);
        }

        case "REQUIREMENT_UNIT_IS_IN_HOMELANDS": {
            /** @type {UnitInstance} */
            const unit = subject;
            return !player.isDistantLands(unit.location);
        }

        case "REQUIREMENT_UNIT_DOMAIN_MATCHES": {
            /** @type {UnitInstance} */
            const unit = subject;
            const unitType = GameInfo.Units.lookup(unit.type);
            return unitType.Domain == requirement.Arguments.UnitDomain.Value;
        }

        case "REQUIREMENT_UNIT_CLASS_MATCHES": {
            /** @type {UnitInstance} */
            const unit = subject;
            const unitTypeInfo = GameInfo.Units.lookup(unit.type);
            return isUnitTypeInfoTargetOfArguments(unitTypeInfo, requirement.Arguments);
            // return unitTypeInfo.Class == requirement.Arguments.UnitClassType.Value;
        }

        case "REQUIREMENT_UNIT_CORE_CLASS_MATCHES": {
            /** @type {UnitInstance} */
            const unit = subject;
            const unitTypeInfo = GameInfo.Units.lookup(unit.type);
            return unitTypeInfo.CoreClass == requirement.Arguments.UnitCoreClass.Value;
        }

        case "REQUIREMENT_UNIT_DOMAIN_MATCHES": {
            /** @type {UnitInstance} */
            const unit = subject;
            const unitTypeInfo = GameInfo.Units.lookup(unit.type);
            return unitTypeInfo.Domain == requirement.Arguments.UnitDomain.Value;
        }

        case "REQUIREMENT_UNIT_IN_OWNER_TERRITORY": {
            /** @type {UnitInstance} */
            const unit = subject;
            return GameplayMap.getOwner(unit.location.x, unit.location.y) == player.id;
        }

        // Player (Owner)
        case "REQUIREMENT_PLAYER_IS_AT_WAR_WITH_OPPOSING_IDEOLOGY": {
            return isPlayerAtWarWithOpposingIdeology(subject);
        }

        case "REQUIREMENT_PLAYER_IS_AT_PEACE_WITH_ALL_MAJORS": {
            return isPlayerAtPeaceWithMajors(subject);
        }

        // Ignored requirements. Usually because they relate to _combat_ bonuses, and we don't display those.
        case "REQUIREMENT_COMMANDER_HAS_X_PROMOTIONS":
        case "REQUIREMENT_PLOT_IS_SUZERAIN":
        case "REQUIREMENT_ENGAGED_TARGET_OF_TARGET_MATCHES":
        case "REQUIREMENT_PLAYER_IS_ATTACKING": {
            return false;
        }

        default:
            console.warn(`Unhandled RequirementType: ${requirement.Requirement.RequirementType}`);
            return false;
    }
}
