# Praxis — mapa comercial de lanzamiento

Este documento es interno. No publicarlo como lección.

## Arquitectura

Praxis es el contenedor de formación aplicada.

La colección de Benjamin es la primera oferta destacada, pero no define toda la identidad futura de Praxis.

```text
Praxis
├── Cursos breves
├── Talleres
├── Programas de autor
├── Especializaciones temáticas
├── Casos y ejercicios
└── Supervisión clínica — oferta separada
```

## Colección Maestro Benjamin Buzali

| Producto | Precio |
|---|---:|
| Escucha clínica y patrones relacionales | USD 15 |
| Formulación de casos e hipótesis clínicas | USD 15 |
| Razonamiento clínico y análisis del discurso | USD 15 |
| Ética de la intervención y conversación clínica | USD 15 |
| Programa avanzado de lógica, discurso y clínica lacaniana | USD 40 |
| **Total individual** | **USD 100** |

## Lógica de LTV

La colección permite varias decisiones de compra pequeñas en lugar de depender de una venta única de alto compromiso.

Ejemplo:

```text
Génesis gratis
→ Membresía Fundamentos USD 20/mes
→ Curso Praxis USD 15
→ segundo curso USD 15
→ tercer curso USD 15
→ cuarto curso USD 15
→ programa avanzado USD 40
→ supervisión USD 50 cuando exista necesidad
→ Validación / Pase / Portal según criterios independientes
```

## Principios

1. No obligar a recorrer la colección completa.
2. No presentar los cuatro cursos introductorios como una orientación clínica obligatoria.
3. Identificar explícitamente material psicodinámico, lacaniano y autoral.
4. Praxis debe poder incorporar nuevos autores y escuelas sin cambiar su arquitectura.
5. La supervisión no es un módulo del curso.
6. Completar formación no habilita automáticamente Portal ni pacientes.
7. Mantener la autoría de Benjamin en el corpus que deriva de su trabajo.
8. El precio de USD 40 del programa avanzado es precio de lanzamiento para completar una escalera educativa de USD 100; revisar después de obtener datos reales de conversión, finalización y demanda.


## UX de progresión añadido en revisión editorial

La colección actual debe visualizarse como progreso **0/5 → 5/5**.

Cada producto debe tener:
- imagen/thumbnail;
- nombre;
- precio;
- estado: pendiente / en progreso / completado;
- checkbox o indicador equivalente;
- tratamiento visual de completado (check + tachado/atenuado, sin ocultar el producto).

Incentivo permitido:

> Completar 5/5 construye un recorrido formativo más completo y documentado dentro de MotusDAO y prepara mejor la evidencia educativa para la etapa de Validación.

No decir:

> 5/5 = validado, apto, certificado, acceso al Portal o competencia clínica oficialmente reconocida.
