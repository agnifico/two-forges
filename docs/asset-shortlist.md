# Kenney asset shortlist for the forge island

Candidates from the Kenney library for each station and decor category. Nothing has been copied into
this repo yet.

- **Source:** `~/Documents/code/3DResources/kenney-models/`. A model `<pack>/<file>.glb` lives at
  `kenney_<pack>/Models/GLB format/<file>.glb`, and it needs `Textures/colormap.png` copied beside it.
- **Full index:** `kenney-models/_index/index.json`, with notes in `_index/INDEX.md` and contact sheets
  in `_index/sheets/index.html` (open `sheets/all.html` to search everything).
- **Sizes:** W × H × D in world units at the pack's true scale, where a person is 2.8 tall
  (`personHeight` in `src/lib/scene/config.ts`). W is x, H is y and D is z. Kenney models face +z,
  which matches `rotationDeg: 0`.
- **Suggested scale:** an extra multiplier where the true-scale model is too big for the island or
  the slot. The island is about 30 units across, and the slot discs have radius 0.8–1.6.

Pack scale factors (pack units → world) for `packs` in `config.ts`:

| Pack | personHeight | × to world |
|---|---:|---:|
| fantasy-town-kit_2.0 | 0.638 | 4.392 |
| survival-kit | 0.414 | 6.757 |
| pirate-kit | 1.133 | 2.471 |
| mini-arcade | 0.773 | 3.621 |
| graveyard-kit_5.0 (optional) | 0.803 | 3.488 |
| platformer-kit (optional) | 0.907 | 3.086 |

## Packs and style

Use three core packs, plus mini-arcade for the arcade you've already chosen:

1. **fantasy-town-kit_2.0** is the reference look: stone and timber walls, teal roofs, the
   waterwheel, fences, lamps, paving, trees and rocks. Its own sample scene has a teal-roofed mill
   house with a waterwheel, which is close to the reference art.
2. **survival-kit** has a matching rustic style: anvil, grindstone, workbench, tools, chest, logs,
   rocks and signposts.
3. **pirate-kit** has the kiln-shaped dome for the furnace, wooden barrels and crates, the dock and
   the rowing boat.

Two optional packs cover small props only: **graveyard-kit_5.0** (lanterns, stepping-stone paving, a
tub-like bowl) and **platformer-kit** (flowers and mushrooms; no other pack has flowers). Leave both out
if you'd rather build those from simple shapes.

Style flags:

- **Palette is not the problem.** Every pack samples the same Kenney swatch atlas, so colours and
  texturing match. Untextured materials appear only for glass and water.
- **Stone colour clashes with the island.** Kenney stone is lavender-grey everywhere (fantasy-town
  walls and rocks, the pirate dome), while the island's rock is warm (`#a08a72`, stairs `#c2a984`). Tint
  the stone warmer when converting to toon materials, or use survival-kit's sandstone pieces for
  loose rocks.
- **mini-arcade is chibi.** It has soft, rounded, big-head proportions. The arcade cabinet will read
  cuter than the fantasy-town pieces; that's fine for one novelty station, but don't add more mini-pack
  items (mini-forest's blue-roofed shelters especially).
- **pirate-kit props are oversized.** At true scale a barrel (3.0 tall) is taller than a person and a
  chest is 2.8 tall. Scale its props by about 0.5. Its towers and docks are fine.
- **graveyard-kit is chunkier and rounder.** It's fine for small props and noticeable on anything
  big. Avoid the spooky items.
- **platformer-kit is the roundest, most cartoon pack.** Use it only for small ground cover.
- **Trees are big.** At true scale the trees are 10–13 world units tall, about 4 people. Scale them
  by 0.4–0.6 to match the reference, where the trees are about cottage height.
- **Don't use the modern packs:** building-kit, city-kit-industrial, factory-kit, train-kit and
  watercraft-pack. Watercraft's rowing boat is the same mesh as pirate-kit's but comes out 10 units
  long at its own scale, so use pirate-kit's copy.

## Stations

### Furnace (middle tier, slot r 1.1)

| # | Model | World size | Suggested scale | Why |
|---|---|---|---|---|
| 1 | pirate-kit/tower-base-door | 7.81 × 4.94 × 8.80 | ×0.45 → 3.5 × 2.2 × 4.0 | A squat stone dome with an arched door: the kiln silhouette in the reference. Add fantasy-town `chimney` on top and a glowing plane in the doorway. |
| 2 | fantasy-town-kit_2.0/chimney-base | 1.51 × 4.39 × 2.28 | ×1.3 | A stepped stone hearth with a flue: a smithy forge-hearth shape. Pair it with `campfire-pit` for the fire. |
| 3 | survival-kit/campfire-pit | 1.88 × 0.74 × 1.82 | 1 | Logs in a stone ring: the fire for #1 or #2, or an open-hearth forge on its own. |
| 4 | castle-kit/tower-hexagon-mid | 5.18 × 2.50 × 4.49 | ×0.6 → 3.1 × 1.5 × 2.7 | A low hexagonal drum with small openings, if the dome reads too much like a tower. It adds a fourth pack. |

The anvil goes beside it (see "Anvil and tools"). If none of these read right, the fallback is
simple shapes: a hemisphere, a cylinder chimney and an emissive arch.

### Paint vats (lower tier, slot r 1)

| # | Model | World size | Suggested scale | Why |
|---|---|---|---|---|
| 1 | fantasy-town-kit_2.0/fountain-round | 8.78 × 1.23 × 8.78 | xz ×0.25, y ×0.8 → 2.2 × 1.0 × 2.2 | A round stone basin. Its water is a separate untextured `Water` material, so each vat gets its own paint colour with one material override. Uses a core pack. |
| 2 | pirate-kit/barrel | 3.30 × 3.04 × 3.30 | ×0.5 → 1.65 × 1.52 × 1.65 | A wooden barrel, closest to the reference's wooden tubs. Float a paint-coloured disc just above the lid. |
| 3 | graveyard-kit_5.0/detail-bowl | 0.70 × 0.45 × 0.70 | ×3 → 2.1 × 1.35 × 2.1 | The best tub shape: a deep wooden bowl on a foot. Add a paint disc inside. It adds the graveyard pack. |
| 4 | survival-kit/barrel-open | 1.60 × 2.32 × 1.60 | ×0.7 | An open drum with a real interior for the paint, but it's a red metal oil drum and reads modern. |
| 5 | survival-kit/bucket | 0.97 × 1.30 × 0.97 | 1 | Small paint pails to cluster around the vats. |

### Easels (lower tier, slot r 0.9)

Nothing fits: no pack has an easel. Build it from simple shapes: three thin boxes as an A-frame
about 2.7 tall, a thin box canvas around 1.4 × 1.0, and a ledge. If you want a model as a starting
point:

| # | Model | World size | Suggested scale | Why |
|---|---|---|---|---|
| 1 | mini-forest_1.0/target | 1.99 × 2.10 × 1.71 | ×1.2 | The closest silhouette: a board on splayed wooden legs. The face is a red-and-white target, and the style is chibi. |
| 2 | castle-kit/flag-wide | 0.58 × 4.71 × 2.98 | ×0.6 → 0.35 × 2.8 × 1.8 | Cloth stretched between two poles reads as a canvas on a stand. The cloth is blue and needs recolouring. |
| 3 | survival-kit/tent-canvas-half | 3.79 × 3.32 × 3.79 | x ×0.35 | A ladder-like A-frame. Squashed, it could be the easel legs. |

### Drafting desk (middle tier, slot r 0.9)

There's no drafting desk model. Use a table with a tilted board: a thin box at about 30° plus a
paper plane.

| # | Model | World size | Suggested scale | Why |
|---|---|---|---|---|
| 1 | fantasy-town-kit_2.0/stall | 2.85 × 1.61 × 4.39 | ×0.7 on z | A plain wooden table, about 0.57 of a person tall. Same pack as the cottage. |
| 2 | survival-kit/workbench | 2.20 × 1.94 × 2.00 | 1 | A chunky wooden bench with a hammer on it. More workshop than studio, but it matches the forge. |
| 3 | graveyard-kit_5.0/altar-wood | 3.65 × 1.88 × 2.30 | ×0.7 | A heavy desk: stone top on a wooden base. It adds a pack. |
| 4 | fantasy-town-kit_2.0/stall-stool | 1.14 × 0.99 × 1.14 | 1 | The stool to go with #1 or #2. |

### Map table (middle tier, slot r 1)

No pack has a globe or a map, so add a sphere on a short cylinder and a flat map plane.

| # | Model | World size | Suggested scale | Why |
|---|---|---|---|---|
| 1 | fantasy-town-kit_2.0/stall | 2.85 × 1.61 × 4.39 | 1 | A plain wooden table, long enough for a spread map and a globe. |
| 2 | survival-kit/workbench | 2.20 × 1.94 × 2.00 | 1 | A compact, chunkier table. |
| 3 | fantasy-town-kit_2.0/stall-bench | 1.14 × 0.99 × 4.13 | 1 | A bench along one side. |
| 4 | pirate-kit/chest | 3.15 × 2.84 × 3.15 | ×0.5 → 1.58 × 1.42 × 1.58 | A map chest beside the table. |
| 5 | graveyard-kit_5.0/altar-stone | 3.63 × 1.70 × 2.28 | ×0.8 | A stone table, if it should look heavier. It adds a pack. |

### Arcade (middle tier, slot r 0.8): done

| # | Model | World size | Suggested scale | Why |
|---|---|---|---|---|
| 1 | mini-arcade/arcade-machine | 1.45 × 2.63 × 1.95 | 1 | Already placed. About a person tall. |
| 2 | mini-arcade/pinball | 1.81 × 2.69 × 2.72 | 1 | Alternative: a pinball table with a back screen. |
| 3 | mini-arcade/gambling-machine | 1.90 × 2.81 × 1.77 | 1 | Alternative: a rounded orange slot machine. |

### Waterwheel (lower tier, slot r 1)

| # | Model | World size | Suggested scale | Why |
|---|---|---|---|---|
| 1 | fantasy-town-kit_2.0/watermill | 3.73 × 7.90 × 7.90 | ×0.6 → 2.2 × 4.7 × 4.7 | A wooden paddle waterwheel. The pond is about 6.8 across, so the true-scale 7.9 diameter is too big. |
| 2 | fantasy-town-kit_2.0/watermill-wide | 4.61 × 7.90 × 7.90 | ×0.6 | The same wheel with wider paddles. |
| 3 | fantasy-town-kit_2.0/pillar-wood | 0.70 × 4.39 × 0.70 | ×0.6 | Two posts to carry the axle. |
| 4 | fantasy-town-kit_2.0/planks-half | 2.20 × 0.26 × 4.39 | 1 | A plank flume feeding the wheel. |

The wheel's origin is on its axle (bounds ±0.90 in pack units), with the axle along x. It can spin
about x in place, but it needs lifting by its radius: 3.95 world units at true scale, or 2.4 at ×0.6.

## Cottage

Assemble it from fantasy-town-kit_2.0 parts. No single model in the library is a cottage; the
nearest is a houseboat. The kit's own sample builds this house: a stone ground floor, a timber upper
floor and a teal gable roof with a chimney, which matches the reference.

The grid cell is 1 pack unit, which is 4.39 world units. Walls are 1 × 1 panels sitting on a cell's +x
edge (x 0.4 to 0.5), so rotate them about the cell centre for the other edges. The door is 3.29 world
units tall, about 1.2 people. If you scale the finished cottage below about ×0.85, the door becomes
shorter than a person.

Suggested size: 2 cells wide × 1 deep, which is a footprint of 8.8 × 4.4 world units, or about
9.7 × 4.7 with the roof overhang. It stands about 11.3 to the ridge, plus the chimney. With a single
storey it's about 6.9 tall. The upper tier is about 16 × 18, so this fits with room for a yard.

| Part | Qty | World size | Role |
|---|---:|---|---|
| wall-door | 1 | 0.44 × 4.39 × 4.39 | Front door, stone storey |
| wall-window-shutters | 1 | 0.77 × 4.39 × 4.39 | Front window, stone storey |
| wall-window-glass | 2 | 0.44 × 4.39 × 4.39 | Back windows, stone storey |
| wall | 2 | 0.44 × 4.39 × 4.39 | Gable-end walls, stone storey |
| wall-wood-window-shutters | 2 | 0.44 × 4.39 × 4.39 | Front, timber storey |
| wall-wood-detail-cross | 2 | 0.44 × 4.39 × 4.39 | Back, timber storey |
| wall-wood | 2 | 0.44 × 4.39 × 4.39 | Ends, timber storey |
| planks | 2 | 4.39 × 0.26 × 4.39 | Floor between storeys (optional; hidden) |
| roof-gable | 2 | 4.83 × 2.51 × 4.70 | Teal gable roof, one per cell |
| roof-gable-detail | 2 | 4.83 × 2.97 × 5.32 | Closes the gable ends with wooden trim |
| chimney-base | 1 | 1.51 × 4.39 × 2.28 | Stone chimney against an end wall |
| chimney, chimney-top | 1 each | 0.93 × 4.39 × 1.49, 1.11 × 2.75 × 1.49 | Stack above the roof (smoke source) |
| overhang | 1 | 1.25 × 1.45 × 4.39 | Optional beam over the door |

Variations:

- **Single storey:** drop the six timber walls.
- **Dormers as in the reference:** this needs the two-cell-deep roof set (`roof-left`, `roof-right`,
  `roof-window`, `roof-corner`), so a 3 × 2 footprint of 13.2 × 8.8. That's large for the upper tier.
- **Red roof:** the `roof-high-*` set.

I haven't test-assembled the roof. Check in a scratch scene whether `roof-gable-detail` or
`roof-gable-end` closes the gable triangle above the timber storey; `wall-wood-slope` is the infill if
neither does.

## Decor

Sizes are true scale. Where a scale is suggested, it's to match the reference proportions.

### Trees

The packs offer mostly conifers. The only broadleaf-ish tree is `tree-high-round`, a poplar shape; the
reference's round oak canopies have no match (platformer's boxy `tree` is the nearest and clashes).
Scale trees by ×0.4–0.6.

| Model | World size | Notes |
|---|---|---|
| fantasy-town-kit_2.0/tree-high-round | 4.47 × 12.08 × 4.47 | Rounded tree; the best broadleaf stand-in |
| fantasy-town-kit_2.0/tree | 4.49 × 10.60 × 4.49 | Pine |
| fantasy-town-kit_2.0/tree-crooked | 4.49 × 10.60 × 4.49 | Crooked pine, more character |
| fantasy-town-kit_2.0/tree-high | 4.49 × 13.06 × 4.49 | Tall pine for the back edge |
| survival-kit/tree-autumn | 3.74 × 9.53 × 3.56 | Orange autumn pine, a colour accent |
| survival-kit/tree | 3.74 × 9.53 × 3.56 | Pine, slightly different silhouette |
| castle-kit/tree-small | 4.02 × 7.34 × 3.92 | Layered pine (adds a pack) |
| survival-kit/tree-trunk | 1.35 × 1.76 × 1.35 | Stump |
| survival-kit/tree-log | 1.69 × 1.87 × 6.76 | Fallen log (×0.5) |

### Bushes

There are no round shrubs anywhere in the library. The leafy ground clumps below work as bushes;
hedges are the formal option.

| Model | World size | Notes |
|---|---|---|
| survival-kit/grass-large | 3.22 × 0.96 × 3.29 | Spiky dark-green leaf clump |
| survival-kit/grass | 1.58 × 0.96 × 1.74 | Smaller clump |
| pirate-kit/grass-plant | 2.75 × 1.28 × 3.06 | Leafy plant clump (×0.7) |
| pirate-kit/grass-patch | 3.24 × 1.16 × 3.14 | Spread of leafy ground plants (×0.7) |
| fantasy-town-kit_2.0/hedge | 1.10 × 1.10 × 4.39 | Low hedge on a stone kerb, for edging the cottage yard |
| fantasy-town-kit_2.0/hedge-curved | 4.39 × 1.10 × 4.39 | Curved hedge |
| mini-forest_1.0/plant | 1.44 × 0.69 × 1.56 | Broad three-leaf plant (chibi; small enough to pass) |

### Rocks

Prefer survival-kit's sandstone pieces: they're closest to the island's warm rock colour. The
lavender-grey rocks need tinting.

| Model | World size | Notes |
|---|---|---|
| survival-kit/resource-stone | 1.12 × 0.72 × 0.96 | Single rounded sandstone boulder |
| survival-kit/resource-stone-large | 2.54 × 1.08 × 2.28 | Pile of sandstone rocks |
| survival-kit/rock-sand-b | 5.40 × 3.03 × 5.33 | Low sandstone cluster (×0.5) |
| survival-kit/rock-sand-a | 3.75 × 2.65 × 3.27 | Sandstone spire with pebbles (×0.5) |
| survival-kit/rock-b | 5.64 × 2.83 × 4.90 | Dark grey cluster (×0.5) |
| fantasy-town-kit_2.0/rock-small | 4.38 × 4.48 × 5.83 | Craggy lavender rock (×0.4) |
| fantasy-town-kit_2.0/rock-wide | 4.80 × 4.48 × 6.88 | Wide craggy cluster (×0.4) |
| pirate-kit/rocks-c | 9.00 × 5.68 × 9.07 | Dark rock cluster for the cliff edges (×0.3) |

### Flowers

Only platformer-kit has flowers. Its flowers are chunky but small enough to blend at diorama zoom;
otherwise, build them from simple shapes.

| Model | World size | Notes |
|---|---|---|
| platformer-kit/flowers-tall | 1.68 × 1.42 × 1.91 | Red flowers on stems (×0.6) |
| platformer-kit/flowers | 2.40 × 0.42 × 2.42 | Three small blue flowers (×0.6) |
| platformer-kit/mushrooms | 1.61 × 0.89 × 1.58 | Red mushrooms (×0.5) |
| platformer-kit/plant | 1.58 × 0.53 × 1.37 | Small sprout |
| platformer-kit/grass | 1.60 × 0.97 × 1.68 | Chunky grass tuft |
| graveyard-kit_5.0/pumpkin | 1.32 × 1.12 × 1.32 | Pumpkins for a garden patch by the cottage (×0.6) |

### Fences

| Model | World size | Notes |
|---|---|---|
| fantasy-town-kit_2.0/fence | 0.33 × 1.67 × 4.39 | Post-and-rail, about 1 m tall. The default |
| fantasy-town-kit_2.0/fence-curved | 4.39 × 1.67 × 4.39 | Curved run |
| fantasy-town-kit_2.0/fence-gate | 0.33 × 1.67 × 4.39 | Arched gate |
| fantasy-town-kit_2.0/fence-broken | 1.12 × 1.67 × 4.39 | Broken run, for edges and wear |
| survival-kit/fence | 3.38 × 3.50 × 0.29 | Three-rail fence (×0.5) |
| survival-kit/fence-fortified | 3.38 × 3.50 × 0.36 | Stake palisade behind the forge (×0.6) |
| graveyard-kit_5.0/fence | 3.49 × 2.16 × 0.64 | Picket-board fence (adds a pack) |

### Paths and stepping stones

| Model | World size | Notes |
|---|---|---|
| fantasy-town-kit_2.0/road | 4.39 × 0.11 × 4.39 | Flat paving tile for the forge floor |
| fantasy-town-kit_2.0/road-edge | 4.39 × 0.22 × 4.39 | Paving with a stepped edge |
| fantasy-town-kit_2.0/road-corner | 4.39 × 0.22 × 4.39 | Kerbed corner |
| fantasy-town-kit_2.0/planks-half | 2.20 × 0.26 × 4.39 | Plank boardwalk strip |
| survival-kit/floor | 3.38 × 0.35 × 3.38 | Plank decking tile |
| survival-kit/rock-flat | 12.07 × 1.32 × 9.78 | Flat sandstone slab; at ×0.2 (2.4 × 0.26 × 2.0) it's one stepping stone, in a warm colour |
| graveyard-kit_5.0/road | 2.78 × 0.27 × 2.75 | Cluster of paving stones; a ready-made stepping path |
| platformer-kit/stones | 2.19 × 0.15 × 2.44 | Scattered flat dark stepping stones |

### Barrels

| Model | World size | Notes |
|---|---|---|
| pirate-kit/barrel | 3.30 × 3.04 × 3.30 | Wooden barrel. Use ×0.5 → 1.65 × 1.52 |
| platformer-kit/barrel | 1.60 × 1.47 × 1.60 | The same mesh, already at a sensible size |
| survival-kit/barrel | 1.60 × 2.32 × 1.60 | Red metal drum. Reads modern, so use sparingly |
| survival-kit/barrel-open | 1.60 × 2.32 × 1.60 | Open drum |
| survival-kit/bucket | 0.97 × 1.30 × 0.97 | Metal bucket |

### Crates

| Model | World size | Notes |
|---|---|---|
| pirate-kit/crate | 2.66 × 1.90 × 3.23 | Open wooden crate (×0.6) |
| pirate-kit/crate-bottles | 2.66 × 2.61 × 3.23 | Crate of green bottles (×0.6) |
| survival-kit/chest | 1.76 × 1.74 × 1.84 | Wooden chest with a lock |
| pirate-kit/chest | 3.15 × 2.84 × 3.15 | Banded treasure chest (×0.5) |
| platformer-kit/crate | 1.54 × 1.54 × 1.54 | Closed, braced wooden crate |
| survival-kit/resource-planks | 2.52 × 0.63 × 4.23 | Stack of loose planks by the workshop |
| pirate-kit/bottle-large | 1.15 × 2.20 × 1.15 | Clay jug (×0.5) |

### Lamps

| Model | World size | Notes |
|---|---|---|
| fantasy-town-kit_2.0/lantern | 0.95 × 6.83 × 0.99 | Slim iron lamp post (×0.6 → 4.1 tall). Core pack |
| graveyard-kit_5.0/lightpost-single | 0.73 × 4.42 × 1.62 | Iron post with a hanging lantern |
| graveyard-kit_5.0/lightpost-double | 0.73 × 4.42 × 2.53 | Two lanterns |
| graveyard-kit_5.0/lantern-candle | 0.84 × 1.35 × 0.84 | Standing lantern with a candle, for doorsteps and tables |
| graveyard-kit_5.0/lantern-glass | 0.84 × 1.35 × 0.84 | Lantern with orange glass |
| graveyard-kit_5.0/candle-multiple | 0.89 × 0.70 × 0.93 | Candle cluster for the desk |
| survival-kit/campfire-pit | 1.88 × 0.74 × 1.82 | Warm light source in the yard |

### Anvil and tools

There's no standalone anvil; `workbench-anvil` is an anvil on its stand.

| Model | World size | Notes |
|---|---|---|
| survival-kit/workbench-anvil | 2.18 × 2.27 × 2.00 | Iron anvil on a wooden stand. The anvil |
| survival-kit/workbench-grind | 1.76 × 1.90 × 2.22 | Grindstone on a trestle |
| survival-kit/tool-hammer | 0.61 × 1.04 × 0.27 | Sledgehammer |
| survival-kit/tool-hammer-upgraded | 0.78 × 1.25 × 0.35 | Bigger square-headed hammer |
| survival-kit/tool-axe | 0.77 × 1.73 × 0.21 | Axe |
| survival-kit/tool-pickaxe | 1.21 × 1.62 × 0.26 | Pickaxe |
| survival-kit/tool-shovel | 0.48 × 1.96 × 0.21 | Shovel |
| mini-arena/weapon-rack | 2.61 × 1.69 × 1.09 | Rack that could hang tools. Chibi; only if nothing else serves |
| factory-kit_3.0/cog-a | 2.06 × 0.46 × 2.06 | Cog to lean against a wall (×0.5). Sci-fi pack, so use one at most |

### Workbenches

| Model | World size | Notes |
|---|---|---|
| survival-kit/workbench | 2.20 × 1.94 × 2.00 | Solid wooden bench with a hammer |
| survival-kit/workbench-anvil | 2.18 × 2.27 × 2.00 | (see above) |
| survival-kit/workbench-grind | 1.76 × 1.90 × 2.22 | (see above) |
| fantasy-town-kit_2.0/stall | 2.85 × 1.61 × 4.39 | Long plain table, for the workshop's long benches |
| fantasy-town-kit_2.0/stall-bench | 1.14 × 0.99 × 4.13 | Bench seat |
| fantasy-town-kit_2.0/stall-stool | 1.14 × 0.99 × 1.14 | Stool |
| survival-kit/structure-roof | 3.62 × 4.44 × 3.73 | Post frame with a slatted roof: an open workshop shelter |
| graveyard-kit_5.0/altar-wood | 3.65 × 1.88 × 2.30 | Heavy bench (adds a pack) |

### Pond details

- **Lily pads:** none in any pack. Build them from flat green discs with a wedge cut out.
- **Reeds:** there are no true reeds. Leafy clumps stand in; for cattails, use thin cylinders with
  brown capsule tips.

| Model | World size | Notes |
|---|---|---|
| pirate-kit/structure-platform-dock-small | 4.70 × 3.24 × 6.21 | Small dock with mooring posts. Use ×0.6 → 2.8 × 1.9 × 3.7 |
| pirate-kit/structure-platform-small | 4.70 × 2.22 × 6.21 | Plain plank deck (×0.6) |
| pirate-kit/boat-row-small | 6.79 × 2.09 × 5.86 | Rowing boat with oars, tied at the dock (×0.6) |
| survival-kit/grass | 1.58 × 0.96 × 1.74 | Spiky leaf clump as reeds at the water's edge |
| platformer-kit/grass | 1.60 × 0.97 × 1.68 | Upright chunky blades: the most reed-like |
| fantasy-town-kit_2.0/fountain-edge | 4.39 × 1.23 × 4.39 | Stone rim with water, for a built pond edge by the waterwheel |
| survival-kit/resource-stone | 1.12 × 0.72 × 0.96 | Half-sunk stones in the shallows |

### Signs

| Model | World size | Notes |
|---|---|---|
| survival-kit/signpost | 1.45 × 3.11 × 0.29 | Post with two arrow boards, at the stairs |
| survival-kit/signpost-single | 1.41 × 3.11 × 0.29 | Post with one arrow |
| platformer-kit/sign | 1.49 × 1.85 × 0.41 | Plain board on a post, for station names |
| fantasy-town-kit_2.0/banner-green | 0.22 × 3.69 × 2.20 | Hanging teal banner for the cottage or forge wall |
| fantasy-town-kit_2.0/banner-red | 0.22 × 3.69 × 2.20 | Red banner |
| castle-kit/flag-pennant | 0.58 × 4.71 × 3.12 | Pennant on a pole for the island's high point (adds a pack) |
