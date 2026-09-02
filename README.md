# Kuber Finance React Web Application

This is a separate pure React web application. It does not use React Native.

Both apps are connected through shared business data and helpers:

- Mobile app UI: `../app/KuberFinanceApp.tsx`
- Shared app logic/data: `../shared/kuberFinanceCore.ts`
- React web UI: `./src/App.jsx`

Install once from this folder if Vite is not installed yet:

```bash
npm install
```

Run the React web app:

```bash
npm run dev
```

Run the original Expo app from the project root:

```bash
npm start
```
