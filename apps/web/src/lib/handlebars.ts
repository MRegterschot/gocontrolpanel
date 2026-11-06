import HandlebarsServer from "handlebars";

HandlebarsServer.registerHelper("eq", (a, b) => a === b);

// Provisioning scripts run as root, so form values never become shell syntax:
// {{sh value}} is one single-quoted shell word
HandlebarsServer.registerHelper(
  "sh",
  (value: unknown) =>
    new HandlebarsServer.SafeString(
      `'${String(value ?? "").replace(/'/g, `'\\''`)}'`,
    ),
);

// {{env value}} is a value line inside a quoted heredoc; a line break would end the heredoc
HandlebarsServer.registerHelper("env", (value: unknown) => {
  const text = String(value ?? "");
  if (/[\r\n\0]/.test(text)) {
    throw new Error("Configuration values can't contain line breaks");
  }
  return new HandlebarsServer.SafeString(text);
});

// Database and controller types also pick files and sed replacements in the scripts
const DATABASE_TYPES = ["mysql", "mariadb", "postgres"];
const CONTROLLER_TYPES = ["evosc", "maniacontrol", "minicontrol", "pyplanet"];

export function assertProvisioningChoices(
  databaseType?: string,
  controllerType?: string,
) {
  if (databaseType !== undefined && !DATABASE_TYPES.includes(databaseType)) {
    throw new Error(`Unsupported database type: ${databaseType}`);
  }
  if (
    controllerType !== undefined &&
    !CONTROLLER_TYPES.includes(controllerType)
  ) {
    throw new Error(`Unsupported server controller: ${controllerType}`);
  }
}

export { HandlebarsServer };
