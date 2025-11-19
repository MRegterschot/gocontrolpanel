import HandlebarsServer from "handlebars";
import layouts from "handlebars-layouts";
import Handlebars from "handlebars/runtime";

Handlebars.registerHelper("boolToNum", (value: boolean) => (value ? 1 : 0));

Handlebars.registerHelper("eq", (a, b) => a === b);

Handlebars.registerHelper("default", function (value, defaultValue) {
  return value || defaultValue;
});

Handlebars.registerHelper("length", function (array: any[]) {
  return array.length;
});

Handlebars.registerHelper(layouts(Handlebars));

Handlebars.registerHelper(
  "range",
  function (from: number, to: number, options: Handlebars.HelperOptions) {
    let out = "";
    for (let i = from; i < to; i++) {
      out += options.fn({ i });
    }
    return out;
  },
);

Handlebars.registerHelper("multiply", function (a: number, b: number) {
  return a * b;
});

Handlebars.registerHelper("add", function (a: number, b: number) {
  return a + b;
});

export { Handlebars, HandlebarsServer };
