/**
 * Base interface for all table entries in the Civ7 modding toolkit.
 * Every entry includes:
 * - `$index`: A unique index within the table.
 * - `$hash`: A unique identifier for fast lookups.
 */
declare interface BaseTableEntry {
  /** Unique index within the table */
  $index: number;
  /** Unique identifier for fast lookups */
  $hash: number;
}

/**
 * Represents a Tradition in the game.
 * @property {string} TraditionType - Unique identifier for the tradition (PK)
 * @property {string} AgeType - Age category for the tradition
 * @property {string} Description - Localization key for the description
 * @property {boolean} IsCrisis - Whether this is a crisis tradition
 * @property {string} Name - Localization key for the name
 */
declare interface Tradition extends BaseTableEntry {
  TraditionType: string;
  AgeType: string;
  Description: string;
  IsCrisis: boolean;
  Name: string;
}

/**
 * Represents a Modifier that alters game mechanics.
 */
declare interface Modifier extends BaseTableEntry {
  ModifierId: string;
  ModifierType: string;
  OwnerRequirementSetId?: string | null;
  SubjectRequirementSetId?: string | null;
  Permanent: boolean;
  RunOnce: boolean;
}

/**
 * Represents a DynamicModifier that applies an effect to a collection of objects.
 */
declare interface DynamicModifier extends BaseTableEntry {
  ModifierType: string;
  CollectionType: string;
  EffectType: string;
}

/**
 * Represents an argument for a Modifier.
 */
declare interface ModifierArgument extends BaseTableEntry {
  ModifierId: string;
  Name: string;
  Value: string;
  Extra?: string | null;
  SecondExtra?: string | null;
  Type?: string | null;
}

/**
 * Links a Tradition to a Modifier.
 */
declare interface TraditionModifier extends BaseTableEntry {
  TraditionType: string;
  ModifierId: string;
}

/**
 * Represents an EffectType from GameEffects.
 */
declare interface GameEffect extends BaseTableEntry {
  Type: string;
  ContextInterfaces?: string | null;
  Description?: string | null;
  GameCapabilities?: string | null;
  SubjectInterfaces?: string | null;
  SupportsRemove?: boolean;
}

/**
 * Represents a set of requirements.
 */
declare interface RequirementSet extends BaseTableEntry {
  RequirementSetId: string;
  RequirementSetType: string;
}

/**
 * Links a RequirementSet to individual Requirements.
 */
declare interface RequirementSetRequirement extends BaseTableEntry {
  RequirementSetId: string;
  RequirementId: string;
}

/**
 * Represents a Requirement in the game.
 */
declare interface Requirement extends BaseTableEntry {
  RequirementId: string;
  RequirementType: string;
  AiWeighting?: number;
  BehaviorTree?: string | null;
  Impact?: number;
  Inverse?: boolean;
  Likeliness?: number;
  Persistent?: boolean;
  ProgressWeight?: number;
  Reverse?: boolean;
  Triggered?: boolean;
}

/**
 * Represents an argument for a Requirement.
 */
declare interface RequirementArgument extends BaseTableEntry {
  RequirementId: string;
  Name: string;
  Value: string;
  Extra?: string | null;
  SecondExtra?: string | null;
  Type?: string | null;
}

/**
 * Represents a terrain type in the game.
 * 
 * @property {string} TerrainType - Unique identifier or type of the terrain.
 * @property {number} Appeal - Appeal value affecting attractiveness.
 * @property {number} DefenseModifier - Defensive modifier provided by the terrain.
 * @property {boolean} Hills - Whether the terrain has hills.
 * @property {boolean} Impassable - Whether the terrain is impassable.
 * @property {number} InfluenceCost - Cost required to claim or utilize the terrain.
 * @property {boolean} Mountain - Whether the terrain is classified as a mountain.
 * @property {number} MovementCost - Cost of moving through this terrain.
 * @property {string} Name - Display name of the terrain.
 * @property {number} SightModifier - Modifier affecting visibility from this terrain.
 * @property {number} SightThroughModifier - Modifier affecting visibility through this terrain.
 * @property {boolean} Water - Whether the terrain contains water.
 */
declare interface Terrain {
  TerrainType: string;
  Appeal: number;
  DefenseModifier: number;
  Hills: boolean;
  Impassable: boolean;
  InfluenceCost: number;
  Mountain: boolean;
  MovementCost: number;
  Name: string;
  SightModifier: number;
  SightThroughModifier: number;
  Water: boolean;
}

/**
 * Represents a tag associated with a specific type.
 * 
 * @property {string} Tag - The tag identifier.
 * @property {string} Type - The associated type for the tag.
 */
declare interface TypeTag {
  Tag: string;
  Type: string;
}



declare type GameInfoArray<T> = T[] & { 
  lookup(hash: number): T | undefined;
};

/**
 * Represents the entire GameInfo structure in Civ7's modding toolkit.
 */
declare interface IGameInfo {
  Traditions: GameInfoArray<Tradition>;
  Modifiers: GameInfoArray<Modifier>;
  DynamicModifiers: GameInfoArray<DynamicModifier>;
  ModifierArguments: GameInfoArray<ModifierArgument>;
  TraditionModifiers: GameInfoArray<TraditionModifier>;
  GameEffects: GameInfoArray<GameEffect>;
  RequirementSets: GameInfoArray<RequirementSet>;
  RequirementSetRequirements: GameInfoArray<RequirementSetRequirement>;
  Requirements: GameInfoArray<Requirement>;
  RequirementArguments: GameInfoArray<RequirementArgument>;
  Terrains: GameInfoArray<Terrain>;
  TypeTags: GameInfoArray<TypeTag>;
}

declare type IYieldTypes = {
  [key: string]: number;
} 

declare var GameInfo: IGameInfo;
declare var YieldTypes: IYieldTypes;