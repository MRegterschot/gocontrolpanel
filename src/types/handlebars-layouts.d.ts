declare module 'handlebars-layouts' {
  import * as Handlebars from 'handlebars';
  function layouts(handlebars: typeof Handlebars): Record<string, Handlebars.HelperDelegate>;
  export = layouts;
}