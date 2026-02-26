const Config = {
  // @ts-ignore - Vite env variables
  domain: import.meta.env.VITE_AUTH0_DOMAIN,
  // @ts-ignore - Vite env variables
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
  // @ts-ignore - Vite env variables
  storyVaultAPIURL: import.meta.env.VITE_STORY_VAULT_API_URL,
  // @ts-ignore - Vite env variables
  audience: import.meta.env.VITE_AUTH0_AUDIENCE,
};

export default Config;
