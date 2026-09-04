# Patrones observados

## Cambios aplicados sobre output compilado, no sobre la fuente
- Primera vez: 2026-09-04
- Ocurrencias: 1 (2026-09-04)
- Qué pasa: el repo commitea `public/` (build de stealth-seller-frontend) y los cambios de UI se piden acá; cuando la fuente no está a mano, el cambio se hace a mano sobre el chunk minificado.
- Por qué importa: el próximo `scripts/build-frontend.sh` pisa `public/` y el cambio desaparece en silencio si no se replicó en el repo fuente.
- Estado: activo
