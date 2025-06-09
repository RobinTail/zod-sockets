# Zod Sockets

[![coverage](https://coveralls.io/repos/github/RobinTail/zod-sockets/badge.svg)](https://coveralls.io/github/RobinTail/zod-sockets)
[![AsyncAPI Validation](https://github.com/RobinTail/zod-sockets/actions/workflows/async-api-validation.yml/badge.svg)](https://github.com/RobinTail/zod-sockets/actions/workflows/async-api-validation.yml)
![NPM Downloads](https://img.shields.io/npm/dw/zod-sockets)
![NPM License](https://img.shields.io/npm/l/zod-sockets)

**Socket.IO solution with I/O validation and the ability to generate AsyncAPI specification and a contract for consumers.**

# How it works

[Demo Chat](https://github.com/RobinTail/chat)

## Technologies

- [Typescript](https://www.typescriptlang.org/) first.
- Sockets — [Socket.IO](https://socket.io/), using [WebSocket](https://github.com/websockets/ws) for transport.
- Schema validation — [Zod 4.x](https://github.com/colinhacks/zod).
- Generating documentation according to [AsyncAPI 3.0](https://www.asyncapi.com) specification.
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
import { createSimpleConfig } from "zod-sockets";

const config = createSimpleConfig(); // shorthand for root namespace only
```

## Create a factory

```typescript
import { ActionsFactory } from "zod-sockets";

const actionsFactory = new ActionsFactory(config);
```

## Create an action

```typescript
import { z } from "zod/v4";

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
import { z } from "zod/v4";
import { createSimpleConfig } from "zod-sockets";

const config = createSimpleConfig({
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

const { servers } = await createServer();
attachSockets({ target: servers.pop()! });
```

## Logger compatibility

### Customizing logger

The library supports any logger having `info()`, `debug()`, `error()` and
`warn()` methods. For example, `pino` logger with `pino-pretty` extension:

```typescript
import pino, { Logger } from "pino";
import { attachSockets } from "zod-sockets";

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: { colorize: true },
  },
});
attachSockets({ logger });

// Setting the type of logger used
declare module "zod-sockets" {
  interface LoggerOverrides extends Logger {}
}
```

### With Express Zod API

If you're using `express-zod-api`, you can reuse the same logger from the returns of the `createServer()` method.

```typescript
import { createServer } from "express-zod-api";
import { attachSockets } from "zod-sockets";
import type { Logger } from "winston";

const { logger } = await createServer();
attachSockets({ logger });

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

Produce actions using the `build()` method accepting an object having the incoming `event` name, the `input` schema for
its payload (excluding acknowledgment) and a `handler`, which is a function where you place your implementation for
handling the event. The argument of the `handler` in an object having several handy entities, the most important of
them is `input` property, being the validated event payload:

```typescript
const onChat = actionsFactory.build({
  // ns: "/", // optional, root namespace is default
  event: "chat",
  input: z.tuple([z.string()]),
  handler: async ({ input: [message], client, all, withRooms, logger }) => {
    /* your implementation here */
    // typeof message === "string"
  },
});
```

### Acknowledgements

Actions may also have acknowledgements that are basically direct and immediate responses to the one that sent the
incoming event. Acknowledgement is acquired from the returns of the `handler` and being validated against additionally
specified `output` schema. When the number of payload arguments is flexible, you can use `rest()` method of
`z.tuple()`. When the data type is not important at all, consider describing it using `z.unknown()`. When using
`z.literal()`, Typescript may assume the type of the actually returned value more loose, therefore the `as const`
expression might be required. The following example illustrates an action acknowledging "ping" event with "pong" and
an echo of the received payload:

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

The Emission awareness of the `ActionsFactory` enables you to emit and broadcast other events due to receiving the
incoming event. Depending on your application's needs and architecture, you can choose different ways to send events.
The emission methods have constraints on emission types declared in the configuration. The `input` is available for
processing the validated payload of the Action.

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
emit events regardless the incoming ones by setting the `onConnection` property within `hooks` of the config, which
has a similar interface except `input` and fires for every connected client:

```typescript
import { createSimpleConfig } from "zod-sockets";

const config = createSimpleConfig({
  // emission: { ... },
  hooks: {
    onConnection: async ({ client, withRooms, all }) => {
      /* your implementation here */
    },
  },
});
```

### Independent context

Moreover, you can emit events regardless the client activity at all by setting the `onStartup` property within `hooks`
of the config. The implementation may have a `setInterval()` for recurring emission.

```typescript
import { createSimpleConfig } from "zod-sockets";

const config = createSimpleConfig({
  hooks: {
    onStartup: async ({ all, withRooms }) => {
      // sending to everyone in a room:
      withRooms("room1").broadcast("event", ...payload);
      // sending to everyone within several rooms:
      withRooms(["room1", "room2"]).broadcast("event", ...payload);
      // sending to everyone everywhere:
      all.broadcast("event", ...payload);
      // sending to some particular user by familiar id:
      (await all.getClients())
        .find(({ id }) => id === "someId")
        ?.emit("event", ...payload);
    },
  },
});
```

## Handling errors

### Error context

You can configure the `onError` hook for handling errors of various natures.
The library currently provides two classes of proprietary errors:
`InputValidationError` and `OutputValidationError` (for Action acknowledgments).
The hook is intended to be generic, so some of its arguments are optional.
The following example shows how to emit an outgoing `error` event when the
incoming event data is invalid.

```typescript
import { createSimpleConfig, InputValidationError } from "zod-sockets";

const config = createSimpleConfig({
  emission: {
    error: {
      schema: z.tuple([
        z.string().describe("name"),
        z.string().describe("message"),
      ]),
    },
  },
  hooks: {
    onError: async ({ error, event, payload, client, logger }) => {
      logger.error(event ? `${event} handling error` : "Error", error);
      if (error instanceof InputValidationError && client) {
        try {
          await client.emit("error", error.name, error.message);
        } catch {} // no errors inside this hook
      }
    },
  },
});
```

### Emission errors

Every usage of `.emit()` and `.broadcast()` methods can potentially throw
a `ZodError` on validation or an `Error` on timeout. Those errors are not
handled by the library yet, not wrapped and not delegated to the `onError` hook,
so they have to be handled in place using `try..catch` approach.

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

### Subscriptions

In order to implement a subscription service you can utilize the rooms feature and make two Actions: for
[subscribing](example/actions/subscribe.ts) and [unsubscribing](example/actions/unsubscribe.ts). Handlers of those
Actions can simply do `client.join()` and `client.leave()` in order to address the client to/from a certain room. A
simple `setInterval()` function within an [Independent Context](#independent-context) (`onStartup` hook) can broadcast
to those who are in that room. Here is a simplified example:

```ts
import { createServer } from "express-zod-api";
import { attachSockets, createSimpleConfig, ActionsFactory } from "zod-sockets";
import { Server } from "socket.io";
import { z } from "zod/v4";

const { logger, servers } = await createServer();

const config = createSimpleConfig({
  emission: {
    time: { schema: z.tuple([z.date()]) }, // constraints
  },
  hooks: {
    onStartup: async ({ withRooms }) => {
      setInterval(() => {
        withRooms("subscribers").broadcast("time", new Date());
      }, 1000);
    },
  },
});

const factory = new ActionsFactory(config);
await attachSockets({
  config,
  logger,
  io: new Server(),
  target: servers.pop()!,
  actions: [
    factory.build({
      event: "subscribe",
      input: z.tuple([]),
      handler: async ({ client }) => client.join("subscribers"),
    }),
    factory.build({
      event: "unsubscribe",
      input: z.tuple([]),
      handler: async ({ client }) => client.leave("subscribers"),
    }),
  ],
});
```

## Metadata

Metadata is a custom object-based structure for reading and storing additional information about the clients.
Initially it is an empty object.

### Defining constraints

You can specify the schema of the `metadata` in config.
Please avoid transformations in those schemas since they are not going to be applied.

```typescript
import { z } from "zod/v4";
import { createSimpleConfig } from "zod-sockets";

const config = createSimpleConfig({
  metadata: z.object({
    /** @desc Number of messages sent to the chat */
    msgCount: z.number().int(),
  }),
});
```

### Reading

In every context you can read the client's metadata using the `getData()` method.
Since the presence of the data is not guaranteed, the method returns an `Partial<>` object of the specified schema.

```typescript
const handler = async ({ client, withRooms }) => {
  client.getData();
  withRooms("room1")
    .getClients()
    .map((someone) => someone.getData());
};
```

### Writing

Within a client context you can use `setData()` method to store the metadata on the client. The method provides type
assistance of its argument and may throw `ZodError` if it does not pass the validation against the specified schema.

```typescript
const handler = async ({ client }) => {
  client.setData({ msgCount: 4 });
};
```

## Namespaces

Namespaces allow you to separate incoming and outgoing events into groups, in which events can have the same name, but
different essence, payload and handlers. For using namespaces replace the `createSimpleConfig()` method with
`new Config()`, then use its `.addNamespace()` method for each namespace. Namespaces may have `emission`, `examples`,
`hooks` and `metadata`. Read the Socket.IO [documentation on namespaces](https://socket.io/docs/v4/namespaces/).

```typescript
import { Config } from "zod-sockets";

const config = new Config()
  .addNamespace({
    // The namespace "/public"
    emission: { chat: { schema } },
    examples: {}, // see Generating documentation section
    hooks: {
      onStartup: () => {},
      onConnection: () => {},
      onDisconnect: () => {},
      onAnyIncoming: () => {},
      onAnyOutgoing: () => {},
      onError: () => {},
    },
    metadata: z.object({ msgCount: z.number().int() }),
  })
  .addNamespace({
    path: "private", // The namespace "/private" has no emission
  });
```

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

## Generating documentation

You can generate the AsyncAPI specification of your API and write it into a file, that can be used as the documentation:

```typescript
import { Documentation } from "zod-sockets";

const yamlString = new Documentation({
  config,
  actions,
  version: "1.2.3",
  title: "Example APP",
  servers: { example: { url: "https://example.com/socket.io" } },
}).getSpecAsYaml();
```

See the example of the generated documentation [on GitHub](example/example-documentation.yaml) or
[open in Studio](https://studio.asyncapi.com/?url=https://raw.githubusercontent.com/RobinTail/zod-sockets/main/example/example-documentation.yaml).

### Adding examples to the documentation

You can add `Action` examples using its `.example()` method, and Emission examples you can describe in the `examples`
property of namespace config.

```ts
import { createSimpleConfig, ActionsFactory } from "zod-sockets";

// Examples for outgoing events (emission)
const config = createSimpleConfig({
  emission: {
    event1: { schema },
    event2: { schema, ack },
  },
  examples: {
    event1: { schema: ["example payload"] }, // single example
    event2: [
      // multiple examples
      { schema: ["example payload"], ack: ["example acknowledgement"] },
      { schema: ["example payload"], ack: ["example acknowledgement"] },
    ],
  },
});

// Examples for incoming event (action)
const factory = new ActionsFactory(config);
const action = factory
  .build({
    input: payloadSchema,
    output: ackSchema,
  })
  .example("input", ["example payload"])
  .example("output", ["example acknowledgement"]);
```

### Adding security schemas to the documentation

You can describe the security schemas for the generated documentation both on
server and namespace levels.

```ts
// Single namespace
import { createSimpleConfig } from "zod-sockets";

const config = createSimpleConfig({
  security: [
    {
      type: "httpApiKey",
      description: "Server security schema",
      in: "header",
      name: "X-Api-Key",
    },
  ],
});
```

```ts
// Multiple namespaces
import { Config } from "zod-sockets";

const config = new Config({
  security: [
    {
      type: "httpApiKey",
      description: "Server security schema",
      in: "header",
      name: "X-Api-Key",
    },
  ],
}).addNamespace({
  security: [
    {
      type: "userPassword",
      description: "Namespace security schema",
    },
  ],
});
```
