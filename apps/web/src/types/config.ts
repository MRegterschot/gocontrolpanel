export interface Config {
  NODE_ENV: string;
  HETZNER: {
    URL: string;
    KEY: string;
  };
  ECM: {
    URL: string;
  };
  DEFAULT_ADMINS: string[];
  DEFAULT_PERMISSIONS: string[];
  NADEO: {
    CLIENT_ID: string;
    CLIENT_SECRET: string;
    REDIRECT_URI: string;
    SERVER_LOGIN: string;
    SERVER_PASSWORD: string;
    CONTACT: string;
  };
  REDISURI: string;
}
