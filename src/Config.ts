const config = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN,
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
  storyVaultAPIURL: import.meta.env.VITE_STORY_VAULT_API_URL,
  audience: import.meta.env.VITE_AUTH0_AUDIENCE,
};

export default config;
