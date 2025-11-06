import nunjucks from "nunjucks";
import path from "path";
import "server-only";

const templateDir = path.resolve(process.cwd(), "src/lib/manialink/templates");

nunjucks.configure(templateDir, {
  autoescape: false,
  noCache: process.env.NODE_ENV !== "production",
});

export default nunjucks;
