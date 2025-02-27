import { applyYieldsForSubjects } from "./effects/apply-effects.js";
import { resolveSubjectsWithRequirements } from "./requirements/resolve-subjects.js";
import { createEmptyYieldsDelta, resolveYields } from "./yields.js";


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
