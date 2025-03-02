import { PolicyYieldsCache } from "../cache.js";
import { getAdjacentPlots } from "../game/adjacency.js";
import { hasCityBuilding, hasCityTerrain } from "../game/city.js";
import { getPlotConstructiblesByLocation, hasPlotDistrictOfClass, isPlotQuarter } from "../game/plot.js";

/**
 *
 * @param {*} player
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
            const loc = GameplayMap.getLocationFromIndex(subject.plot);
            return GameplayMap.isCoastalLand(loc.x, loc.y) || getAdjacentPlots(subject.plot).some(plot => {
                const adjacentLoc = GameplayMap.getLocationFromIndex(plot);
                return GameplayMap.isCoastalLand(adjacentLoc.x, adjacentLoc.y);
            });
        }

        case "REQUIREMENT_PLOT_HAS_CONSTRUCTIBLE": {
            const loc = GameplayMap.getLocationFromIndex(subject.plot);
            const constructibles = getPlotConstructiblesByLocation(loc.x, loc.y);
            return constructibles.some(c => {
                if (requirement.Arguments.ConstructibleType?.Value) {
                    return c.constructibleType.ConstructibleType === requirement.Arguments.ConstructibleType.Value;
                }
                if (requirement.Arguments.Tag?.Value) {
                    const tags = PolicyYieldsCache.getTagsForConstructibleType(c.constructibleType.ConstructibleType);
                    return tags.has(requirement.Arguments.Tag.Value);
                }
            });
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

        // Player (Owner)
        default:
            console.warn(`Unhandled RequirementType: ${requirement.Requirement.RequirementType}`);
            return false;
    }
}
