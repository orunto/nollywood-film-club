import compression from "compression";
import express from "express";
import morgan from "morgan";

const buildPath = "./build/server/index.js";
const development = process.env.NODE_ENV === "development";
const port = Number.parseInt(process.env.PORT || "3000", 10);
const app = express();

app.use(compression());
app.disable("x-powered-by");

if (development) {
  const viteDevServer = await import("vite").then((vite) =>
    vite.createServer({
      mode: "node",
      server: { middlewareMode: true },
    }),
  );
  app.use(viteDevServer.middlewares);
  app.use(async (request, response, next) => {
    try {
      const source = await viteDevServer.ssrLoadModule("./server/app.ts");
      return await source.app(request, response, next);
    } catch (error) {
      if (error instanceof Error) {
        viteDevServer.ssrFixStacktrace(error);
      }
      next(error);
    }
  });
} else {
  app.use(
    "/assets",
    express.static("build/client/assets", { immutable: true, maxAge: "1y" }),
  );
  app.use(morgan("tiny"));
  app.use(express.static("build/client", { maxAge: "1h" }));
  app.use(await import(buildPath).then((module) => module.app));
}

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
