# Shared UI components

Use these components throughout the web app so styling stays consistent in light
and dark themes.

- Use `Card` for card surfaces and table containers. Choose padding and layout for
  the content without replacing its background, border, radius or shadow.
  `Card asChild` supports semantic elements such as list items. Images touching
  card edges use the matching `rounded-t-xl` / `rounded-b-xl` corners.
- Use `Button` for actions, including icon buttons and dialog controls. Use
  `variant` and `size` for their appearance; use `asChild` for action links.
- Use `Input`, `Textarea`, `Select`, `MultiSelect`, `SearchInput` and `FilterInput`
  for form controls. They share `formControlVariants` for borders, backgrounds,
  sizing, focus, disabled and validation states. New input-like controls should
  use the same variants.
- Use `FileUploadButton` for file imports that appear as buttons. It provides an
  ordinary keyboard-accessible button and opens a hidden file input.
- Use the shared `Label`, `Checkbox`, `Badge`, `Tabs` and modal components rather
  than styling native equivalents in feature components.

Keep feature overrides for layout, responsive sizing and meaningful states such
as selection, errors or warm-up status. Change shared styling here when updating
the app's visual design.
