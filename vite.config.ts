import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

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
    },
  };
});
