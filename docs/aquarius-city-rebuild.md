# Aquarius City Environment Rebuild

## Step 1: Current Issues

- The previous environment read as a moon base because a large circular ground plane remained visible behind scattered landmarks.
- Buildings and artifacts were separated by wide empty gaps, with weak street relationships.
- NPCs stood near landmarks, but many did not have enough surrounding life-scene context.
- Roads were mostly guide lines and did not form a city network with intersections, bridges, alleys, and district entrances.
- Water existed as isolated pools or effects instead of a connected Aquarius city water system.

## Step 2: New City Layout

- Center: `Aquarius Plaza`, player spawn and city landmark, with ring plaza, water glyph, fountains, benches, terminals, and four-plus main roads.
- North: `Future Observatory`, highest skyline with towers, observatory forms, and high platforms.
- Northwest: `Innovation Workshop`, denser workshop blocks, solar roofs, track/tech assets, fences, energy boxes.
- Northeast: `Cosmic Research`, cleaner science campus with domes, data towers, crystal/research props.
- Southwest: `Rebel Art Quarter`, irregular art walls, stage, graffiti-like light marks, alleys.
- Southeast: `Humanity Garden`, community domes, trees, planters, benches, pond-line water.
- South: `Canal Harbor`, boardwalk, docks, boats, buoys, floating water edge and traveler gate.

## Asset Organization

The first imported Kenney assets are organized under:

- `public/assets/buildings`
- `public/assets/landmarks`
- `public/assets/roads`
- `public/assets/bridges`
- `public/assets/water`
- `public/assets/props`
- `public/assets/vegetation`
- `public/assets/technology`
- `public/assets/npc-environments`
- `public/assets/decorations`

City placement data now lives in `app/city/city-layout.ts` instead of being scattered across the main component.

## First-Stage Implementation

- Replaced the dominant moon-base feel with connected city platforms.
- Added data-driven roads, branch roads, alleys, canals, and bridges.
- Added height differences through platform elevation and taller north/central buildings.
- Repositioned NPCs and humans into district contexts.
- Added actual Kenney GLB assets from the provided packs into the city layout.
- Used instancing for repeated street lamps.

## Still To Improve

- More complete replacement of procedural buildings with optimized imported models.
- More district-specific props after visual QA.
- Mobile-level density tuning after browser performance checks.
