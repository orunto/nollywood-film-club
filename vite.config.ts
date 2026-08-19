import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const cloudflareResvgWasm = fileURLToPath(
  new URL("./src/lib/resvg-wasm.cloudflare.ts", import.meta.url),
);
const nodeResvgWasm = fileURLToPath(
  new URL("./src/lib/resvg-wasm.node.ts", import.meta.url),
);

export default defineConfig(({ mode }) => {
  const isNode = mode === "node";

  return {
    css: {
      postcss: {
        plugins: [],
      },
    },
    environments: isNode
      ? {
          ssr: {
            build: {
              rollupOptions: {
                input: "./server/app.ts",
              },
            },
            resolve: {
              noExternal: ["@resvg/resvg-wasm"],
            },
          },
        }
      : undefined,
    plugins: [
      ...(isNode
        ? []
        : [cloudflare({ viteEnvironment: { name: "ssr" } })]),
      tailwindcss(),
      reactRouter(),
    ],
    resolve: {
      tsconfigPaths: true,
      alias: isNode
        ? { "#resvg-wasm": nodeResvgWasm }
        : { "#resvg-wasm": cloudflareResvgWasm },
    },
  };
});
