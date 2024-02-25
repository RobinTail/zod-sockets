# Changelog

## Version 0

### v0.9.0

- Featuring `Integration` class:
  - It provides an ability to export the event definitions into a Typescript file for using on the frontend side;
  - For better naming of the functional arguments consider using `.describe()` method of the schemas;
  - There is also a special handling for the cases when event has both `.rest()` on the payload and an acknowledgement;
  - See the [example of the generated code](example/example-client.ts).

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
