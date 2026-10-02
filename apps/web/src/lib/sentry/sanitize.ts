import { Breadcrumb, ErrorEvent } from "@sentry/nextjs";
import { sendDefaultPii } from "./env";

export const beforeSend = (event: ErrorEvent) => {
  // Remove sensitive headers
  if (event.request?.headers) {
    for (const key of Object.keys(event.request.headers)) {
      switch (key.toLowerCase()) {
        case "authorization":
        case "cookie":
          delete event.request.headers[key];
          break;
      }
    }
  }

  if (event.request?.cookies) {
    for (const key of Object.keys(event.request.cookies)) {
      if (key.toLowerCase().includes("next-auth")) {
        delete event.request.cookies[key];
      }
    }
  }

  if (event.user && !sendDefaultPii) {
    delete event.user.email;
    delete event.user.ip_address;
  }

  return event;
};

export const beforeBreadcrumb = (breadcrumb: Breadcrumb) => {
  return breadcrumb;
};
