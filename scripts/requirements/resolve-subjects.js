import { hasCityBuilding, hasCityTerrain } from "./city-requirements.js";

/**
 * @param {ResolvedModifier} modifier 
 * @returns 
 */
export function resolveSubjectsWithRequirements(player, modifier) {
    const baseSubjects = resolveBaseSubjects(modifier);

    return baseSubjects.filter(subject => {
        return modifier.SubjectRequirements.every(requirement => {
            const isSatisfied = isRequirementSatisfied(player, subject, requirement);
            return requirement.Requirement.Inverse ? !isSatisfied : isSatisfied;
        });
    });
}

/**
 * @param {ResolvedModifier} modifier
 */
function resolveBaseSubjects(modifier) {
    const player = Players.get(GameContext.localPlayerID);
    switch (modifier.CollectionType) {
        case "COLLECTION_PLAYER_CAPITAL_CITY":
            return [player.Cities.getCapital()];
        
            case "COLLECTION_PLAYER_CITIES":
            return player.Cities.getCities();
        
            // We don't care about other players cities, since we need anyway the effect
        // applied to _our_ cities.
        case "COLLECTION_ALL_CITIES":
            return player.Cities.getCities();

        case "COLLECTION_PLAYER_PLOT_YIELDS": {
            let plots = [];
            player.Cities.getCities().forEach(city => {
                plots.push(...city.getPurchasedPlots().map(plot => {
                    return {
                        city,
                        plot,
                    };
                }));
            });
            return plots;
        }

        case "COLLECTION_OWNER":
            return [player];
            
        case "COLLECTION_ALL_UNITS":
            console.warn("COLLECTION_ALL_UNITS not implemented");
            return [];

        case "COLLECTION_PLAYER_UNITS":
            console.warn("COLLECTION_PLAYER_UNITS not implemented");
            return [];

        case "COLLECTION_CITIES_FOLLOWING_OWNER_RELIGION": // Technically easy to grab, but no interesting effects applied
        // Recognized, but we can't provide simple yields for these:
        case "COLLECTION_PLAYER_COMBAT":
        case "COLLECTION_UNIT_COMBAT":
            return [];

        default:
            console.warn(`Unhandled CollectionType: ${modifier.CollectionType}`);
            return [];
    }
}


/**
 * 
 * @param {*} player 
 * @param {*} subject 
 * @param {ResolvedRequirement} requirement 
 * @returns 
 */
function isRequirementSatisfied(player, subject, requirement) {
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

        // Player (Owner)

        
        default:
            console.warn(`Unhandled RequirementType: ${requirement.Requirement.RequirementType}`);
            return false;
    }
}