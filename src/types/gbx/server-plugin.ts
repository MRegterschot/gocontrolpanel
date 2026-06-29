export interface ServerPlugin {
  Name: string;
  SettingsDesc: {
    Name: string;
    Desc: string;
    Type: string;
    Default: string | number | boolean;
  }[];
  SettingsValues: Record<string, string | number | boolean>;
}