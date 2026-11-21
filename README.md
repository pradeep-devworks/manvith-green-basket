# Manvith Green Basket

Manvith Green Basket is an Expo and React Native app for browsing fresh produce, managing a basket, and signing in with Google.

## Get started

1. Install Node.js and the project dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and add the Supabase project URL and public client key.
3. Start Expo:

   ```bash
   npx expo start
   ```

## Supabase Google sign-in

Allow this app redirect URL in Supabase Auth:

```text
manvithgreenbasket://google-auth
```

The app label is **Manvith Green Basket**. The package name and Expo slug use the lowercase `manvith-green-basket` form.
