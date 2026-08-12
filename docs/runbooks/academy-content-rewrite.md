# Runbook — Reescribir contenido de Academia (ruta PSM)

> Handoff operativo. **No implementa** el rewrite: describe cómo hacerlo sin perder valor (seed ↔ DB ↔ admin).

**Estado:** aprobado para Génesis (copy listo). Pendiente de ejecución.

**Curso piloto:** `01-genesis` (Bloque 01 — Génesis)

---

## Resumen en 30 segundos

| Capa | Qué es | Riesgo |
|------|--------|--------|
| **Seed** (`prisma/data/academy-*.ts`) | Fuente de verdad versionada en git | Re-seed **pisa** título/summary/contentMDX de lecciones con el mismo `id` |
| **DB** (Supabase/Postgres vía Prisma) | Lo que ve la app en runtime | Aquí vive también lo editado en `/admin/cursos` |
| **Admin dashboard** | UI para editar la DB | No es un almacén aparte: **escribe a la DB**. Si no está en seed, un re-seed mal hecho lo puede borrar |

**Flujo canónico (repetible por bloque):**

```text
1. Inventariar DB (qué cursos/lecciones hay y cuáles NO están en seed)
2. Backup del seed actual + export de cursos solo-admin
3. Editar SOLO el archivo seed del bloque
4. Upsert acotado a ese curso (no re-sembrar toda la ruta a ciegas)
5. Verificar en UI
6. Commit del seed (+ backup)
7. Si no convence → restaurar seed backup y volver a upsert
```

---

## Respuesta directa: ¿hay que ir cambiando el seed pieza por pieza?

**Sí.** Para iterar conversión bloque a bloque:

1. Editas el seed del bloque (ej. `prisma/data/academy-genesis.ts`).
2. Corres un upsert que **solo** actualice ese curso.
3. Miras cómo se lee en `/academia/01-genesis` y el player.
4. Ajustas copy → otra vez seed → upsert.

No uses el admin como fuente de verdad del rewrite de conversión: lo que apruebes en conversación debe quedar en seed (git), y de ahí a la DB. Así el siguiente curso se hace igual.

### ⚠️ Trampa actual del repo

```json
"db:seed:academy-genesis": "tsx scripts/seed-academy-genesis.ts"
"db:seed:academy-ruta": "tsx scripts/seed-academy-genesis.ts"
```

Ambos apuntan al **mismo** script, y ese script llama `seedAcademyRuta()` → **re-siembra los 5 bloques** (Génesis + Fundamentos + Praxis + Validación + Portal).

Eso significa:

- Un “seed de Génesis” **también pisa** Fundamentos/Praxis/etc. si el seed no coincide con lo que hay en admin/DB.
- Dentro de cada curso, `upsertAcademyCourse` **borra** módulos/lecciones cuyo `id` ya no está en el seed.

**Antes de ejecutar en un entorno con trabajo de admin:** inventariar + backup + preferir upsert **solo** de `01-genesis` (script acotado o llamada puntual). No correr `npm run db:seed:academy-ruta` “para probar Génesis”.

Archivos clave:

| Archivo | Rol |
|---------|-----|
| `prisma/data/academy-genesis.ts` | Contenido Bloque 01 |
| `prisma/data/academy-fundamentos.ts` | Bloque 02 |
| `prisma/data/academy-route-blocks.ts` | Bloques 03–05 |
| `prisma/data/academy-ruta.ts` | Orquesta los 5 + borra slugs deprecados |
| `prisma/data/academy-seed-shared.ts` | `upsertAcademyCourse` (update + delete huérfanos) |
| `scripts/seed-academy-genesis.ts` | Entrypoint CLI (hoy: ruta completa) |

Slugs canónicos de ruta: `01-genesis`, `02-fundamentos`, `03-praxis`, `04-validacion`, `05-portal-clinico`  
(`curso-online` **no** es el slug actual.)

---

## Regla de oro: no borrar cursos hechos en admin

### Qué sobrevive a un re-seed

- Cursos con `id`/`slug` **distintos** a los de la ruta sembrada y **fuera** de listas de borrado.

### Qué se destruye o pisa

1. **`seedAcademyRuta`** hace `deleteMany` de slugs/ids deprecados (`DEPRECATED_ROUTE_SLUGS` / `DEPRECATED_ROUTE_IDS` en `academy-ruta.ts`).
2. **`seedAcademyGenesis`** también borra placeholders:

   - `fundamentos-mindfulness`
   - `manejo-ansiedad-estres`
   - `comunicacion-asertiva`
   - `fundamentales-de-la-psicoterapia`

3. **`upsertAcademyCourse`** en un curso sembrado:
   - Actualiza course/module/lesson fields del seed (incl. `contentMDX`).
   - `deleteMany` de lessons/modules del curso cuyo `id` **no** está en el seed.

### Checklist obligatorio antes del primer upsert experimental

```bash
# 1) Listar cursos en DB (Prisma Studio o SQL)
npx prisma studio
# Tabla courses: anotar id, slug, title, updatedAt
```

Para cada curso en DB:

| Pregunta | Acción |
|----------|--------|
| ¿Está en seed (`academy-*.ts`)? | OK versionado |
| ¿Solo existe por admin (no está en seed)? | **Exportar a archivo** antes de cualquier seed (ver abajo) |
| ¿Es `01-genesis` y vamos a recortar lecciones? | Las lecciones viejas **desaparecen** del curso al upsert; backup del seed + export MDX si quieres conservar copy |

**“Salvar lo del admin”** = asegurarse de que está **persistido en DB** *y* **exportado a git** (seed o `prisma/data/backups/`), no solo “visible en el dashboard”. El dashboard no guarda nada fuera de la DB.

### Guardar desde admin → seed (lock)

En `/admin/cursos/[id]`:

1. Afina el curso en el dashboard (queda en DB al guardar).
2. Pulsa **Guardar en seed** → lee el modal → confirma.
3. Eso escribe `prisma/data/locked/<slug>.{ts,json}` (+ seed canónico si es `01-genesis` o `02-fundamentos`).
4. **Commit** esos archivos.

Re-poblar locked:

```bash
npm run db:seed:academy-locked
```

---

## Backup / restore (scripts listos)

Exporta **todo** lo que está en la DB del Hub (incluye `curso-online` y los 5 bloques):

```bash
# Todos los cursos → prisma/data/backups/academy-all-courses.<stamp>.json
npx tsx scripts/export-academy-courses.ts

# Solo uno
npx tsx scripts/export-academy-courses.ts --slug=curso-online
```

Restaurar (upsert por `id`; **no borra** lecciones extra que existan en DB):

```bash
npx tsx scripts/restore-academy-courses.ts prisma/data/backups/academy-all-courses.<stamp>.json
npx tsx scripts/restore-academy-courses.ts prisma/data/backups/academy-curso-online.<stamp>.json --slug=curso-online
```

**Commita el JSON en git** — sin eso el backup solo vive en tu máquina.

Snapshot ya tomado (2026-08-12): 6 cursos, entre ellos `curso-online` (5 módulos / 8 lecciones).

Sin ese export, un `deleteMany` o un recorte de lesson IDs **no se recupera** desde el admin.

---

## Backup para poder regresar (Génesis)

No hace falta revertir todo `main`. Para contenido:

### A. Backup del seed (git-friendly)

```bash
mkdir -p prisma/data/backups
cp prisma/data/academy-genesis.ts \
  prisma/data/backups/academy-genesis.pre-conversion.$(date +%Y%m%d).ts
```

Commit ese backup **antes** de editar el seed nuevo.

### B. Rollback de contenido

1. Restaurar `academy-genesis.ts` desde el backup (o `git checkout -- prisma/data/academy-genesis.ts` si quedó commiteado).
2. Volver a correr el upsert **solo** de Génesis.
3. Verificar UI.

### C. Lo que el backup de seed NO recupera

- Cursos/lecciones que nunca estuvieron en seed (solo admin/DB) y se borraron sin export.
- Media en Storage si se borró el objeto (las URLs en lesson pueden quedar huérfanas).

Por eso el inventario + export de cursos solo-admin es paso 0.

---

## Procedimiento — Bloque 01 Génesis (próxima ejecución)

### Decisiones de copy ya aprobadas

| # | Decisión |
|---|----------|
| Alcance | Reemplazar Génesis largo por ruta amigable de conversión (L1 + L2). Recortar lecciones viejas del seed implica que el upsert las **elimina** de ese curso en DB. |
| `$20/mes` en Fundamentos (L2) | **Sí**, dejarlo donde está en el mapa. |
| Validación | Decir **“validación / constancia”**, no “certificación”. |
| Starter Pack / docs a fondo | Link a [https://motusdao.gitbook.io/ruta-psms/](https://motusdao.gitbook.io/ruta-psms/) |
| Capa A | Actualizar también `summary` (+ `description` / outcomes alineados) del curso |
| Git | Seguir en `main`; rollback = backup seed + re-upsert (no mezclar con otros features) |

### Pasos (cuando se ejecute)

1. **Inventariar** cursos en DB; exportar cualquier curso no sembrado.
2. **Backup** `academy-genesis.ts` → `prisma/data/backups/`.
3. **Reescribir** `prisma/data/academy-genesis.ts`:
   - Course `summary` / `description` / `learningOutcomes` (capa A).
   - Un módulo corto con **Lección 1** y **Lección 2** (capa B + mapa).
   - Quitar del seed las lecciones/módulos que ya no existan (o dejar ids viejos unpublished solo si más adelante se añade flag; hoy el upsert **borra** ids ausentes).
4. **Upsert solo Génesis** (ideal: script que llame `seedAcademyGenesis(prisma)` sin `seedAcademyRuta`). Evitar `db:seed:academy-ruta` hasta tener certeza.
5. **QA UI**
   - Catálogo / detalle: hook “sin costo, sin compromiso”.
   - L1 preview: perfiles + qué es MotusDAO.
   - L2: mapa sin overload; $20 solo en Fundamentos; Validación sin “certificación”; link GitBook.
   - Confirmar que otros cursos admin siguen listados.
6. **Commit** seed nuevo + backup (mensaje tipo: `content(academy): rewrite Genesis for conversion`).
7. Si no convence → rollback sección anterior.

### Mejora de tooling recomendada (follow-up)

- Separar scripts: `db:seed:academy-genesis` → solo Génesis; `db:seed:academy-ruta` → los 5.
- Opcional: `scripts/export-course.ts <slug>` → JSON en `prisma/data/backups/`.
- Documentar en admin UI: “Re-seed pisa este curso si comparte id con seed”.

---

## Copy aprobado — listo para pegar en seed

### Curso (`summary`)

> Entra gratis. Sin compromiso. Descubre si esta comunidad de psicólogos es para ti.

### Curso (`description` — alinear con L1)

Usar el mismo arco: perfiles → sin costo → qué es MotusDAO en corto → Génesis gratis; el resto más adelante.  
Docs a fondo: [ruta-psms](https://motusdao.gitbook.io/ruta-psms/).

### Lección 1 — Esto es para ti

- **Título:** Esto es para ti  
- **Summary:** Sin costo, sin compromiso. Entras, ves, decides.  
- **Duración:** ~6 min  
- **Preview:** sí (`isFreePreview: true`)

Contenido (MDX):

```md
# Esto es para ti

Si eres psicólogo y llegaste hasta aquí, probablemente te reconoces en al menos una de estas:

- **Recién egresaste** y no sabes por dónde empezar. Necesitas guía, comunidad y un camino claro que no te deje improvisando.
- **Tienes consulta presencial** pero quieres atender en digital. Sin perder calidad clínica, sin volverte experto en tecnología.
- **Ya atiendes online** pero todo es desordenado. Pacientes que no llegan, herramientas que no conectan, encuadre que se siente improvisado.

**Sin costo. Sin compromiso.** Entras, ves y decides si esto es para ti.

## Qué es MotusDAO (en corto)

MotusDAO es un ecosistema de psicólogos que decidieron no esperar a que el sistema se actualice. Aquí encuentras formación clínica, comunidad real con supervisión, y herramientas digitales para tu consulta — sin jerga tech, sin promesas falsas, sin certificaciones milagro.

No vienes a comprar una promesa. Vienes a conocer cómo trabajamos y si resuena contigo.

## Qué vas a hacer en Génesis

En este bloque gratuito vas a:

1. **Orientarte** — entender qué es esto y para quién es.
2. **Ver el mapa** — los 5 bloques de la ruta (solo nombres; lo demás lo ves cuando llegues).
3. **Conocer los espacios** — comunidad, supervisión, herramientas.

Cuando termines, sabrás si quieres seguir. O te llevas claridad. Ambas valen.

**Siguiente paso:** abre la siguiente lección. Te toma unos minutos.
```

### Lección 2 — Tu mapa

- **Título:** Tu mapa — solo lo que necesitas saber hoy  
- **Summary:** Cinco bloques. Un camino. Tú decides hasta dónde llegar.  
- **Duración:** ~7 min  
- **Preview:** sí (recomendado, para que el cold lead vea el mapa)

Contenido (MDX):

```md
# Tu mapa — solo lo que necesitas saber hoy

Esto es todo lo que tienes que saber por ahora:

**Génesis (gratis) → Fundamentos → Praxis → Validación → Portal**

Avanzas cuando tú quieras. No hay prisa, no hay examen de entrada.

- **Génesis** ← estás aquí. Gratis, sin compromiso. Te orientas.
- **Fundamentos** — el siguiente paso. Aprendes a montar tu práctica digital con encuadre clínico. Sin improvisar, sin perder pacientes en el intento. $20/mes.
- **Praxis** — espacio clínico con herramientas, supervisión y consultorio virtual.
- **Validación** — evaluación y validación / constancia de competencias.
- **Portal** — tu consultorio digital funcionando.

Los bloques 3, 4 y 5 los ves cuando llegues. No necesitas saberlo todo hoy.

## Tu primera semana en MotusDAO

En los próximos 7 días vas a:

1. Entrar a la comunidad y conocer colegas como tú.
2. Explorar el mapa completo de la ruta.
3. Decidir si esto es para ti.

Sin pagar un peso. Sin que te vendan nada.

## ¿Quieres profundizar?

Si eres de los que lee los manuales completos antes de empezar, aquí tienes la documentación a fondo de todo el ecosistema:

[Ruta del Profesional de la Salud Mental (PSM) →](https://motusdao.gitbook.io/ruta-psms/)

**Siguiente paso:** cuando estés listo, Fundamentos te espera.
```

---

## Definición de Done (por bloque)

- [ ] Backup seed (+ export cursos solo-admin si aplica) commiteado o archivado
- [ ] Seed del bloque actualizado con copy aprobado
- [ ] Upsert **acotado** aplicado; otros cursos admin intactos
- [ ] UI revisada (catálogo + 2 lecciones)
- [ ] Commit en git del seed
- [ ] Nota breve en este runbook o handoff: “Bloque N hecho / siguiente = …”

---

## Siguiente mensaje al agente (copy-paste)

```
Sigue docs/runbooks/academy-content-rewrite.md

1) Inventariar courses en DB; exportar cualquier curso no sembrado a prisma/data/backups/
2) Backup academy-genesis.ts
3) Reescribir prisma/data/academy-genesis.ts con el copy aprobado del runbook (L1+L2, summary/description)
4) Upsert SOLO seedAcademyGenesis — no seedAcademyRuta
5) No tocar otros bloques ni borrar cursos admin ajenos a la ruta
```
