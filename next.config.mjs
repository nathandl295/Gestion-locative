/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
```

Sauvegarde avec **⌘ + S**, puis dans le terminal :
```
git add .
git commit -m "fix build"
git push