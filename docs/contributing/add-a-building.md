# Add a building, a feature, or a dig

Buildings are generated, not stamped: `BuildTools.planHouse` draws any footprint,
any number of floors, any material, with doors, stairs, rooms, lights, features and
a roof. Adding a *kind* of building is data, not new drawing code.

## A building type (hospital, school, airport, …)

1. `BUILDING_LABELS` in `intentFeatures.ts`, words in `intentCorpus.ts`, a pattern
   in `TYPE_WORDS` and a row in `TYPE_DEFAULTS` (`buildRequest.ts`): size class,
   floors, wall/trim/roof blocks, whether it is furnished, its sign, whether its
   doors slide open, and who works there.
2. Furniture per room purpose lives in `ROOM_FURNITURE` (`buildingKit.ts`); the
   building's own cycle of furniture is in `FURNITURE`.
3. Anything structural (a control tower, a chimney, a cross) is a flag on
   `HouseOptions` drawn in `planHouse`.

## An outdoor feature (playground, runway, …)

1. `FeatureKind` and `FEATURE_SIZE` in `BuildTools.ts`, `FEATURE_KINDS` in
   `buildingKit.ts`, a label in `intentFeatures.ts` and words in the corpus.
2. A `case` in `drawFeature`. If a child can walk on it, push its steps or ladders
   onto the `BuildingLayout` so the livability pass clears headroom.

A feature can take more than a size and a colour: `FeatureContext` carries `text`
(the dog house puts the first letter of a name over its door) and `extras` (a fence,
a bowl, a light — whatever the child named). Read them out of the words in
`parseFeature`, and let the drawing treat them as optional.

## A dig (pool, lake, bunker, …)

`EarthworkKind` + `EARTHWORK_SIZE` + a `case` in `planEarthwork`, and words in
`EARTHWORK_WORDS`.

## The rules every build must pass

`src/engine/build/livability.ts` is enforced on every building: a door on the
ground, tall and clear, three deep outside and clear behind; three blocks of
clearance over every step and landing; ladders continuous with a clear top; every
room with a doorway and a light.

**Rules are not proof.** Add a physics test that walks the real `PlayerController`
through what you built — up the stairs, in the door, along the tunnel. Every
passage bug this game has had was found that way and none of them by reading code.

## Where it lands

`SitePlanner` (`build/siteFinder.ts`) hands out the ground: level, clear, loaded,
unclaimed, and still plain terrain, spiralling out from the child. Ask it for a
plot sized to what you are building; never build at a fixed spot.

## Check it

```bash
npm test    # livability.test.ts (fuzz + physics walks), freeformBuild, wholeSentence
```
