import { ActionsFactory } from "../src";
import { socketsConfig } from "./config";

/** @desc this factory is for producing actions - handlers of the incoming socket.io events */
export const actionsFactory = new ActionsFactory(socketsConfig);
