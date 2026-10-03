import HandlebarsServer from "handlebars";

HandlebarsServer.registerHelper("eq", (a, b) => a === b);

export { HandlebarsServer };
