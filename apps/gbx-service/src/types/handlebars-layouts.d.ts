declare module "handlebars-layouts" {
  import type Handlebars from "handlebars";
  function layouts(handlebars: typeof Handlebars): Record<string, Handlebars.HelperDelegate>;
  export = layouts;
}
