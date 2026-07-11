// Untyped third-party modules.

declare module "toxiclibsjs/geom" {
  const geom: any;
  export default geom;
}

declare module "toxiclibsjs/physics2d" {
  const physics2d: any;
  export default physics2d;
}

// Classic script imported as raw text (evaluated manually in the sketch).
declare module "p5.glitch/p5.glitch.js" {
  const source: string;
  export default source;
}
