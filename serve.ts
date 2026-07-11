/**
 * Bun fullstack dev server.
 * `bun run dev` bundles index.html (React/TSX) with HMR and serves the boat
 * art from public/assets at the /assets/* URLs the sketches expect.
 * Missing assets return a real 404 so p5.loadImage's failure callback fires
 * and the physics-rect fallback kicks in.
 */
import type { BunRequest } from "bun";
import index from "./index.html";

const server = Bun.serve({
  port: Number(process.env.PORT ?? 5173),
  development: { hmr: true, console: true },
  routes: {
    "/assets/:file": async (req: BunRequest<"/assets/:file">) => {
      const file = Bun.file(`public/assets/${req.params.file}`);
      return (await file.exists())
        ? new Response(file)
        : new Response("Not found", { status: 404 });
    },
    // Dev helper: POST a canvas data-URL here to save the frame to .debug/
    // for pixel-level inspection, e.g.
    //   fetch("/__dump/frame.png", { method: "POST", body: canvas.toDataURL() })
    "/__dump/:name": async (req: BunRequest<"/__dump/:name">) => {
      const name = req.params.name.replace(/[^\w.-]/g, "_");
      const base64 = (await req.text()).split(",").pop() ?? "";
      await Bun.write(`.debug/${name}`, Buffer.from(base64, "base64"));
      return new Response("ok");
    },
    "/*": index,
  },
});

console.log(`LoonE Loop Studio running at ${server.url}`);
