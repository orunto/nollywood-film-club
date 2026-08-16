import { createRequestHandler } from "@react-router/express";
import express from "express";
import { RouterContextProvider } from "react-router";
import { appServicesContext } from "../src/app/context";
import { securityHeaders } from "../src/runtime/security-headers";
import { getNodeServices } from "../src/services/node";

export const app = express();

app.use((_request, response, next) => {
  for (const [name, value] of Object.entries(securityHeaders)) {
    response.setHeader(name, value);
  }
  next();
});

app.use(
  createRequestHandler({
    build: () => import("virtual:react-router/server-build"),
    async getLoadContext() {
      const context = new RouterContextProvider();
      context.set(appServicesContext, await getNodeServices());
      return context;
    },
  }),
);
