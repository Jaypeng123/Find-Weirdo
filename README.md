# Find-Weirdo

Find-Weirdo is a 3D voxel web game set on Neon Floating Island. Players enter the city, follow NPC clues, and observe eight runaway Aquarius weirdos before the countdown ends.

## Requirements

- Node.js `>=22.13.0`
- npm

## Local Development

```bash
npm install
npm run dev
```

The dev server binds to `0.0.0.0`, so devices on the same Wi-Fi can test the site through the machine's local network IP.

## Build

```bash
npm run build
```

## Vercel

The project is configured for Vercel with `vercel.json`.

```bash
npm run build
npx vercel --prod
```

Once this repository is connected to Vercel, every push to `main` can trigger an automatic production deployment.
