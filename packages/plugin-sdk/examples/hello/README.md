# Hello

Greets players when they join the server or type `/hello`, and remembers how often it greeted
each of them. A small widget shows the greeting and has a **Hi** button that greets you too.

## Settings

- **Greeting**: the text players get, for example `Welcome` or `Hoi`.
- **Show the widget**: turn the widget off and keep only the chat greeting.

## Permissions

- **In-game interface**: the greeting widget.
- **Send chat messages**: the greeting itself.
- **Storage**: the greeting count per player.

This is the example plugin of the [GoControlPanel plugin SDK](https://github.com/MRegterschot/gocontrolpanel/blob/master/docs/plugin-sdk.md);
its source is in `packages/plugin-sdk/examples/hello`.
