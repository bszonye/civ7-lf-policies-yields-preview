import { hasCityBuilding, hasCityTerrain } from "./requirements/city-requirements.js";
import { addYieldsAmount, addYieldsPercent, addYieldsPercentForCitySubject, createEmptyYieldsDelta, resolveYields } from "./yields.js";


export function previewPolicyYields(policy) {
    if (!policy) {
        return { yields: {}, modifiers: [] };
    }

    const modifiers = getModifiersForTradition(policy.TraditionType);
    
    try {
        const yieldsDelta = createEmptyYieldsDelta();
    
        // Context
        const player = Players.get(GameContext.localPlayerID);
        
        modifiers.forEach(modifier => {
            const subjects = resolveSubjectsWithRequirements(player, modifier);
            applyYieldsForSubjects(yieldsDelta, subjects, modifier);
        });
    
        return { yields: resolveYields(player, yieldsDelta), modifiers };
    }
    catch (error) {
        console.error("Error in previewPolicyYields for policy ", policy.TraditionType);
        console.error(error);
        return { yields: {}, modifiers };
    }
}

/**
 * @param {string} requirementSetId 
 * @returns {ResolvedRequirement[]}
 */
function getModifierRequirements(requirementSetId) {
    return GameInfo.RequirementSetRequirements
        .filter(rs => rs.RequirementSetId === requirementSetId)
        .map(rs => {
            const requirement = GameInfo.Requirements.find(r => r.RequirementId === rs.RequirementId);
            return {
                Requirement: requirement,
                Arguments: GameInfo.RequirementArguments
                    .filter(ra => ra.RequirementId === requirement.RequirementId)
                    .reduce((acc, ra) => {
                        const {
                            Name,
                            RequirementId,
                            ...argument
                        } = ra;
                        acc[Name] = argument;
                        return acc;
                    }, {}),
            }
        });
}

/**
 * Obtains the modifiers associated with the Tradition, and their requirements.
 * 
 * @param {string} traditionType 
 * @returns {ResolvedModifier[]}
 */
function getModifiersForTradition(traditionType) {
    // 1. Ottieni i Modifier associati alla Tradition
    let traditionModifiers = GameInfo.TraditionModifiers
        .filter(tm => tm.TraditionType === traditionType)
        .map(tm => tm.ModifierId);

    // 2. Ottieni i ModifierType associati ai ModifierId trovati
    let modifiers = GameInfo.Modifiers
        .filter(m => traditionModifiers.includes(m.ModifierId))
        .map(m => {
            const SubjectRequirements = getModifierRequirements(m.SubjectRequirementSetId);
            const OwnerRequirements = getModifierRequirements(m.OwnerRequirementSetId);
            const DynamicModifier = GameInfo.DynamicModifiers.find(dm => dm.ModifierType === m.ModifierType);
            return {
                Modifier: m,
                Arguments: GameInfo.ModifierArguments
                    .filter(ma => ma.ModifierId === m.ModifierId)
                    .reduce((acc, ma) => {
                        const {
                            Name,
                            ModifierId,
                            ...argument
                        } = ma;
                        acc[Name] = argument;
                        return acc;
                    }, {}),
                CollectionType: DynamicModifier.CollectionType,
                EffectType: DynamicModifier.EffectType,                
                SubjectRequirements,
                OwnerRequirements,
            };
        });

    return modifiers;
}

/**
 * @param {YieldsDelta} yieldsDelta 
 * @param {any[]} subjects 
 * @param {ResolvedModifier} modifier 
 * @returns 
 */
function applyYieldsForSubjects(yieldsDelta, subjects, modifier) {
    subjects.forEach(subject => {
        applyYieldsForSubject(yieldsDelta, subject, modifier);
    });
}

/**
 * @param {YieldsDelta} yieldsDelta 
 * @param {ResolvedModifier} modifier
 */
function applyYieldsForSubject(yieldsDelta, subject, modifier) {
    // const player = Players.get(GameContext.localPlayerID);

    switch (modifier.EffectType) {
        // Player
        case "EFFECT_PLAYER_ADJUST_YIELD_PER_ACTIVE_TRADITION": {
            const activeTraditions = subject.Culture.getActiveTraditions().length;
            const amount = Number(modifier.Arguments.Amount.Value) * activeTraditions;
            return addYieldsAmount(yieldsDelta, modifier, amount);
        }

        case "EFFECT_CITY_ADJUST_YIELD_PER_ATTRIBUTE": {
            const attributePoints = subject.Identity.getSpentAttributePoints(modifier.Arguments.AttributeType.Value);
            const amount = Number(modifier.Arguments.Amount.Value) * attributePoints;
            return addYieldsAmount(yieldsDelta, modifier, amount);
        }
        
        // City
        case "EFFECT_CITY_ADJUST_WORKER_YIELD": {
            const specialists = subject?.Workers?.getNumWorkers(true);
            const amount = Number(modifier.Arguments.Amount.Value) * specialists;
            return addYieldsAmount(yieldsDelta, modifier, amount);
        }

        case "EFFECT_CITY_ADJUST_YIELD": {
            if (modifier.Arguments.Percent) {
                addYieldsPercentForCitySubject(yieldsDelta, modifier, subject, Number(modifier.Arguments.Percent.Value)); 
            }
            else if (modifier.Arguments.Amount) {
                return addYieldsAmount(yieldsDelta, modifier, Number(modifier.Arguments.Amount.Value));
            }
            else {
                console.warn(`Unhandled ModifierArguments: ${modifier.Arguments}`);
                return;
            }
        }

        default:
            console.warn(`Unhandled EffectType: ${modifier.EffectType}`);
            return;
    }
}

/**
 * @param {ResolvedModifier} modifier
 */
function resolveBaseSubjects(modifier) {
    const player = Players.get(GameContext.localPlayerID);
    switch (modifier.CollectionType) {
        case "COLLECTION_PLAYER_CITIES":
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
        default:
            console.warn(`Unhandled CollectionType: ${modifier.CollectionType}`);
            return [];
    }
}

/**
 * @param {ResolvedModifier} modifier 
 * @returns 
 */
function resolveSubjectsWithRequirements(player, modifier) {
    const baseSubjects = resolveBaseSubjects(modifier);

    return baseSubjects.filter(subject => {
        return modifier.SubjectRequirements.every(requirement => {
            const isSatisfied = isRequirementSatisfied(player, subject, requirement);
            return requirement.Requirement.Inverse ? !isSatisfied : isSatisfied;
        });
    });
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