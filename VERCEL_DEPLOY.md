# Deploy a Vercel

## Opción Recomendada: Backend en Vercel + Frontend en Vercel

### Paso 1: Crear dos proyectos en Vercel

**Proyecto 1: Backend API**
```bash
# En Vercel dashboard, conectar este repo
# Settings:
# - Build Command: cd backend && npm install && npm run build
# - Start Command: cd backend && npm start
# - Framework: Other
# - Install Command: npm install -g concurrently
```

**Proyecto 2: Frontend**
```bash
# En Vercel dashboard, conectar este repo
# Settings:
# - Root Directory: frontend
# - Build Command: npm run build
# - Install Command: npm install
# - Environment Variables:
#   - VITE_API_URL: https://your-backend-domain.vercel.app
```

### Paso 2: Configurar Variables de Entorno

**Backend (.env in Vercel)**
```
NODE_ENV=production
PORT=3000
```

**Frontend (Environment Variables in Vercel)**
```
VITE_API_URL=https://watchers-backend.vercel.app
```

### Paso 3: Push a GitHub y Deploy

```bash
# Asegurate de estar en main branch
git checkout main
git push origin main

# Vercel desplegará automáticamente
```

## Opción Alternativa: Todo en un Proyecto Vercel

### Estructura para Vercel

```vercel.json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "framework": "vite"
}
```

Vercel detectará automáticamente la app Vite en `frontend/` y hará proxy de `/trpc` al backend.

### Pasos:

1. **Conecta repo a Vercel**
   - Go to vercel.com/new
   - Import this repository
   - Select team

2. **Configura Build Settings**
   - Framework: Other
   - Build Command: `npm run build`
   - Install Command: `npm install`
   - Output Directory: `frontend/dist`

3. **Agrega Environment Variables**
   ```
   VITE_API_URL=http://localhost:3000
   NODE_ENV=production
   ```

4. **Deploy**
   - Click Deploy
   - Vercel build y desplegará automáticamente

## Después del Deploy

### Verificar que funciona

```bash
# Backend health check
curl https://your-domain.vercel.app/health

# Frontend UI
Visit https://your-domain.vercel.app
```

### Testing en Vercel

1. Crea un watch
2. Verifica que aparece en la lista
3. Simula una alerta
4. Archiva un watch
5. Revisa el historial de alertas

## Compartir con William

Una vez deployado, comparte el link:
```
https://your-domain.vercel.app
```

William verá:
- Dashboard de Watchers en vivo
- Todos los features funcionando
- API respondiendo desde Vercel

## Troubleshooting Vercel

**"Cannot find module" error**
- Verifica que todas las dependencias están en package.json
- Revisa que los imports usan rutas correctas

**"Build failed" error**
- Revisa los logs en Vercel dashboard
- Verifica que el build command es correcto
- Confirma que todas las env vars están configuradas

**API not responding**
- Verifica que VITE_API_URL apunta al backend correcto
- Revisa CORS headers en response
- Confirma que el backend está deployado

**Frontend shows 404**
- Verifica que Output Directory es `frontend/dist`
- Revisa que `npm run build` genera archivos en dist/
- Confirma que index.html existe

## Deployment en Vivo

### Proyecto Frontend (Recomendado)

1. **Go to vercel.com/new**
2. **Import Git Repository**
3. **Select this repo: stealth-seller-watchers-mvp**
4. **Configure Project**
   - Framework Preset: Other
   - Build Command: `npm run build`
   - Output: `frontend/dist`
5. **Add Environment**
   ```
   VITE_API_URL=http://localhost:3000
   ```
6. **Click Deploy**

### Compartir URL con William

Después del deploy:
```
Demo: https://stealth-seller-watchers-mvp.vercel.app
GitHub: https://github.com/1981-LLC-dba-Stealth-Seller/stealth-seller-watchers-mvp
```

## Pro Tips

- **Auto-deploy on push**: Vercel automaticamente redeploy cuando haces push a main
- **Preview deployments**: Cada PR genera una preview URL
- **Environment per branch**: Puedes tener dev, staging, prod con diferentes URLs
- **Analytics**: Vercel mostrará performance metrics automáticamente

## Rollback

Si algo sale mal:
1. Go to Vercel dashboard
2. Select the project
3. Go to Deployments
4. Click "Rollback" en el último deployment bueno

## Próximos Pasos

- [ ] Push a GitHub
- [ ] Conectar Vercel
- [ ] Deploy
- [ ] Compartir link con William
- [ ] Recopilar feedback
- [ ] Integrar database real
- [ ] Agregar APIs reales (Firecrawl, Keepa)
