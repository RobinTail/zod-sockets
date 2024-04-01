export interface OAuthFlowsObject {
  implicit?: OAuthFlowObject;
  password?: OAuthFlowObject;
  clientCredentials?: OAuthFlowObject;
  authorizationCode?: OAuthFlowObject;
}

export interface OAuthFlowObject {
  /** @desc for implicit and authorizationCode */
  authorizationUrl?: string;
  /** @desc for password, clientCredentials and authorizationCode */
  tokenUrl?: string;
  refreshUrl?: string;
  /** @desc A map between the scope name and a short description for it. */
  availableScopes: Record<string, string>;
}

export interface SecuritySchemeObject {
  type:
    | "userPassword"
    | "apiKey"
    | "X509"
    | "symmetricEncryption"
    | "asymmetricEncryption"
    | "httpApiKey"
    | "http"
    | "oauth2"
    | "openIdConnect"
    | "plain"
    | "scramSha256"
    | "scramSha512"
    | "gssapi";
  description?: string;
  /** @desc for httpApiKey */
  name?: string;
  /** @desc Valid values are "user" and "password" for "apiKey" and "query", "header" or "cookie" for "httpApiKey". */
  in?: "user" | "password" | "query" | "header" | "cookie";
  /**
   * @desc for http
   * @link https://www.iana.org/assignments/http-authschemes/http-authschemes.xhtml
   * */
  scheme?: string;
  /** @desc for http */
  bearerFormat?: string;
  /** @desc for oauth2 */
  flows?: OAuthFlowsObject;
  /** @desc for openIdConnect */
  openIdConnectUrl?: string;
  /** @desc List of the needed scope names. For "oauth2" and "openIdConnect" */
  scopes?: string[];
}
