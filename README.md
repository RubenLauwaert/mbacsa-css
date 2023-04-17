# Template to inject components in Community Solid Server as Package

This is what worked for me, although it's possible that I'm overcomplicating things.

## How to use

- Replace all occurences of `example-module` by your module name.
- `npm install`
- `npm run build` to build.
- `npm run start` to start, using the configuration in `config/default.json`. This is where you adjust the configuration. It worked for me when splitting up CSS and my own config files (`default.json` is in my own context, and imports `css.json`, which is in the CSS context. The latter then references other CSS config files using `css:` and then the config). `css.json` is CSS's `default.json`, but with `"css:config/storage/backend/memory.json"` removed, as that is the component I'm replacing with the custom `InMemoryAccessor.ts`. Make sure to add this back in if you're not replacing the `DataAccessor`. It's best to start with one of CSS's configs, like `config/default.json` or `config/file.json` from CSS's github, and then remove whatever you're replacing.
- CSS exports all classes used by Component.js (referenced in config files) in its `index.ts`, so I'm doing this as well. I'm not sure if it is necessary, but it works.
- As a test, this template injects a new `DataAccessor`, for which the code was copied.

Extra tip: You can add more CLI arguments by looking at what CSS does in `config/http/server-factory/https-websockets.json`.
