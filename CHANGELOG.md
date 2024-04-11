# Changelog

## Version 0

### v0.18.0

- Fixed possibly invalid values of `type` property when depicting `z.literal()`, `z.enum()` and `z.nativeEnum()`;
- Added depicting of `z.tuple().rest()` when used in a nested level of the schemas;
- Upgraded all dependencies;
- Consistent typing of the `Namespace` properties;
- Client distribution methods `join()` and `leave()` made async (always return `Promise<void>`).

### v0.17.0

- Added `handshake` property to the client objects:
  - See the Socket.IO documentation on handshake: https://socket.io/docs/v4/server-socket-instance/#sockethandshake

### v0.16.0

- Added `.emit()` method to the clients returned by `getClients()` method of `all` or `withRoom()`;
- Improved types for `getData()` in the for the clients returned by `getClients()` method;
- Better example of a subscription service using rooms.

```ts
// sending to someone knowing their id:
(await all.getClients())
  .find(({ id }) => id === "someId")
  ?.emit("event", ...payload);
```

### v0.15.1

- Changed runtime dependency: replaced `chalk` with `ansis`.

### v0.15.0

- Major improvement to the generated documentation: depicting payloads as actual tuples they are.

### v0.14.2

- Detaching from OpenAPI:
  - Reducing dependencies;
  - AsyncAPI 3.0.0 stricter compliance;
  - Extending from JSON Schema Draft-07 with several proprietary features of AsyncAPI standard.
- Several adjustments made in this regard:
  - `discriminator` field changed to `string`;
  - using `const` field for `z.literal()`.

### v0.14.1

- Fixed broken publishing workflow (broken release).
- The following versions and deprecated: 0.14.0, 0.13.1, 0.13.0, 0.12.0, 0.11.3, 0.11.2.

### v0.14.0

- Featuring examples in the generated documentation:
  - Describe `Action` examples using its `.example()` method;
  - Describe Emission examples using `examples` property in namespace config.

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

### v0.13.1

- Minor adjustments to the documentation.

### v0.13.0

- Config creation changes aim to improve the clarity and make it easier to begin using this library for the first time;
- Easier config for a simple applications:
  - Replacing `createConfig()` with `createSimpleConfig()` - for a single namespace (root namespace only).
- Making namespaces opt-in feature:
  - Use the exposed `new Config()` and its `.addNamespace()` method of each namespace;
  - Fallbacks removed from `Config::constructor` — it creates no namespaces by default,
    but `addNamespace` creates root namespace when `path` prop is omitted;
- See the migration advice below.

```ts
// if using the root namespace only:
import { createSimpleConfig } from "zod-sockets";
const simpleConfig = createSimpleConfig({
  /* logger, timeout, emission, hooks, metadata */
});

// if using namespaces other than "/":
import { Config } from "zod-sockets";
const config = new Config({ logger, timeout })
  .addNamespace({
    path: "ns1",
    /* emission, hooks, metadata */
  })
  .addNamespace({
    path: "ns2",
    /* emission, hooks, metadata */
  });
```

### v0.12.0

- Switching to AsyncAPI version 3.0.0 for generating documentation:
  - Channel identifiers are human-readable again thanks to the dedicated `address` property;
  - Server URL is deconstructed into `protocol`, `host` and `pathname`;
  - The featured `operations` are detached from `channels`;
  - Custom protocols are no longer supported, therefore changing `socket.io` to `ws`, channel bindings remain;
  - For the Socket.IO acknowledgements using the featured `reply` schema instead of the message bindings;
  - In this regard, new composition implies a dedicated operation per message;
  - Several other adjustments according to [Release notes](https://www.asyncapi.com/blog/release-notes-3.0.0).

### v0.11.3

- Fixed the server `protocol` in the generated documentation (taking from the supplied server URL);
- Meanwhile, the server `url` in the generated documentation has no protocol prefix now;
- Reverted channel identifiers to actual namespaces in the generated documentation (according to AsyncAPI spec).

### v0.11.2

- Increasing AsyncAPI version to 2.6.0 in the generated documentation;
- Human-readable identifiers for channels, operations and messages in the generated documentation.

### v0.11.1

- Fix: marked tuple items as required.

### v0.11.0

- Featuring `Documentation` class:
  - Ability to generate the documentation of your Socket.IO-based application according to AsyncAPI standard;
  - Using a custom protocol `socket.io` that extends WebSockets bindings for describing acknowledgements and handshake;
  - Compliance with AsyncAPI version 2.5.0 so far (will be increased later);
  - Following features are not supported yet:
    - Examples,
    - `z.lazy()` and handling of circular references,
    - References and component-based composition of the document,
    - Informative errors.
  - Since AsyncAPI does not yet support `prefixItems` feature for describing tuples, those are depicted as objects
    having numeric properties. I found it acceptable at the moment because
    [Arrays are Objects](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array);
  - See the example of the generated documentation [here](examples/basics/example-documentation.yaml).

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

### v0.10.0

- Important changes to configuration:
  - The `createConfig()` method now returns an instance of `Config` class providing `addNamespace()` method;
  - The `addNamespace()` method becomes a primary approach for the namespace-first configuration;
  - By default, `createConfig()` creates an empty root namespace (having `/` path);
  - Namespaces consist of optional `emission`, `hooks` and `metadata`;
  - Therefore, the declaration of namespaces is moved from being under `emission` to the top level;
  - Hooks are moved from the argument of `attachSockets()` into the one of `addNamespace()`.
- Metadata is now a schema-based property of namespace:
  - No need to declare its interface;
  - Instead, `metadata` property of namespace should be assigned with an object-based schema;
  - The default schema for metadata is `z.object({}).strip()` — an empty object;
  - Methods `getData()` and `setData()` of the client context no longer require a type argument;
  - The `setData()` method performs validation and can throw `ZodError`;
  - Transformations are not allowed in the schema of metadata.

```ts
import { createConfig } from "zod-sockets";

const before = createConfig({
  emission: {
    // The namespace "/public"
    public: {},
    // The namespace "/private"
    private: {},
  },
});

const after = createConfig() // this makes root namespace "/"
  .addNamespace({ path: "public" })
  .addNamespace({ path: "private" });
```

### v0.9.1

- Ensuring that the namespace in the generated client is named the same as it's declared on backend;
- Using `chalk` v5 in runtime.

### v0.9.0

- New peer dependency required: `typescript`.
- Featuring `Integration` class:
  - It provides an ability to export the event definitions into a Typescript file for using on the frontend side;
  - For better naming of the functional arguments consider using `.describe()` method of the schemas;
  - There is also a special handling for the cases when event has both `.rest()` on the payload and an acknowledgement;
  - See the [example of the generated code](examples/basics/example-client.ts).

```typescript
import { Integration } from "zod-sockets";

new Integration({ config, actions }).print(); // typescript code
```

### v0.8.1

- Minor adjustments and cleanup.

### v0.8.0

- Introducing namespaces feature.
  - See the [Namespaces documentation](https://socket.io/docs/v4/namespaces/).
  - The default namespace is a root namespace `/`.
  - The namespaces can be declared within `emission` property of the `createConfig()` argument.
  - The `ActionsFactory::build()` method now accepts optional property `ns`.
  - The `hooks` property of the `attachSockets()` method now accepts handlers for each namespace (optional).
- Breaking changes:
  - `ActionMap` type removed;
  - Instead, the `ActionsFactory::build()` method now requires the `event` property of its argument;
  - Meanwhile, `actions` supplied to `attachSockets()` method now has to be an array of the produced actions.
  - The following properties of the `attachSockets()` argument must now be wrapped into `hooks`:
    - `onConnection()`, `onDisconnect()`, `onAnyIncoming()`, `onAnyOutgoing()`, `onStartup()`.

### v0.7.0

- `onAny()` property of `attachSockets()` argument renamed to `onAnyIncoming()`, having `event` and `payload` arguments;
- Introducing `onAnyOutgoing()`, having the same interface;
- Startup logo added;
- Some more refactoring.

### v0.6.2

- Upgrading dependencies and improving the documentation.

### v0.6.1

- Adding `join()` and `leave()` methods to `RemoteClient` (the ones returned by `getClients()`).

### v0.6.0

- Restoring the `all` argument of the Action handler (removed in v0.4.0), but now it works as expected, by providing:
  - `getRooms()` — all available rooms,
  - `getClients()` — all familiar clients,
  - `broadcast()` — sends an event to everyone.
- Describing the basic features in the documentation (Readme).

### v0.5.0

- Introducing `onStartup` option for `attachSockets()` method:
  - Ability to interact with rooms regardless of incoming events.
- `join()` and `leave()` methods are moved from `withRooms()` to `client`.
- `attachSockets()` became async.

### v0.4.0

- Reverted some changed made in v0.3.0: removed `all` argument from the Action handler:
  - The nested `broadcast` method moved to `client` argument,
  - The nested `getRooms()` renamed to `getAllRooms()`,
  - The nested `getClients()` renamed to `getAllClients()`.

### v0.3.2

- Ability to interact with the client's metadata: `getData<T>()` and `setData<T>()` methods.

### v0.3.1

- Using `io.of("/")` for both `all.getRooms()` and `all.getClients()`.

### v0.3.0

- New argument for the Action handler: `all` having methods:
  - `broadcast()` (moved);
  - `getRooms()` — returns all the available rooms;
  - `getClients()` — returns all the familiar clients.
- The argument `emit()` of the Action handler moved into `client` one.
- The argument `withRooms()` of the Action handler now also provides the `getClients()` method (clients in the rooms).

### v0.2.3

- Adding `getRooms()` and `withRooms()` providing `join()`, `leave()` and `broadcast()` methods to the Action handler.

### v0.2.2

- Adjusting documentation.

### v0.2.1

- Concept description and a workflow diagram.

### v0.2.0

- Moved `logger` from `attachSockets()` to `createConfig()` argument.

### v0.1.0

- Fixed module exports.
- Unit and integration tests.
- `createSocketsConfig()` renamed to `createConfig()`.

### v0.0.3

- Ensure emitting the declared events only.
- Generic implementation for `emit()` and `broadcast()`.

### v0.0.2

- Added broadcasting feature.
- Delegated emission error handling to user.

### v0.0.1

- First draft of the idea originally implemented as a feature for `express-zod-api`.
- Capable to handle incoming events handling payloads validated by `zod` schemas and acknowledge them.
- Can emit events having validated payloads and receive acknowledgements.
