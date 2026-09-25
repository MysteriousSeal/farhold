/**
 * Runtime records that the game builds up incrementally (fields are added after creation).
 * They are intentionally loose for now; tighten each alias into a real interface over time.
 */
export type Rec = Record<string, any>;
export type Enemy = Rec;
export type Poi = Rec;
export type Dungeon = Rec;
export type Look = Rec;
export type Stats = Rec;
