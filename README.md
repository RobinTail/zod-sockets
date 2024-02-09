# zod-sockets

![coverage](coverage.svg)

Socket.IO Websockets with Zod validation.

Experimental solution for testing purposes only.

## Concept

The library distinguishes between incoming and outgoing events. The first are called Actions, and the second — Emission.
Emission is configured first, representing the schemas for validating the outgoing data, as well as optionally received
acknowledgements. Based on this configuration, an Actions Factory is created, where Actions are produced that have
schemas for checking the incoming data and an optionally sent acknowledgement, and a handler. This handler is aware of
the Emission types and is equipped with the emission and broadcasting methods, while its returns become an
acknowledgement for the Action. This configuration is used to validate the input and output data against the specified
schemas, thus ensuring that the established contract is followed.

![Workflow Diagram](flow.svg)

# Quick start

## Installation

Install the package and its peer dependencies.

```shell
yarn add zod-sockets zod socket.io
```

## Set up config

```typescript
import { createConfig } from "zod-sockets";

const config = createConfig({
  timeout: 2000,
  emission: {},
  logger: console,
});
```

## Create a factory

```typescript
import { ActionsFactory } from "zod-sockets";

const actionsFactory = new ActionsFactory(config);
```

## Create an action

```typescript
import { z } from "zod";

const onPing = actionsFactory.build({
  input: z.tuple([]).rest(z.unknown()),
  output: z.tuple([z.literal("pong")]).rest(z.unknown()),
  handler: async ({ input }) => ["pong", ...input] as const,
});
```

## Create a server

```typescript
import http from "node:http";
import { Server } from "socket.io";
import { attachSockets } from "zod-sockets";

attachSockets({
  /** @see https://socket.io/docs/v4/server-options/ */
  io: new Server(),
  config: config,
  actions: { ping: onPing },
  target: http.createServer().listen(8090),
});
```

## Try it

Start the application and execute the following [command](https://socket.io/docs/v4/troubleshooting-connection-issues/):

```shell
curl "http://localhost:8090/socket.io/?EIO=4&transport=polling"
```

The expected response should be similar to:

```json
{
  "sid": "***",
  "upgrades": ["websocket"],
  "pingInterval": 25000,
  "pingTimeout": 20000,
  "maxPayload": 1000000
}
```

Then consider using [Postman](https://learning.postman.com/docs/sending-requests/websocket/create-a-socketio-request/)
for sending the `ping` event to `ws://localhost:8090` with acknowledgement.

# Basic features

## Emission

The outgoing events should be configured using `z.tuple()` schemas. Those tuples describe the types of the arguments
supplied to the `Socket::emit()` method, excluding an optional acknowledgment, which has its own optional schema being
a callback function having ordered arguments. The schemas also may have transformations. Consider the examples:

```typescript
import { z } from "zod";
import { createConfig } from "zod-sockets";

const config = createConfig({
  emission: {
    // enabling Socket::emit("chat", "message", { from: "someone" })
    chat: {
      schema: z.tuple([z.string(), z.object({ from: z.string() })]),
    },
    // enabling Socket::emit("secret", "message", ([readAt]: [Date]) => {})
    secret: {
      schema: z.tuple([z.string()]),
      ack: z.tuple([
        z
          .string()
          .datetime()
          .transform((str) => new Date(str)),
      ]),
    },
  },
});
```

# Next

More information is coming soon when the public API becomes stable (v1).
Meanwhile, use the JSDoc annotations, IDE type assistance and explore the sources of the repo for informing yourself.
