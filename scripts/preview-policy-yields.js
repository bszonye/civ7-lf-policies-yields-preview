import { applyYieldsForSubjects } from "./effects/apply-effects.js";
import { UnwrappedPlayerYieldsCacheInstance } from "./global-cache.js";
import { resolveSubjectsWithRequirements } from "./requirements/resolve-subjects.js";
import { createEmptyYieldsDelta } from "./yields.js";


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
 */
export function resolveYields(player, yieldsDelta) {
    const yields = {};
    const CachedPlayerYields = UnwrappedPlayerYieldsCacheInstance.get();

    for (const type in YieldTypes) {
        yields[type] = yieldsDelta.Amount[type] || 0;
        yields[type] *= 1 + ((CachedPlayerYields[type]?.Percent || 0) / 100);
    }

    for (const type in yieldsDelta.Percent) {
        const baseYield = CachedPlayerYields[type]?.BaseAmount || 0;        
        const increase = (baseYield + yieldsDelta.Amount[type] || 0) * (yieldsDelta.Percent[type] / 100);
        yields[type] += increase;
    }

    // TODO This is probably wrong, since even the previous net yield is probably
    // already including some multiplied / non-multiplied yields.
    for (const type in yieldsDelta.AmountNoMultiplier) {
        yields[type] += yieldsDelta.AmountNoMultiplier[type];
    }

    for (const type in yields) {
        yields[type] = Math.round(yields[type]);
    }

    return yields;
}