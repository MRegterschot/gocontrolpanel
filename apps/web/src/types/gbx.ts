export type ModeScriptInfo = {
  Name: string;
  CompatibleMapTypes: string;
  Description: string;
  Version: string;
  ParamDescs: ScriptParamDescs[];
  CommandDescs: ScriptCommandDescs[];
}

export type ScriptParamDescs = {
  Name: string;
  Desc: string;
  Type: string;
  Default: string;
}

interface ScriptCommandDescs {
  Name: string;
  Desc: string;
  Type: string;
  Default: string;
}
