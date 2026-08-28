# GitHub Token Setup for Private Packages

El frontend en `stealth-seller-frontend/dev` necesita acceso a paquetes privados en GitHub:
- `@1981-llc-dba-stealth-seller/types`

## Opción 1: Personal Access Token (Recomendado)

### Paso 1: Crear token en GitHub

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Name: `NPM_PACKAGES`
4. Selecciona permisos:
   - ✅ `read:packages`
   - ✅ `repo` (read-only)
5. Click "Generate token"
6. **Copia el token** (no lo pierdes, no se puede ver después)

### Paso 2: Configura npm localmente

Crea `~/.npmrc` (tu home directory):

```bash
@1981-llc-dba-stealth-seller:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_TOKEN_HERE
```

Reemplaza `YOUR_TOKEN_HERE` con tu token.

### Paso 3: Instala dependencias

```bash
cd stealth-seller-frontend
npm install --legacy-peer-deps
```

---

## Opción 2: Via Environment Variable

```bash
export NPM_TOKEN=YOUR_TOKEN_HERE
npm install --legacy-peer-deps
```

---

## Opción 3: Para Vercel Deployment

En Vercel Dashboard → Settings → Environment Variables:

```
NPM_TOKEN = [Your GitHub Token]
```

Vercel lo usará automáticamente en el build.

---

## Verificar que funciona

```bash
npm list @1981-llc-dba-stealth-seller/types
```

Debería mostrar la versión instalada.

---

## Troubleshooting

**"401 Unauthorized"**
- Token inválido o expirado
- Verifica que el token tiene permisos `read:packages`
- Regenera un nuevo token si es necesario

**"401 Unauthorized" en Vercel**
- Asegúrate de que `NPM_TOKEN` está en Vercel environment variables
- El token debe tener `read:packages` permission
- Redeploy después de agregar la variable

**"Could not resolve dependency"**
- Ejecuta `npm cache clean --force`
- Borra `node_modules` y `package-lock.json`
- Intenta instalar de nuevo

---

## Compartir con Team

Para otros developers:
1. Crea un token personal con `read:packages`
2. Configura `~/.npmrc` como arriba
3. Listo para instalar

NO compartas tokens. Cada dev debe tener su propio token.

---

## Después de Setup

Una vez que tengas el token configurado:

```bash
cd stealth-seller-frontend
git checkout dev
npm install --legacy-peer-deps
npm run dev
# Visitá http://localhost:5173
```

Deberías ver la interfaz real de Watchers con el backend MVP en http://localhost:3000

---

## Production (Vercel)

1. Get your GitHub Token (follow Opción 1)
2. Go to Vercel → Project Settings → Environment Variables
3. Add: `NPM_TOKEN = [Your Token]`
4. Redeploy

Vercel usará el token durante el build.
