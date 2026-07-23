export type DistrictId =
  | "plaza"
  | "observatory"
  | "innovation"
  | "research"
  | "art"
  | "garden"
  | "harbor";

export type CityCategory =
  | "landmark"
  | "building-large"
  | "building-medium"
  | "building-small"
  | "street-prop"
  | "vegetation"
  | "water-prop"
  | "technology"
  | "decoration"
  | "npc-environment"
  | "bridge"
  | "road"
  | "platform";

export type CityPlatformSpec = {
  id: string;
  district: DistrictId;
  position: [number, number];
  size: [number, number];
  elevation: number;
  color: string;
  accent: string;
  rotation?: number;
};

export type CityRoadSpec = {
  id: string;
  district: DistrictId;
  from: [number, number];
  to: [number, number];
  width: number;
  elevation: number;
  kind: "main" | "secondary" | "alley";
  accent: string;
};

export type CityCanalSpec = {
  id: string;
  from: [number, number];
  to: [number, number];
  width: number;
  elevation: number;
  accent: string;
};

export type CityBridgeSpec = {
  id: string;
  from: [number, number];
  to: [number, number];
  width: number;
  elevation: number;
  accent: string;
};

export type CityBuildingKind =
  | "tower"
  | "dome"
  | "coral"
  | "solar"
  | "greenhouse"
  | "observatory"
  | "capsule"
  | "harbor"
  | "workshop"
  | "art";

export type CityBuildingSpec = {
  id: string;
  district: DistrictId;
  position: [number, number];
  size: [number, number];
  height: number;
  elevation: number;
  color: string;
  accent: string;
  kind: CityBuildingKind;
  rotation?: number;
  collisionRadius: number;
  category: CityCategory;
};

export type CityPropSpec = {
  id: string;
  district: DistrictId;
  position: [number, number];
  elevation: number;
  rotation?: number;
  accent: string;
  kind: "lamp" | "bench" | "planter" | "sign" | "energy" | "sculpture" | "fountain" | "terminal";
  category: CityCategory;
};

export type AssetCatalogItem = {
  source: string;
  category: CityCategory;
  examples: string[];
  plannedUse: string;
  status: "in-project" | "available-download" | "procedural";
};

export type CityModelAssetSpec = {
  id: string;
  asset: string;
  district: DistrictId;
  category: CityCategory;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  targetHeight?: number;
  collision: boolean;
  motion?: "idle" | "wander" | "float" | "spin";
  motionRadius?: number;
  motionSpeed?: number;
  motionAction?: "idle" | "walk" | "run";
};

export const AQUARIUS_CASCADE_INSTALLATION_ID = "aquarius-cascade-installation";
export const AQUARIUS_CASCADE_INSTALLATION_ASSET =
  "/assets/landmarks/aquarius-pour/Meshy_AI_Aquarius_Pour_0722135912_texture.obj";

export const CITY_PLATFORMS: CityPlatformSpec[] = [
  { id: "downtown-superblock", district: "plaza", position: [0, 0], size: [30, 25], elevation: 0.18, color: "#8fd6ea", accent: "#d8b4fe" },
  { id: "north-science-block", district: "observatory", position: [0, -16], size: [24, 9], elevation: 0.32, color: "#a9c8f4", accent: "#7dd3fc" },
  { id: "west-maker-block", district: "innovation", position: [-17, -4], size: [8, 17], elevation: 0.24, color: "#8fb7ff", accent: "#f6d365" },
  { id: "east-residence-block", district: "garden", position: [17, 4], size: [8, 17], elevation: 0.22, color: "#9ee6d3", accent: "#5eead4" },
  { id: "south-civic-park", district: "harbor", position: [0, 17], size: [24, 8], elevation: 0.14, color: "#7ecfe6", accent: "#7dd3fc" },
];

export const CITY_ROADS: CityRoadSpec[] = [
  { id: "main-north-south", district: "plaza", from: [0, -22], to: [0, 22], width: 2.2, elevation: 0.32, kind: "main", accent: "#7dd3fc" },
  { id: "main-east-west", district: "plaza", from: [-22, 0], to: [22, 0], width: 2.2, elevation: 0.32, kind: "main", accent: "#d8b4fe" },
  { id: "west-service-street", district: "innovation", from: [-10, -18], to: [-10, 17], width: 1.35, elevation: 0.33, kind: "secondary", accent: "#f6d365" },
  { id: "east-residence-street", district: "garden", from: [10, -17], to: [10, 17], width: 1.35, elevation: 0.33, kind: "secondary", accent: "#5eead4" },
  { id: "north-market-street", district: "observatory", from: [-18, -9], to: [18, -9], width: 1.4, elevation: 0.34, kind: "secondary", accent: "#7dd3fc" },
  { id: "south-park-street", district: "harbor", from: [-18, 10], to: [18, 10], width: 1.4, elevation: 0.3, kind: "secondary", accent: "#5eead4" },
  { id: "north-west-alley", district: "art", from: [-18, -16], to: [-3, -16], width: 0.82, elevation: 0.42, kind: "alley", accent: "#fb7185" },
  { id: "north-east-alley", district: "research", from: [3, -16], to: [18, -16], width: 0.82, elevation: 0.42, kind: "alley", accent: "#c4b5fd" },
  { id: "south-west-alley", district: "innovation", from: [-18, 16], to: [-3, 16], width: 0.82, elevation: 0.25, kind: "alley", accent: "#f6d365" },
  { id: "south-east-alley", district: "garden", from: [3, 16], to: [18, 16], width: 0.82, elevation: 0.25, kind: "alley", accent: "#5eead4" },
];

export const CITY_CANALS: CityCanalSpec[] = [
  { id: "civic-waterway", from: [-7.2, -20], to: [-7.2, 20], width: 0.78, elevation: 0.34, accent: "#55e0ff" },
  { id: "park-waterway", from: [-7.2, 13.4], to: [7.2, 13.4], width: 0.7, elevation: 0.28, accent: "#5eead4" },
];

export const CITY_BRIDGES: CityBridgeSpec[] = [
  { id: "canal-main-crossing", from: [-8.6, 0], to: [-5.8, 0], width: 1.6, elevation: 0.48, accent: "#f7d9ff" },
  { id: "canal-market-crossing", from: [-8.6, -9], to: [-5.8, -9], width: 1.15, elevation: 0.48, accent: "#7dd3fc" },
  { id: "canal-park-crossing", from: [-8.6, 10], to: [-5.8, 10], width: 1.15, elevation: 0.42, accent: "#5eead4" },
  { id: "park-water-bridge", from: [-0.8, 13.4], to: [0.8, 13.4], width: 1.2, elevation: 0.4, accent: "#d8b4fe" },
];

export const CITY_BUILDINGS: CityBuildingSpec[] = [
  { id: "city-hall-west", district: "plaza", position: [-4.5, -3.8], size: [2.8, 2.1], height: 2.4, elevation: 0.34, color: "#c4b5fd", accent: "#5eead4", kind: "capsule", rotation: 0.02, collisionRadius: 1.22, category: "building-small" },
  { id: "city-hall-east", district: "plaza", position: [4.5, -3.8], size: [2.8, 2.1], height: 2.4, elevation: 0.34, color: "#7dd3fc", accent: "#f7d9ff", kind: "dome", rotation: -0.02, collisionRadius: 1.22, category: "building-small" },
  { id: "north-observatory", district: "observatory", position: [0, -18.2], size: [3.5, 3.1], height: 6.6, elevation: 0.52, color: "#4059c7", accent: "#b7f7ff", kind: "observatory", collisionRadius: 1.85, category: "landmark" },
  { id: "north-lab-west", district: "observatory", position: [-5.2, -14.5], size: [2.6, 2.2], height: 3.2, elevation: 0.5, color: "#78b9ff", accent: "#7dd3fc", kind: "tower", collisionRadius: 1.2, category: "building-medium" },
  { id: "north-lab-east", district: "research", position: [5.2, -14.5], size: [2.6, 2.2], height: 3.0, elevation: 0.5, color: "#a7f3d0", accent: "#c4b5fd", kind: "dome", collisionRadius: 1.2, category: "building-medium" },
  { id: "maker-hall", district: "innovation", position: [-15.7, -8.7], size: [3.3, 2.7], height: 3.5, elevation: 0.42, color: "#37408d", accent: "#f6d365", kind: "workshop", collisionRadius: 1.65, category: "building-large" },
  { id: "maker-garage", district: "innovation", position: [-15.7, 4.8], size: [3.1, 2.4], height: 2.3, elevation: 0.38, color: "#f59e5f", accent: "#7dd3fc", kind: "solar", collisionRadius: 1.45, category: "building-medium" },
  { id: "art-studio-row", district: "art", position: [-4.9, 7.4], size: [2.8, 2.0], height: 2.6, elevation: 0.34, color: "#fb7185", accent: "#f6d365", kind: "art", collisionRadius: 1.25, category: "building-medium" },
  { id: "archive-market-row", district: "art", position: [4.9, 7.4], size: [2.8, 2.0], height: 2.6, elevation: 0.34, color: "#ff9eb5", accent: "#7dd3fc", kind: "capsule", collisionRadius: 1.25, category: "building-medium" },
  { id: "east-garden-hall", district: "garden", position: [15.8, 8.0], size: [3.2, 2.4], height: 2.5, elevation: 0.38, color: "#5eead4", accent: "#f7d9ff", kind: "dome", collisionRadius: 1.45, category: "landmark" },
  { id: "east-habitat-row", district: "garden", position: [15.8, -4.8], size: [3.0, 2.2], height: 2.3, elevation: 0.38, color: "#f7d9ff", accent: "#5eead4", kind: "capsule", collisionRadius: 1.35, category: "building-medium" },
  { id: "south-station", district: "harbor", position: [0, 17.0], size: [3.4, 2.4], height: 2.4, elevation: 0.32, color: "#5db7f0", accent: "#7dd3fc", kind: "harbor", collisionRadius: 1.55, category: "landmark" },
  { id: "south-market-west", district: "harbor", position: [-5.5, 16.8], size: [2.5, 1.9], height: 1.9, elevation: 0.3, color: "#f6d365", accent: "#fb7185", kind: "harbor", collisionRadius: 1.1, category: "building-small" },
  { id: "south-market-east", district: "harbor", position: [5.5, 16.8], size: [2.5, 1.9], height: 1.9, elevation: 0.3, color: "#c4b5fd", accent: "#5eead4", kind: "harbor", collisionRadius: 1.1, category: "building-small" },
];

export const CITY_PROPS: CityPropSpec[] = [
  { id: "plaza-terminal", district: "plaza", position: [3.6, -1.6], elevation: 0.38, accent: "#f7d9ff", kind: "terminal", category: "street-prop" },
  { id: "plaza-bench-west", district: "plaza", position: [-3.4, 2.1], elevation: 0.36, rotation: 0.28, accent: "#c4b5fd", kind: "bench", category: "street-prop" },
  { id: "plaza-bench-east", district: "plaza", position: [3.4, 2.1], elevation: 0.36, rotation: -0.28, accent: "#7dd3fc", kind: "bench", category: "street-prop" },
  { id: "maker-sign", district: "innovation", position: [-12.6, -8.8], elevation: 0.44, rotation: -0.2, accent: "#f6d365", kind: "sign", category: "npc-environment" },
  { id: "science-terminal", district: "research", position: [7.5, -11.2], elevation: 0.48, rotation: 0.4, accent: "#7dd3fc", kind: "terminal", category: "technology" },
  { id: "garden-planter", district: "garden", position: [12.4, 8.6], elevation: 0.38, accent: "#5eead4", kind: "planter", category: "vegetation" },
  { id: "station-light", district: "harbor", position: [2.8, 15.4], elevation: 0.34, accent: "#7dd3fc", kind: "lamp", category: "street-prop" },
];

export const CITY_MODEL_ASSETS: CityModelAssetSpec[] = [
  {
    id: "suburban-plaza-building-a",
    asset: "/assets/buildings/building-type-a.glb",
    district: "plaza",
    category: "building-small",
    position: [-4.5, 0.42, -1.9],
    rotation: [0, 0.28, 0],
    scale: [0.72, 0.72, 0.72],
    collision: true,
  },
  {
    id: "suburban-plaza-building-d",
    asset: "/assets/buildings/building-type-d.glb",
    district: "plaza",
    category: "building-small",
    position: [4.5, 0.42, -2.2],
    rotation: [0, -0.3, 0],
    scale: [0.72, 0.72, 0.72],
    collision: true,
  },
  {
    id: "observatory-kenney-tower",
    asset: "/assets/landmarks/tower.glb",
    district: "observatory",
    category: "landmark",
    position: [-2.4, 1.1, -18.7],
    rotation: [0, 0.2, 0],
    scale: [0.95, 1.3, 0.95],
    collision: true,
  },
  {
    id: "observatory-overhang-platform",
    asset: "/assets/landmarks/overhang-round.glb",
    district: "observatory",
    category: "landmark",
    position: [2.6, 1.02, -17.8],
    rotation: [0, -0.35, 0],
    scale: [0.9, 0.9, 0.9],
    collision: true,
  },
  {
    id: "innovation-building-h",
    asset: "/assets/buildings/building-type-h.glb",
    district: "innovation",
    category: "building-medium",
    position: [-16.6, 0.62, -8.3],
    rotation: [0, -0.55, 0],
    scale: [0.82, 0.82, 0.82],
    collision: true,
  },
  {
    id: "innovation-building-k",
    asset: "/assets/buildings/building-type-k.glb",
    district: "innovation",
    category: "building-medium",
    position: [-12.4, 0.62, -10.6],
    rotation: [0, 0.35, 0],
    scale: [0.78, 0.78, 0.78],
    collision: true,
  },
  {
    id: "innovation-track-straight",
    asset: "/assets/technology/track-detailed.glb",
    district: "innovation",
    category: "technology",
    position: [-15.2, 0.56, -6.2],
    rotation: [0, 0.35, 0],
    scale: [0.9, 0.9, 0.9],
    collision: false,
  },
  {
    id: "innovation-fence-low",
    asset: "/assets/props/fence-low.glb",
    district: "innovation",
    category: "street-prop",
    position: [-18.5, 0.55, -8.4],
    rotation: [0, 1.1, 0],
    scale: [0.85, 0.85, 0.85],
    collision: false,
  },
  {
    id: "research-building-u",
    asset: "/assets/buildings/building-type-u.glb",
    district: "research",
    category: "building-medium",
    position: [12.1, 0.68, -10.3],
    rotation: [0, -0.2, 0],
    scale: [0.78, 0.78, 0.78],
    collision: true,
  },
  {
    id: "research-track-curve",
    asset: "/assets/technology/railroad-rail-curve.glb",
    district: "research",
    category: "technology",
    position: [16.7, 0.62, -6.6],
    rotation: [0, 0.55, 0],
    scale: [0.82, 0.82, 0.82],
    collision: false,
  },
  {
    id: "art-stage-stairs",
    asset: "/assets/bridges/stairs-stone.glb",
    district: "art",
    category: "decoration",
    position: [-18.0, 0.42, 6.2],
    rotation: [0, 0.3, 0],
    scale: [0.9, 0.9, 0.9],
    collision: false,
  },
  {
    id: "art-crate-bag",
    asset: "/assets/decorations/bag.glb",
    district: "art",
    category: "decoration",
    position: [-11.1, 0.46, 8.7],
    rotation: [0, -0.4, 0],
    scale: [0.75, 0.75, 0.75],
    collision: false,
  },
  {
    id: "garden-tree-large-a",
    asset: "/assets/vegetation/tree-large.glb",
    district: "garden",
    category: "vegetation",
    position: [16.7, 0.48, 9.7],
    rotation: [0, 0.2, 0],
    scale: [0.9, 0.9, 0.9],
    collision: false,
  },
  {
    id: "garden-tree-small-a",
    asset: "/assets/vegetation/tree-small.glb",
    district: "garden",
    category: "vegetation",
    position: [11.5, 0.48, 8.5],
    rotation: [0, -0.5, 0],
    scale: [0.9, 0.9, 0.9],
    collision: false,
  },
  {
    id: "garden-planter-model",
    asset: "/assets/props/planter.glb",
    district: "garden",
    category: "vegetation",
    position: [14.2, 0.5, 11.2],
    rotation: [0, 0.15, 0],
    scale: [0.92, 0.92, 0.92],
    collision: false,
  },
  {
    id: "harbor-dock-side-west",
    asset: "/assets/bridges/dock-side.glb",
    district: "harbor",
    category: "bridge",
    position: [-7.8, 0.24, 18.6],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    collision: false,
  },
  {
    id: "harbor-dock-side-east",
    asset: "/assets/bridges/dock-side.glb",
    district: "harbor",
    category: "bridge",
    position: [7.8, 0.24, 18.4],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    collision: false,
  },
  {
    id: "harbor-boat-house-model",
    asset: "/assets/water/boat-house-a.glb",
    district: "harbor",
    category: "water-prop",
    position: [-5.4, 0.38, 20.1],
    rotation: [0, 0.25, 0],
    scale: [0.8, 0.8, 0.8],
    collision: false,
  },
  {
    id: "harbor-energy-boat",
    asset: "/assets/water/boat-speed-a.glb",
    district: "harbor",
    category: "water-prop",
    position: [5.7, 0.38, 20.0],
    rotation: [0, -0.5, 0],
    scale: [0.82, 0.82, 0.82],
    collision: false,
  },
  {
    id: "harbor-buoy-model",
    asset: "/assets/water/buoy.glb",
    district: "harbor",
    category: "water-prop",
    position: [0.0, 0.36, 20.4],
    rotation: [0, 0, 0],
    scale: [0.9, 0.9, 0.9],
    collision: false,
  },
  {
    id: "pet-cow-reference",
    asset: "/assets/npc-environments/animal-cow.glb",
    district: "harbor",
    category: "npc-environment",
    position: [3.8, 0.5, 15.2],
    rotation: [0, -0.4, 0],
    scale: [0.65, 0.65, 0.65],
    collision: false,
  },
  {
    id: "pet-dog-reference",
    asset: "/assets/npc-environments/animal-dog.glb",
    district: "plaza",
    category: "npc-environment",
    position: [2.2, 0.5, 2.7],
    rotation: [0, 0.4, 0],
    scale: [0.62, 0.62, 0.62],
    collision: false,
  },
  {
    id: "medieval-art-house-door",
    asset: "/assets/medieval-village/Wall_UnevenBrick_Door_Round.gltf",
    district: "art",
    category: "building-medium",
    position: [-15.2, 0.64, 10.7],
    rotation: [0, 0.28, 0],
    scale: [0.56, 0.56, 0.56],
    collision: true,
  },
  {
    id: "medieval-art-house-roof",
    asset: "/assets/medieval-village/Roof_RoundTiles_4x4.gltf",
    district: "art",
    category: "building-medium",
    position: [-15.2, 2.05, 10.7],
    rotation: [0, 0.28, 0],
    scale: [0.58, 0.58, 0.58],
    collision: false,
  },
  {
    id: "medieval-art-house-chimney",
    asset: "/assets/medieval-village/Prop_Chimney.gltf",
    district: "art",
    category: "decoration",
    position: [-14.5, 2.55, 10.1],
    rotation: [0, 0.28, 0],
    scale: [0.42, 0.42, 0.42],
    collision: false,
  },
  {
    id: "medieval-garden-window-house",
    asset: "/assets/medieval-village/Wall_Plaster_Window_Wide_Round.gltf",
    district: "garden",
    category: "building-medium",
    position: [16.9, 0.64, 8.4],
    rotation: [0, -0.42, 0],
    scale: [0.56, 0.56, 0.56],
    collision: true,
  },
  {
    id: "medieval-garden-round-roof",
    asset: "/assets/medieval-village/Roof_RoundTiles_6x6.gltf",
    district: "garden",
    category: "building-medium",
    position: [16.9, 2.06, 8.4],
    rotation: [0, -0.42, 0],
    scale: [0.54, 0.54, 0.54],
    collision: false,
  },
  {
    id: "medieval-garden-vine",
    asset: "/assets/medieval-village/Prop_Vine1.gltf",
    district: "garden",
    category: "vegetation",
    position: [16.4, 1.1, 7.9],
    rotation: [0, -0.42, 0],
    scale: [0.6, 0.6, 0.6],
    collision: false,
    motion: "float",
    motionRadius: 0.1,
    motionSpeed: 0.28,
  },
  {
    id: "medieval-harbor-door-house",
    asset: "/assets/medieval-village/Wall_Plaster_Door_Round.gltf",
    district: "harbor",
    category: "building-small",
    position: [-3.4, 0.42, 18.7],
    rotation: [0, 0.05, 0],
    scale: [0.52, 0.52, 0.52],
    collision: true,
  },
  {
    id: "medieval-harbor-wood-roof",
    asset: "/assets/medieval-village/Roof_Wooden_2x1.gltf",
    district: "harbor",
    category: "building-small",
    position: [-3.4, 1.7, 18.7],
    rotation: [0, 0.05, 0],
    scale: [0.58, 0.58, 0.58],
    collision: false,
  },
  {
    id: "medieval-plaza-corner-brick",
    asset: "/assets/medieval-village/Corner_Exterior_Brick.gltf",
    district: "plaza",
    category: "building-small",
    position: [-7.0, 0.42, 2.8],
    rotation: [0, 0.72, 0],
    scale: [0.5, 0.5, 0.5],
    collision: true,
  },
  {
    id: "medieval-plaza-corner-wood",
    asset: "/assets/medieval-village/Corner_Exterior_Wood.gltf",
    district: "plaza",
    category: "building-small",
    position: [7.0, 0.42, 2.6],
    rotation: [0, -0.72, 0],
    scale: [0.5, 0.5, 0.5],
    collision: true,
  },
  {
    id: "medieval-observatory-tower-roof",
    asset: "/assets/medieval-village/Roof_Tower_RoundTiles.gltf",
    district: "observatory",
    category: "landmark",
    position: [0.2, 3.92, -18.2],
    rotation: [0, 0.12, 0],
    scale: [0.48, 0.48, 0.48],
    collision: false,
  },
  {
    id: "medieval-innovation-stairs",
    asset: "/assets/medieval-village/Stairs_Exterior_Straight.gltf",
    district: "innovation",
    category: "bridge",
    position: [-11.6, 0.48, -8.4],
    rotation: [0, -0.78, 0],
    scale: [0.5, 0.5, 0.5],
    collision: false,
  },
  {
    id: "medieval-innovation-wagon",
    asset: "/assets/medieval-village/Prop_Wagon.gltf",
    district: "innovation",
    category: "street-prop",
    position: [-17.2, 0.56, -11.2],
    rotation: [0, 0.72, 0],
    scale: [0.56, 0.56, 0.56],
    collision: true,
  },
  {
    id: "medieval-market-crate-a",
    asset: "/assets/medieval-village/Prop_Crate.gltf",
    district: "harbor",
    category: "street-prop",
    position: [3.5, 0.28, 18.1],
    rotation: [0, 0.2, 0],
    scale: [0.52, 0.52, 0.52],
    collision: false,
  },
  {
    id: "medieval-art-fence",
    asset: "/assets/medieval-village/Prop_MetalFence_Simple.gltf",
    district: "art",
    category: "street-prop",
    position: [-18.2, 0.34, 9.8],
    rotation: [0, 1.35, 0],
    scale: [0.52, 0.52, 0.52],
    collision: false,
  },
  {
    id: "cube-plaza-chest-open",
    asset: "/assets/cube-world/environment/Chest_Open.gltf",
    district: "plaza",
    category: "street-prop",
    position: [1.4, 0.42, 3.2],
    rotation: [0, -0.28, 0],
    scale: [0.82, 0.82, 0.82],
    collision: false,
    motion: "idle",
  },
  {
    id: "cube-research-crystal-big",
    asset: "/assets/cube-world/environment/Crystal_Big.gltf",
    district: "research",
    category: "technology",
    position: [16.8, 0.66, -10.8],
    rotation: [0, 0.28, 0],
    scale: [0.72, 0.72, 0.72],
    collision: false,
    motion: "spin",
    motionSpeed: 0.42,
  },
  {
    id: "cube-research-crystal-small",
    asset: "/assets/cube-world/environment/Crystal_Small.gltf",
    district: "research",
    category: "technology",
    position: [12.0, 0.62, -5.4],
    rotation: [0, -0.1, 0],
    scale: [0.82, 0.82, 0.82],
    collision: false,
    motion: "float",
    motionSpeed: 0.5,
  },
  {
    id: "cube-garden-tree",
    asset: "/assets/cube-world/environment/Tree_2.gltf",
    district: "garden",
    category: "vegetation",
    position: [11.0, 0.46, 10.6],
    rotation: [0, -0.18, 0],
    scale: [0.7, 0.7, 0.7],
    collision: false,
    motion: "idle",
  },
  {
    id: "cube-art-mushroom",
    asset: "/assets/cube-world/environment/Mushroom.gltf",
    district: "art",
    category: "decoration",
    position: [-12.4, 0.36, 6.7],
    rotation: [0, 0.1, 0],
    scale: [0.58, 0.58, 0.58],
    collision: false,
    motion: "float",
    motionSpeed: 0.55,
  },
  {
    id: "cube-question-block",
    asset: "/assets/cube-world/blocks/QuestionMark.gltf",
    district: "innovation",
    category: "technology",
    position: [-13.1, 1.35, -6.1],
    rotation: [0, 0.35, 0],
    scale: [0.7, 0.7, 0.7],
    collision: false,
    motion: "spin",
    motionSpeed: 0.7,
  },
  {
    id: "cube-diamond-block",
    asset: "/assets/cube-world/blocks/Block_Diamond.gltf",
    district: "research",
    category: "technology",
    position: [14.4, 0.72, -5.7],
    rotation: [0, -0.35, 0],
    scale: [0.52, 0.52, 0.52],
    collision: false,
    motion: "float",
    motionSpeed: 0.62,
  },
  {
    id: "cube-dog-wanderer",
    asset: "/assets/cube-world/animals/Dog.gltf",
    district: "plaza",
    category: "npc-environment",
    position: [3.0, 0.42, 3.3],
    rotation: [0, -0.7, 0],
    scale: [0.42, 0.42, 0.42],
    collision: false,
    motion: "wander",
    motionRadius: 1.2,
    motionSpeed: 0.52,
  },
  {
    id: "cube-sheep-solar",
    asset: "/assets/cube-world/animals/Sheep.gltf",
    district: "garden",
    category: "npc-environment",
    position: [14.9, 0.46, 11.4],
    rotation: [0, 1.1, 0],
    scale: [0.46, 0.46, 0.46],
    collision: false,
    motion: "wander",
    motionRadius: 1.5,
    motionSpeed: 0.38,
  },
  {
    id: "cube-cat-archive",
    asset: "/assets/cube-world/animals/Cat.gltf",
    district: "art",
    category: "npc-environment",
    position: [-11.6, 0.38, 10.2],
    rotation: [0, -1.1, 0],
    scale: [0.42, 0.42, 0.42],
    collision: false,
    motion: "wander",
    motionRadius: 1.05,
    motionSpeed: 0.5,
  },
  {
    id: "cube-horse-harbor",
    asset: "/assets/cube-world/animals/Horse.gltf",
    district: "harbor",
    category: "npc-environment",
    position: [7.5, 0.34, 16.9],
    rotation: [0, -2.4, 0],
    scale: [0.45, 0.45, 0.45],
    collision: false,
    motion: "wander",
    motionRadius: 1.4,
    motionSpeed: 0.44,
  },
];

function villageHouse(
  id: string,
  district: DistrictId,
  position: [number, number],
  rotation: number,
  wallAsset: string,
  roofAsset: string,
  scale = 0.52
): CityModelAssetSpec[] {
  const [x, z] = position;
  return [
    {
      id: `${id}-wall`,
      asset: wallAsset,
      district,
      category: "building-small",
      position: [x, 0.48, z],
      rotation: [0, rotation, 0],
      scale: [scale, scale, scale],
      collision: true,
    },
    {
      id: `${id}-roof`,
      asset: roofAsset,
      district,
      category: "building-small",
      position: [x, 1.9, z],
      rotation: [0, rotation, 0],
      scale: [scale * 1.04, scale * 1.04, scale * 1.04],
      collision: false,
    },
  ];
}

function streetTree(id: string, district: DistrictId, position: [number, number]): CityModelAssetSpec {
  return {
    id,
    asset: "/assets/cube-world/environment/Tree_1.gltf",
    district,
    category: "vegetation",
    position: [position[0], 0.38, position[1]],
    rotation: [0, 0, 0],
    scale: [0.55, 0.55, 0.55],
    collision: false,
  };
}

export const ACTIVE_CITY_MODEL_ASSETS: CityModelAssetSpec[] = [
  {
    id: AQUARIUS_CASCADE_INSTALLATION_ID,
    asset: AQUARIUS_CASCADE_INSTALLATION_ASSET,
    district: "plaza",
    category: "landmark",
    position: [0, 0.43, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    collision: true,
  },
  ...villageHouse(
    "north-row-house-a",
    "observatory",
    [-4.4, -12.4],
    0,
    "/assets/medieval-village/Wall_Plaster_Door_Round.gltf",
    "/assets/medieval-village/Roof_RoundTiles_4x4.gltf"
  ),
  ...villageHouse(
    "north-row-house-b",
    "research",
    [4.4, -12.4],
    0,
    "/assets/medieval-village/Wall_Plaster_Window_Wide_Round.gltf",
    "/assets/medieval-village/Roof_RoundTiles_4x4.gltf"
  ),
  ...villageHouse(
    "west-maker-house-a",
    "innovation",
    [-14.4, -13.2],
    Math.PI / 2,
    "/assets/medieval-village/Wall_UnevenBrick_Door_Round.gltf",
    "/assets/medieval-village/Roof_Wooden_2x1.gltf",
    0.54
  ),
  ...villageHouse(
    "west-maker-house-b",
    "innovation",
    [-14.4, -1.8],
    Math.PI / 2,
    "/assets/medieval-village/Wall_UnevenBrick_Window_Wide_Round.gltf",
    "/assets/medieval-village/Roof_RoundTiles_6x6.gltf",
    0.5
  ),
  ...villageHouse(
    "west-maker-house-c",
    "art",
    [-14.4, 8.2],
    Math.PI / 2,
    "/assets/medieval-village/Corner_Exterior_Brick.gltf",
    "/assets/medieval-village/Roof_RoundTiles_4x4.gltf",
    0.5
  ),
  ...villageHouse(
    "east-residence-house-a",
    "garden",
    [14.4, -6.8],
    -Math.PI / 2,
    "/assets/medieval-village/Wall_Plaster_Door_Round.gltf",
    "/assets/medieval-village/Roof_RoundTiles_6x6.gltf",
    0.52
  ),
  ...villageHouse(
    "east-residence-house-b",
    "garden",
    [14.4, 4.8],
    -Math.PI / 2,
    "/assets/medieval-village/Wall_Plaster_Window_Wide_Round.gltf",
    "/assets/medieval-village/Roof_RoundTiles_4x4.gltf",
    0.52
  ),
  ...villageHouse(
    "east-residence-house-c",
    "garden",
    [14.4, 12.6],
    -Math.PI / 2,
    "/assets/medieval-village/Corner_Exterior_Wood.gltf",
    "/assets/medieval-village/Roof_Wooden_2x1.gltf",
    0.5
  ),
  ...villageHouse(
    "south-market-house-a",
    "harbor",
    [-3.8, 18.8],
    Math.PI,
    "/assets/medieval-village/Wall_Plaster_Door_Round.gltf",
    "/assets/medieval-village/Roof_Wooden_2x1.gltf",
    0.5
  ),
  ...villageHouse(
    "south-market-house-b",
    "harbor",
    [3.8, 18.8],
    Math.PI,
    "/assets/medieval-village/Wall_UnevenBrick_Door_Round.gltf",
    "/assets/medieval-village/Roof_RoundTiles_4x4.gltf",
    0.5
  ),
  streetTree("street-tree-nw", "plaza", [-6.2, -6.2]),
  streetTree("street-tree-ne", "plaza", [6.2, -6.2]),
  streetTree("street-tree-sw", "plaza", [-6.2, 6.2]),
  streetTree("street-tree-se", "plaza", [6.2, 6.2]),
  {
    id: "alien-main-street-runner",
    asset: "/assets/animated/aliens/alien.fbx",
    district: "plaza",
    category: "npc-environment",
    position: [7.4, 0.42, -2.8],
    rotation: [0, 0, 0],
    scale: [0.0049, 0.0049, 0.0049],
    collision: false,
    motion: "wander",
    motionRadius: 4.2,
    motionSpeed: 1.08,
    motionAction: "run",
  },
  {
    id: "alien-helmet-park-patrol",
    asset: "/assets/animated/aliens/alien-helmet.fbx",
    district: "garden",
    category: "npc-environment",
    position: [9.2, 0.42, 10.2],
    rotation: [0, 0, 0],
    scale: [0.0046, 0.0046, 0.0046],
    collision: false,
    motion: "wander",
    motionRadius: 3.2,
    motionSpeed: 0.9,
    motionAction: "run",
  },
  {
    id: "trex-civic-runner",
    asset: "/assets/animated/dinosaurs/trex.fbx",
    district: "harbor",
    category: "npc-environment",
    position: [-2.5, 0.44, 12.8],
    rotation: [0, 0, 0],
    scale: [0.00105, 0.00105, 0.00105],
    collision: false,
    motion: "wander",
    motionRadius: 4.3,
    motionSpeed: 0.9,
    motionAction: "run",
  },
  {
    id: "velociraptor-maker-runner",
    asset: "/assets/animated/dinosaurs/velociraptor.fbx",
    district: "innovation",
    category: "npc-environment",
    position: [-8.2, 0.42, 5.6],
    rotation: [0, 0, 0],
    scale: [0.0015, 0.0015, 0.0015],
    collision: false,
    motion: "wander",
    motionRadius: 3.8,
    motionSpeed: 1.25,
    motionAction: "run",
  },
  {
    id: "triceratops-science-walker",
    asset: "/assets/animated/dinosaurs/triceratops.fbx",
    district: "research",
    category: "npc-environment",
    position: [9.0, 0.44, -10.8],
    rotation: [0, 0, 0],
    scale: [0.00088, 0.00088, 0.00088],
    collision: false,
    motion: "wander",
    motionRadius: 3.4,
    motionSpeed: 0.62,
    motionAction: "walk",
  },
  {
    id: "stegosaurus-canal-walker",
    asset: "/assets/animated/dinosaurs/stegosaurus.fbx",
    district: "innovation",
    category: "npc-environment",
    position: [-11.4, 0.44, -10.6],
    rotation: [0, 0, 0],
    scale: [0.00105, 0.00105, 0.00105],
    collision: false,
    motion: "wander",
    motionRadius: 3.2,
    motionSpeed: 0.58,
    motionAction: "walk",
  },
];

export const CITY_ASSET_CATALOG: AssetCatalogItem[] = [
  {
    source: "public/assets/characters",
    category: "npc-environment",
    examples: ["character-a.glb", "character-d.glb", "character-e.glb", "character-f.glb"],
    plannedUse: "玩家、水瓶人格 NPC、人類居民與城市傳說角色。",
    status: "in-project",
  },
  {
    source: "public/assets/buildings, public/assets/roads, public/assets/props, public/assets/vegetation",
    category: "building-small",
    examples: ["building-type-a.glb", "building-type-d.glb", "planter.glb", "tree-small.glb"],
    plannedUse: "第一階段已放入廣場、工坊、研究區與花園，作為街區生活模型。",
    status: "in-project",
  },
  {
    source: "/Users/jay/Downloads/kenney_space-kit.zip",
    category: "technology",
    examples: ["corridor_cross", "craft_racer", "alien", "astronautA"],
    plannedUse: "觀測區、研究區與資料塔可用太空艙、走廊、載具語彙加強。",
    status: "available-download",
  },
  {
    source: "/Users/jay/Downloads/kenney_3d-road-tiles.zip",
    category: "street-prop",
    examples: ["roadTile_001.gltf", "roadTile_014.gltf", "roadTile_041.gltf"],
    plannedUse: "後續可替換主幹道與街區入口的道路模組。",
    status: "available-download",
  },
  {
    source: "/Users/jay/Downloads/kenney_nature-kit.zip",
    category: "vegetation",
    examples: ["bridge_center_stone", "tree", "plant", "bridge_wood"],
    plannedUse: "人道花園、水道橋梁、港灣邊界與氧氣樹周邊。",
    status: "available-download",
  },
  {
    source: "public/assets/water",
    category: "water-prop",
    examples: ["boat-house-a.glb", "boat-speed-a.glb", "buoy.glb", "ramp-wide.glb"],
    plannedUse: "第一階段已配置到 Canal Harbor 的碼頭、水面與遠景終點。",
    status: "in-project",
  },
  {
    source: "procedural-three-geometry",
    category: "landmark",
    examples: ["Aquarius core", "neon canals", "district platforms", "bridges"],
    plannedUse: "第一階段城市骨架、中央地標、道路、水道、橋與街區密度。",
    status: "procedural",
  },
];
