/**
 * @param {Player} player
 */
export function getPlayerCityStatesSuzerain(player) {
    const cityStates = Players.getAlive().filter(otherPlayer => 
        otherPlayer.isMinor && 
        otherPlayer.Influence?.hasSuzerain &&
        otherPlayer.Influence.getSuzerain() === player.id
    );
    return cityStates;
}

/**
 * @param {Player} player
 * @param {ResolvedModifier} modifier
 */
export function getPlayerRelationshipsCountForModifier(player, modifier) {
    const allPlayers = Players.getAlive();
    let allies = 0;
    allPlayers.forEach(otherPlayer => {
        if (!otherPlayer.isMajor || otherPlayer.id == GameContext.localPlayerID) {
            return;
        }

        if (modifier.Arguments.UseAlliances.Value === 'true' &&
            player.Diplomacy?.hasAllied(otherPlayer.id)) {
            allies++;
        }

        if (modifier.Arguments.RelationshipType?.Value) {
            const relationship = player.Diplomacy?.getRelationshipEnum(otherPlayer);
            const relationshipType = DiplomacyManager.getRelationshipTypeString(relationship);
            if (relationshipType == modifier.Arguments.RelationshipType.Value) {
                allies++;
            }
        }
    });
    return allies;
}

/**
 * @param {Player} player
 */
export function isPlayerAtWarWithOpposingIdeology(player) {
    const allPlayers = Players.getAlive();
    for (const otherPlayer of allPlayers) {
        if (!otherPlayer.isMajor || otherPlayer.id == GameContext.localPlayerID) {
            continue;
        }

        if (!player.Diplomacy?.isAtWarWith(otherPlayer.id)) {
            continue;
        }

        const playerIdeology = player.Diplomacy?.getIdeology();
        const otherPlayerIdeology = otherPlayer.Diplomacy?.getIdeology();
        if (playerIdeology == -1 || otherPlayerIdeology == -1) continue;
        
        // Same ideology
        if (playerIdeology == otherPlayerIdeology) continue;

        return true;
    }

    return false;
}

/**
 * @param {Player} player
 */
export function isPlayerAtPeaceWithMajors(player) {
    const allPlayers = Players.getAlive();
    for (const otherPlayer of allPlayers) {
        if (!otherPlayer.isMajor || otherPlayer.id == GameContext.localPlayerID) {
            continue;
        }

        if (player.Diplomacy?.isAtWarWith(otherPlayer.id)) {
            return false;
        }
    }

    return true;
}

/**
 * @param {Player} player
 * @param {ResolvedModifier} modifier
 */
export function getPlayerActiveTraditionsForModifier(player, modifier) {
    const activeTraditions = player.Culture.getActiveTraditions();
    // TODO this is bugged for Regis, since the tradition itself is a CivUnique
    let count = 0;
    for (const tradition of activeTraditions) {
        const traditionType = GameInfo.Traditions.lookup(tradition);
        if (!traditionType.TraitType && modifier.Arguments.CivUnique?.Value === 'true') {
            continue;
        }
        count++; 
    }
    return count;
}