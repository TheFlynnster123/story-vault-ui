# Environment Variables

Environment variables locally should be created via a `.env.local` file. An example of what this should look like is available at example.env.

When deployed, we need to make them GitHub Environment Secrets. Here's what we need to do when we add a new config option:

1. Add it to .env.local
2. Add it to example.env
3. Add it to Config.ts
4. Add it to GitHub pipeline
5. Add it to GitHub Secrets for Dev
6. Add it to GitHub Secrets for Prod

Kinda involved but whatever 🤷‍♂️
