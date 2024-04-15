import type { Socket } from "socket.io";
import { z } from "zod";
import { Distribution } from "./distribution";
import { Broadcaster, EmissionMap, Emitter } from "./emission";

export interface Client<E extends EmissionMap, D extends z.SomeZodObject>
  extends Distribution {
  /** @alias Socket.connected */
  isConnected: () => boolean;
  /** @alias Socket.id */
  id: Socket["id"];
  handshake: Socket["handshake"];
  getRequest: () => Socket["request"];
  /** @desc Returns the list of the rooms the client in */
  getRooms: () => string[];
  /**
   * @desc Sends a new event to the client (this is not acknowledgement)
   * @throws z.ZodError on validation
   * @throws Error on ack timeout
   * */
  emit: Emitter<E>;
  /**
   * @desc Emits to others
   * @throws z.ZodError on validation
   * @throws Error on ack timeout
   * */
  broadcast: Broadcaster<E>;
  /** @desc Returns the client metadata according to the specified type or empty object */
  getData: () => Readonly<Partial<z.infer<D>>>;
  /**
   * @desc Sets the client metadata according to the specified type
   * @throws z.ZodError on validation
   * */
  setData: (value: z.infer<D>) => void;
}
