import { createContext } from "react-router";
import type { AppServices } from "../services/contracts";

export const appServicesContext = createContext<AppServices>();
