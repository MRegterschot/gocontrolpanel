# Plugin Manialink appearance

Server admins can open **Server → Plugins → Appearance** on an installed plugin with the `ui` capability. Overrides apply only to that plugin on that server, including first-party marketplace plugins and private uploads. They are stored separately from plugin settings and retained when switching package versions.

To style every plugin on a server at once, use **Plugin appearance** at the top of the server's plugin list (see [Server-wide appearance](#server-wide-appearance)).

## Server-wide appearance

**Server → Plugins → Plugin appearance** sets a theme for all plugins with a Manialink UI on that server, including built-in ones:

- **Text:** font, text color, text scale and line spacing for every label.
- **Standard windows:** title bar color, title text color and background color of windows created with `ctx.ui.window()`. These target the `window-titlebar`, `window-title` and `window-body` classes of the SDK window template.

Leave a field empty to keep each plugin's own value. The font field suggests common game fonts, but accepts any font name the game supports. Text color applies to every label, including button icons, so check contrast against plugin backgrounds. **Advanced rules** in the same dialog work like plugin rules but apply to every plugin; a widget/window name matches that name in any plugin. Selecting elements by structural path is only possible per plugin.

Styling is applied in this order, with later entries winning for the same property: theme options, server-wide rules, then the plugin's own appearance. The plugin's visual editor previews the combined result, and resetting a control there reveals the server-wide value. Saving redraws open pages as described in [Saving](#saving).

## Visual editor

The dialog loads a snapshot of the pages the plugin has currently rendered on the server. If nothing is listed, open the plugin's widget or window in Trackmania (or enable the plugin on a connected server in a supported mode) and select **Refresh from server**. Refreshing keeps unsaved changes.

Choose a widget or window, then select an element in the element list or the preview. The property panel shows the plugin's original value under each control; the reset button next to a control removes that override. Edits apply only to the selected element: elements with a unique ID are targeted by that ID, others by their position in the page structure. A visual edit is placed after existing rules, so it overrides broader rules for the same property. Structural targets can stop matching when the plugin changes its layout, for example after an update.

The preview is an approximation. It does not render game fonts, skins, images or ManiaScript animations. Player-specific pages share the same saved styling. Snapshots contain only presentation attributes and label text; actions, URLs, scripts and entry values never reach the browser.

## Advanced rules

Use **Advanced rules** for broader styling. Add a rule, choose an element type and add the properties to override. Optional widget/window, element ID and class fields narrow the selection; all supplied filters must match. Leave them empty to affect every element of the selected type. Rules apply in order, with later rules taking precedence for the same property.

Examples:

- Set **Element type: label**, then add **Font**, **Text size** and **Text color** to change all labels.
- To move a standard SDK widget, select **frame**, set **Element ID: widget**, and add **Position (X Y)**, for example `-150 70`. Supply a widget name to limit this to one widget.
- To scale a standard SDK window, select **frame**, set **Element ID: window**, and add **Scale**, for example `1.2`.
- To recolor a specific background, select **quad**, enter its ID or class from the plugin template and set **Background color**.

Widget/window names are the `id` passed to `ctx.ui.widget()` or `ctx.ui.window()`, without the `plg.<slug>.` prefix. A widget rule also matches its corresponding update page. Element IDs and classes refer to attributes in the rendered template; these are exact matches, not CSS selectors.

Supported properties include fonts, text size and color, text effects and wrapping, background and focus colors, position, size, scale, rotation, layer, alignment, opacity, visibility and built-in game styles. Position and size values are two space-separated numbers in Manialink units. Colors are hexadecimal without `#`. Opacity ranges from `0` to `1`; boolean properties use `0` or `1`. Fonts and styles must exist in the game; this does not upload custom fonts or provide browser CSS. See the [Maniaplanet Manialink guide](https://doc.maniaplanet.com/manialink/getting-started) for coordinates and element basics.

## Saving

Saving redraws currently open pages without restarting the plugin's server-side logic. It can reset client-side ManiaScript state on those pages. Closed pages are not reopened. Overrides are reapplied whenever the plugin renders a page, and reconnecting players receive the styled pages. Removing a property restores the plugin's original value; **Reset to plugin defaults**, followed by **Save appearance**, removes all overrides.

## Limits

- ManiaScript can change properties after rendering or create new controls. Those script-driven changes are not rewritten. Inline text formatting can also affect the visible result.
- Changing a frame's size does not automatically reflow or resize its children. Scale a frame to resize its contents together, or target individual elements.
- Template IDs/classes may change between plugin versions, so targeted rules may need adjustment after an update.
- At most 50 rules are allowed. Identity, action, script and URL attributes cannot be overridden through the appearance editor.
- If the styled page exceeds the sandbox's 128 KB page limit, the service sends the original page and logs a warning.

## Deployment

Apply the `20261006120000_plugin_appearance` (per-plugin `server_plugins.appearance`) and `20261006140000_server_plugin_appearance` (server-wide `servers.pluginAppearance`) migrations using the normal deployment process before running the updated panel and GBX service. Matching migrations are included for MySQL/MariaDB and PostgreSQL.
