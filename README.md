# zod-sockets

[![coverage](https://coveralls.io/repos/github/RobinTail/zod-sockets/badge.svg)](https://coveralls.io/github/RobinTail/zod-sockets)

Socket.IO solution with I/O validation.

Version 0 is unstable — public API may be changed at any time.

# How it works

## Technologies

- [Typescript](https://www.typescriptlang.org/) first.
- Sockets — [Socket.IO](https://socket.io/), using [WebSocket](https://github.com/websockets/ws) for transport.
- Schema validation — [Zod 3.x](https://github.com/colinhacks/zod).
- Generating client side types — inspired by [zod-to-ts](https://github.com/sachinraja/zod-to-ts).
- Supports any logger having `info()`, `debug()`, `error()` and `warn()` methods.

## Concept

The library distinguishes between incoming and outgoing events. The first are called Actions, and the second — Emission.
Emission is configured first, representing the schemas for validating the outgoing data, as well as optionally received
acknowledgements. Based on this configuration, an Actions Factory is created, where Actions are produced that have
schemas for checking the incoming data and an optionally sent acknowledgement, and a handler. This handler is aware of
the Emission types and is equipped with the emission and broadcasting methods, while its returns become an
acknowledgement for the Action. This configuration is used to validate the input and output data against the specified
schemas, it can be exported to frontend side, thus ensuring that the established contract is followed.

![Workflow Diagram](flow.svg)

# Quick start

## Installation

Install the package and its peer dependencies.

```shell
yarn add zod-sockets zod socket.io typescript
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
  event: "ping",
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
  actions: [onPing],
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
a callback function having ordered arguments. The schemas may also have transformations. This declaration establishes
the constraints on your further implementation as well as payload validation and helps to avoid mistakes during the
development. Consider the following examples of two outgoing events, with and without acknowledgment:

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

## Server compatibility

### With HTTP(S)

You can attach the sockets server to any HTTP or HTTPS server created using native Node.js methods.

```typescript
import { createServer } from "node:http"; // or node:https
import { attachSockets } from "zod-sockets";

attachSockets({ target: createServer().listen(port) });
```

### With Express

For using with Express.js, supply the `app` as an argument of the `createServer()` (avoid ~~`app.listen()`~~).

```typescript
import express from "express";
import { createServer } from "node:http"; // or node:https
import { attachSockets } from "zod-sockets";

const app = express();
attachSockets({ target: createServer(app).listen(port) });
```

### With Express Zod API

For using with `express-zod-api`, take the `httpServer` or `httpsServer` returned by the `createServer()` method and
assign it to the `target` property.

```typescript
import { createServer } from "express-zod-api";
import { attachSockets } from "zod-sockets";

const { httpServer, httpsServer } = await createServer();
attachSockets({ target: httpsServer || httpServer });
```

## Logger compatibility

### Customizing logger

The library supports any logger having `info()`, `debug()`, `error()` and
`warn()` methods. For example, `pino` logger with `pino-pretty` extension:

```typescript
import pino, { Logger } from "pino";
import { createConfig } from "zod-sockets";

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: { colorize: true },
  },
});
const config = createConfig({ logger });

// Setting the type of logger used
declare module "zod-sockets" {
  interface LoggerOverrides extends Logger {}
}
```

### With Express Zod API

If you're using `express-zod-api`, you can reuse the same logger. If it's a custom logger — supply the same instance to
both `createConfig()` methods of two libraries. In case you're using the default `winston` logger provided by
`express-zod-api`, you can obtain its instance from the returns of the `createServer()` method.

```typescript
import { createServer } from "express-zod-api";
import { createConfig } from "zod-sockets";
import type { Logger } from "winston";

const { logger } = await createServer();
const config = createConfig({ logger });

// Setting the type of logger used
declare module "zod-sockets" {
  interface LoggerOverrides extends Logger {}
}
```

## Receiving events

### Making actions

Actions (the declarations of incoming events) are produced on an `ActionFactory` which is an entity made aware of the
Emission types (possible outgoing events) by supplying the config to its constructor. This architecture enables you to
keep the produced Actions in separate self-descriptive files.

```typescript
import { ActionsFactory } from "zod-sockets";

const actionsFactory = new ActionsFactory(config);
```

The Emission awareness of the `ActionsFactory` enables you to emit and broadcast other events due to receiving the
incoming event. This should not be confused with acknowledgments that are basically direct and immediate responses to
the one that sent the incoming event. Produce actions using the `build()` method accepting an object having the
incoming `event` name, `input` schema for its payload (excluding acknowledgment) and a `handler`, which is a function
where you place your implementation for handling the event. The argument of the `handler` in an object having several
handy entities, the most important of them is `input` property, being the validated event payload:

```typescript
const onChat = actionsFactory.build({
  event: "chat",
  input: z.tuple([z.string()]),
  handler: async ({ input: [message], client, all, withRooms, logger }) => {
    /* your implementation here */
    // typeof message === "string"
  },
});
```

### Acknowledgements

Actions may also have an acknowledgement, which is acquired from the returns of the `handler` and being validated
against additionally specified `output` schema. When the number of payload arguments is flexible, you can use `rest()`
method of `z.tuple()`. When the data type is not important at all, consider describing it using `z.unknown()`.
When using `z.literal()`, Typescript may assume the type of the actually returned value more loose, therefore the
`as const` expression might be required. The following example illustrates an action acknowledging "ping" event with
"pong" and an echo of the received payload:

```typescript
const onPing = actionsFactory.build({
  event: "ping",
  input: z.tuple([]).rest(z.unknown()),
  output: z.tuple([z.literal("pong")]).rest(z.unknown()),
  handler: async ({ input }) => ["pong" as const, ...input],
});
```

## Dispatching events

### In Action context

Depending on your application's needs and architecture, you can choose different ways to send events. The emission
methods have constraints on emission types declared in the configuration. The `input` is available for processing the
validated payload of the Action.

```typescript
actionsFactory.build({
  handler: async ({ input, client, withRooms, all }) => {
    // sending to the sender of the received event:
    await client.emit("event", ...payload);
    // sending to everyone except the client:
    await client.broadcast("event", ...payload);
    // sending to everyone except the client in a room:
    withRooms("room1").broadcast("event", ...payload);
    // sending to everyone except the client within several rooms:
    withRooms(["room1", "room2"]).broadcast("event", ...payload);
    // sending to everyone everywhere including the client:
    all.broadcast("event", ...payload);
  },
});
```

### In Client context

The previous example illustrated the events dispatching due to or in a context of an incoming event. But you can also
emit events regardless the incoming ones by setting the `onConnection` property within `hooks` of the `attachSockets()`
argument, which has a similar interface except `input` and fires for every connected client:

```typescript
attachSockets({
  hooks: {
    onConnection: async ({ client, withRooms, all }) => {
      /* your implementation here */
    },
  },
});
```

### Independent context

Moreover, you can emit events regardless the client activity at all by setting the `onStartup` property within `hooks`
of the `attachSockets()` argument. The implementation may have a `setInterval()` for recurring emission.

```typescript
attachSockets({
  hooks: {
    onStartup: async ({ all, withRooms }) => {
      // sending to everyone in a room
      withRooms("room1").broadcast("event", ...payload);
      // sending to everyone within several rooms:
      withRooms(["room1", "room2"]).broadcast("event", ...payload);
      // sending to everyone everywhere
      all.broadcast("event", ...payload);
    },
  },
});
```

## Rooms

### Available rooms

Rooms are the server side concept. Initially, each newly connected Client is located within a room having the same
identifier as the Client itself. The list of available rooms is accessible via the `getRooms()` method of the `all`
handler's argument.

```typescript
const handler = async ({ all, logger }) => {
  logger.debug("All rooms", all.getRooms());
};
```

### Distribution

The `client` argument of a handler (of a Client or an Action context) provides methods `join()` and `leave()` in order
to distribute the clients to rooms. Those methods accept a single or multiple room identifiers and _may_ be async
depending on adapter, therefore consider calling them with `await` anyway.

```typescript
const handler = async ({ client }) => {
  await client.leave(["room2", "room3"]);
  await client.join("room1");
};
```

### Who is where

Regardless the context, each handler has `withRooms()` argument accepting a single or multiple rooms identifiers. The
method returns an object providing the `getClients()` async method, returning an array of clients within those rooms.
Those clients are also equipped with distribution methods `join()` and `leave()`.

```typescript
const handler = async ({ withRooms }) => {
  await withRooms("room1").getClients();
  await withRooms(["room1", "room2"]).getClients();
};
```

Alternatively, you can request `getClients()` method of the `all` argument, which returns an array of all familiar
clients having `rooms` property, being an array of the room identifiers that client is located.

```typescript
const handler = async ({ all, logger }) => {
  const clients = await all.getClients();
  for (const client of clients) {
    logger.debug(`${client.id} is within`, client.rooms);
  }
};
```

## Metadata

Metadata is a custom object-based structure for reading and storing additional information on a client. Initially it is
an empty object.

### Defining constraints

It is recommended to specify an interface near your config describing the metadata you're aiming to interact with:

```typescript
interface Metadata {
  /** @desc Number of messages sent to the chat */
  msgCount: number;
}
```

### Reading

In every context you can read the client's metadata using the `getData<T>()` method with assigned type argument.
Since the presence of the data is not guaranteed, the method returns an object of `Partial<T>`.

```typescript
const handler = async ({ client, withRooms }) => {
  client.getData<Metadata>();
  withRooms("room1")
    .getClients()
    .map((someone) => someone.getData<Metadata>());
};
```

### Writing

Within a client context you can use `setData<T>()` method with type argument to store the metadata on the client:

```typescript
const handler = async ({ client }) => {
  client.setData<Metadata>({ msgCount: 4 });
};
```

# Advanced features

## Namespaces

Namespaces allow you to separate incoming and outgoing events into groups, in which events can have the same name, but
different essence, payload and handlers. The default namespace is `/`. The configuration of namespaces begins from
defining them for `emission` (the leading slash is not necessary):

```typescript
import { z } from "zod";
import { createConfig } from "zod-sockets";

const config = createConfig({
  emission: {
    // The namespace "/public"
    public: {
      chat: { schema },
    },
    // The namespace "/private"
    private: {},
  },
});
```

When namespaces are configured, Actions must also have the `ns` property assigned:

```typescript
import { ActionsFactory } from "zod-sockets";

const actionsFactory = new ActionsFactory(config);
const action = actionsFactory.build({
  ns: "public",
  // ...
});
```

And the hooks must also be declared per namespace:

```typescript
import { attachSockets } from "zod-sockets";

attachSockets({
  hooks: {
    public: {
      onStartup,
      onConnection,
      onDisconnect,
      onAnyIncoming,
      onAnyOutgoing,
    },
    private: {},
  },
});
```

Read the Socket.IO [documentation on namespaces](https://socket.io/docs/v4/namespaces/).

# Integration

## Exporting types for frontend

In order to establish constraints for events on the client side you can generate their Typescript definitions.

```typescript
import { Integration } from "zod-sockets";

const integration = new Integration({ config, actions });
const typescriptCode = integration.print(); // write this to a file
```

Check out [the generated example](example/example-client.ts).

You can adjust the naming of the produced functional arguments by applying the `.describe()` method to the schemas.

There is also a special handling for the cases when event has both `.rest()` on the payload schema and an
acknowledgement, resulting in producing overloads, because acknowledgement has to go after `...rest` which is
prohibited. You can adjust the number of the those overloads by using the `maxOverloads` option of the `Integration`
constructor. The default is `3`.

Then on the frontend side you can create a strictly typed Socket.IO client.

```typescript
import { io } from "socket.io-client";
import { Root } from "./generated/backend-types.ts"; // the generated file

const socket: Root.Socket = io(Root.path);
```

Alternatively, you can avoid installing and importing `socket.io-client` module by making a
[standalone build](https://socket.io/docs/v4/client-installation/#standalone-build) having
[`serveClient` option](https://socket.io/docs/v4/server-options/#serveclient) configured on the server.

# Next

More information is coming soon when the public API becomes stable (v1).
Meanwhile, use the JSDoc annotations, IDE type assistance and explore the sources of the repo for informing yourself.
