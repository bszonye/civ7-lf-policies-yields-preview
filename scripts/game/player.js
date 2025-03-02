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
            player.Diplomacy?.hasAllied(otherPlayer)) {
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