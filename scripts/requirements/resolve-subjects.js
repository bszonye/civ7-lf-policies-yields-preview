import { hasCityBuilding, hasCityTerrain } from "./city-requirements.js";

/**
 * @param {ResolvedModifier} modifier 
 * @param {any} parentSubject May be a city, a plot, a player, etc. Usually a city for nested modifiers (EFFECT_ATTACH_MODIFIER_TO_CITY)
 * @returns 
 */
export function resolveSubjectsWithRequirements(player, modifier, parentSubject = null) {
    const baseSubjects = resolveBaseSubjects(modifier, parentSubject);

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
function resolveBaseSubjects(modifier, parentSubject = null) {
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

        // Nested (City)
        case "COLLECTION_CITY_PLOT_YIELDS": {
            if (!parentSubject) {
                console.error("COLLECTION_CITY_PLOT_YIELDS requires a parentSubject (City)");
                return [];
            }

            return parentSubject.getPurchasedPlots().map(plot => {
                return {
                    city: parentSubject,
                    plot,
                };
            });
        }
            
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
        case "REQUIREMENT_PLOT_DISTRICT_CLASS": {
            const { plot } = subject;
            const location = GameplayMap.getLocationFromIndex(plot);
            const districtId = MapCities.getDistrict(location.x, location.y);
            console.warn("REQUIREMENT_PLOT_DISTRICT_CLASS check for plot at" + location.x + "," + location.y + " with districtId " + districtId);
            const district = districtId ? Districts.get(districtId) : null;
            if (!district) return false;
            const districtClass = GameInfo.Districts.lookup(district.type)?.DistrictClass;
            console.warn("District type is " + district.type + " and class is " + districtClass);
            const requiredClasses = requirement.Arguments.DistrictClass?.Value.split(",").map(s => s.trim());
            console.warn("Required classes are " + requiredClasses);
            return requiredClasses.includes(districtClass);
        }

        // Player (Owner)

        
        default:
            console.warn(`Unhandled RequirementType: ${requirement.Requirement.RequirementType}`);
            return false;
    }
}