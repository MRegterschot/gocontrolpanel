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
  GBX_SERVICE: {
    URL: string;
    WS_URL: string;
    TOKEN: string;
    WS_TICKET_SECRET: string;
  };
  SECRETS_KEY: string;
  CODRIVER: {
    INTERNAL_TOKEN: string;
    API_KEY: string;
  };
  MARKETPLACE: {
    // Empty turns browsing the marketplace off; uploading plugins keeps working
    INDEX_URL: string;
  };
}
