interface FlowCommons {
  /** @desc The URL to be used for obtaining refresh tokens. */
  refreshUrl?: string;
  /** @desc A map between the scope name and a short description for it. */
  availableScopes: Record<string, string>;
}

interface AuthHavingFlow {
  /** @desc The authorization URL to be used for this flow. */
  authorizationUrl: string;
}

interface TokenHavingFlow {
  /** @desc The token URL to be used for this flow. */
  tokenUrl: string;
}

export interface OAuthFlowsObject {
  implicit?: FlowCommons & AuthHavingFlow;
  password?: FlowCommons & TokenHavingFlow;
  clientCredentials?: FlowCommons & TokenHavingFlow;
  authorizationCode?: FlowCommons & AuthHavingFlow & TokenHavingFlow;
}

interface HttpApiKeySecurity {
  type: "httpApiKey";
  /** @desc The name of the header, query or cookie parameter to be used. */
  name: string;
  in: "query" | "header" | "cookie";
}

interface ApiKeySecurity {
  type: "apiKey";
  in: "user" | "password";
}

interface HttpSecurity {
  type: "http";
  /** @link https://www.iana.org/assignments/http-authschemes/http-authschemes.xhtml */
  scheme?: string;
  /** @example "Bearer" */
  bearerFormat?: string;
}

interface ScopesHavingSecurity {
  /** @desc List of the needed scope names. An empty array means no scopes are needed. */
  scopes?: string[];
}

interface OAuth2Security extends ScopesHavingSecurity {
  type: "oauth2";
  flows: OAuthFlowsObject;
}

interface OpenIdConnectSecurity extends ScopesHavingSecurity {
  type: "openIdConnect";
  /** @desc OpenId Connect URL to discover OAuth2 configuration values */
  openIdConnectUrl: string;
}

interface OtherSecurity {
  type:
    | "userPassword"
    | "X509"
    | "symmetricEncryption"
    | "asymmetricEncryption"
    | "plain"
    | "scramSha256"
    | "scramSha512"
    | "gssapi";
}

export type SecuritySchemeObject = {
  description?: string;
} & (
  | HttpApiKeySecurity
  | ApiKeySecurity
  | HttpSecurity
  | OAuth2Security
  | OpenIdConnectSecurity
  | OtherSecurity
);
