import { hasCityBuilding, hasCityTerrain } from "../game/city.js";
import { hasPlotDistrictOfClass } from "../game/plot.js";

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

        // Plot
        case "REQUIREMENT_PLOT_DISTRICT_CLASS": {
            return hasPlotDistrictOfClass(subject.plot, requirement);
        }

        // Player (Owner)
        default:
            console.warn(`Unhandled RequirementType: ${requirement.Requirement.RequirementType}`);
            return false;
    }
}
