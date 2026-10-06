# Plugin Manialink appearance

Server admins can restyle the Manialinks of every plugin on a server, including first-party marketplace plugins, private uploads and built-in plugins. The styling is stored with the server, separately from plugin settings, and is kept when plugins are updated.

## Server-wide appearance

**Server → Plugins → Plugin appearance** sets a theme for all plugins with a Manialink UI on that server, including built-in ones:

- **Text:** font, text color, text scale and line spacing for every label.
- **Standard windows:** title bar color, title text color and background color of windows created with `ctx.ui.window()`. These target the `window-titlebar`, `window-title` and `window-body` classes of the SDK window template.

Leave a field empty to keep each plugin's own value. The font field suggests common game fonts, but accepts any font name the game supports. Text color applies to every label, including button icons, so check contrast against plugin backgrounds. Theme options are applied first; [advanced rules](#advanced-rules) follow and win for the same property. Saving redraws open pages as described in [Saving](#saving).

## Advanced rules

Use **Advanced rules** in the same dialog for styling the theme options do not cover. Rules apply to every plugin. Add a rule, choose an element type and add the properties to override. Optional widget/window, element ID and class fields narrow the selection; all supplied filters must match. Leave them empty to affect every element of the selected type. Rules apply in order, with later rules taking precedence for the same property.

Examples:

- Set **Element type: label**, then add **Font**, **Text size** and **Text color** to change all labels.
- To move a standard SDK widget, select **frame**, set **Element ID: widget**, and add **Position (X Y)**, for example `-150 70`. Supply a widget name to limit this to one widget.
- To scale a standard SDK window, select **frame**, set **Element ID: window**, and add **Scale**, for example `1.2`.
- To recolor a specific background, select **quad**, enter its ID or class from the plugin template and set **Background color**.

Widget/window names are the `id` passed to `ctx.ui.widget()` or `ctx.ui.window()`, without the `plg.<slug>.` prefix, and match that name in any plugin. A widget rule also matches its corresponding update page. Element IDs and classes refer to attributes in the rendered template; these are exact matches, not CSS selectors.

Supported properties include fonts, text size and color, text effects and wrapping, background and focus colors, position, size, scale, rotation, layer, alignment, opacity, visibility and built-in game styles. Position and size values are two space-separated numbers in Manialink units. Colors are hexadecimal without `#`. Opacity ranges from `0` to `1`; boolean properties use `0` or `1`. Fonts and styles must exist in the game; this does not upload custom fonts or provide browser CSS. See the [Maniaplanet Manialink guide](https://doc.maniaplanet.com/manialink/getting-started) for coordinates and element basics.

## Saving

Saving redraws currently open pages without restarting the plugin's server-side logic. It can reset client-side ManiaScript state on those pages. Closed pages are not reopened. Overrides are reapplied whenever the plugin renders a page, and reconnecting players receive the styled pages. Removing a property restores the plugin's original value; **Reset to plugin defaults**, followed by **Save appearance**, removes all overrides.

## Limits

- ManiaScript can change properties after rendering or create new controls. Those script-driven changes are not rewritten. Inline text formatting can also affect the visible result.
- Changing a frame's size does not automatically reflow or resize its children. Scale a frame to resize its contents together, or target individual elements.
- Template IDs/classes may change between plugin versions, so targeted rules may need adjustment after an update.
- At most 50 rules are allowed. Identity, action, script and URL attributes cannot be overridden.
- If the styled page exceeds the sandbox's 128 KB page limit, the service sends the original page and logs a warning.

## Deployment

Apply the `20261006140000_server_plugin_appearance` migration, which adds the `servers.pluginAppearance` column, using the normal deployment process before running the updated panel and GBX service. Matching migrations are included for MySQL/MariaDB and PostgreSQL.
