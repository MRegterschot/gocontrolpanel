import HandlebarsServer from "handlebars";
import Handlebars from "handlebars/runtime";
import layouts from "handlebars-layouts";

Handlebars.registerHelper("boolToNum", (value: boolean) => (value ? 1 : 0));

HandlebarsServer.registerHelper(
  "ifEq",
  function (
    this: Handlebars.HelperOptions,
    a: any,
    b: any,
    options: Handlebars.HelperOptions,
  ) {
    return a === b ? options.fn(this) : options.inverse(this);
  },
);

Handlebars.registerHelper('default', function (value, defaultValue) {
  return value || defaultValue;
});

Handlebars.registerHelper(layouts(Handlebars));

Handlebars.registerHelper("range", function (from: number, to: number, options: Handlebars.HelperOptions) {
  let out = "";
  for (let i = from; i < to; i++) {
    out += options.fn({ i });
  }
  return out;
});

Handlebars.registerHelper("multiply", function (a: number, b: number) {
  return a * b;
});

Handlebars.registerHelper("add", function (a: number, b: number) {
  return a + b;
});

export { HandlebarsServer, Handlebars };
