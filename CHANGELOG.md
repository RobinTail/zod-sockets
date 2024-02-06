# Changelog

## Version 0

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
