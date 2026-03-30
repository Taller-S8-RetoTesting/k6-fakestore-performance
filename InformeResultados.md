# Informe de Resultados — Ejercicio 2

---

## Índice

1. [Evaluación rápida](#evaluación-rápida)
2. [Objetivo](#objetivo)
3. [Fuentes analizadas](#fuentes-analizadas)
4. [Resumen ejecutivo](#resumen-ejecutivo)
5. [Evaluación detallada de métricas](#evaluación-detallada-de-métricas)
6. [Análisis del diagrama VUs vs req/s](#análisis-del-diagrama-vus-vs-requests-por-segundo)
7. [Hallazgos](#hallazgos)
8. [Conclusiones](#conclusiones)
9. [Recomendaciones](#recomendaciones)
10. [Veredicto final](#veredicto-final)

---

## Evaluación rápida

| Criterio | Umbral | Resultado | Veredicto |
|---|---|---|---|
| Throughput | `≥ 20 TPS` | `73.18 req/s` | ✅ Cumple |
| Tasa de error | `< 3%` | `2.44%` | ⚠️ Cumple (margen estrecho) |
| Latencia p(95) global | `< 1.5 s` | `1.57 s` | ❌ No cumple |
| Latencia p(95) respuestas exitosas | `< 1.5 s` | `1.42 s` | ✅ Cumple |
| Checks funcionales | `> 97%` | `97.55%` | ✅ Cumple |

> **Lectura rápida:** el sistema sostiene volumen y mantiene tasa de error dentro del límite, pero la latencia global en p(95) excede el umbral. Las respuestas exitosas, medidas por separado, sí cumplen. La diferencia la causan las respuestas fallidas (timeouts, errores 5xx), que inflan la cola de latencia.

---

## Objetivo

Analizar los resultados entregados en `textSummary.txt` y en el diagrama de relación entre `vus` y `http_reqs` para determinar el comportamiento de la prueba de carga, identificar hallazgos relevantes y proponer acciones de mejora.

> **Nota:** los criterios de aceptación (`≥ 20 TPS`, `p(95) < 1.5 s`, `error < 3%`) se toman del Ejercicio 1 como referencia, dado que el Ejercicio 2 no define SLAs propios. Se hace esta extrapolación de forma explícita.

---

## Fuentes analizadas

### Métricas de throughput y volumen

| Métrica | Valor |
|---|---|
| `http_reqs` | `276,650` (`73.18/s`) |
| `iterations` | `276,650` (`73.18/s`) |
| `data_received` | `842 MB` (`223 kB/s`) |
| `data_sent` | `588 MB` (`156 kB/s`) |

### Métricas de latencia

| Métrica | avg | min | med | p(90) | p(95) | max |
|---|---|---|---|---|---|---|
| `http_req_duration` | `861.68 ms` | `191.86 ms` | `613.42 ms` | `1.28 s` | `1.57 s` | `29.93 s` |
| ↳ `{ expected_response:true }` | `735.84 ms` | `249.92 ms` | `600.7 ms` | `1.22 s` | `1.42 s` | `26.72 s` |
| `http_req_waiting` | `861.21 ms` | `191.86 ms` | `613.01 ms` | `1.28 s` | `1.57 s` | `29.93 s` |
| `http_req_receiving` | `424.03 µs` | `0 s` | `320.7 µs` | `988.4 µs` | `1.05 ms` | `39.58 ms` |
| `http_req_sending` | `43.22 µs` | `0 s` | `0 s` | `0 s` | `51 µs` | `31.25 ms` |
| `http_req_blocked` | `10.97 µs` | `0 s` | `0 s` | `0 s` | `0 s` | `35.02 ms` |
| `http_req_connecting` | `3.3 µs` | `0 s` | `0 s` | `0 s` | `0 s` | `11.82 ms` |
| `http_req_tls_handshaking` | `7.36 µs` | `0 s` | `0 s` | `0 s` | `0 s` | `27.02 ms` |
| `iteration_duration` | `1.86 s` | `0 s` | `1.61 s` | `2.29 s` | `2.57 s` | `30.94 s` |

### Métricas de error y validación

| Métrica | Valor |
|---|---|
| `checks` | `97.55%` (✓ 269,891 / ✗ 6,759) |
| `http_req_failed` | `2.44%` (6,759 de 276,650) |

### Errores por etapa (contadores custom del script)

| Etapa | Tipo | Cantidad | Tasa |
|---|---|---|---|
| `stage_0` (ramp-up) | HTTP 5xx | `1` | `0.000265/s` |
| `stage_1` (carga sostenida) | HTTP 4xx | `769` | `0.203409/s` |
| `stage_1` (carga sostenida) | HTTP 5xx | `5,987` | `1.583625/s` |
| `stage_2` (ramp-down) | HTTP 5xx | `2` | `0.000529/s` |
| **Total** | | **6,759** | |

### Métricas de concurrencia

| Métrica | Valor | Mín | Máx |
|---|---|---|---|
| `vus` | `2` | `2` | `140` |
| `vus_max` | `140` | `140` | `140` |

### Observaciones del diagrama VUs vs http_reqs

- Comportamiento estable entre `120–140` VUs durante la etapa principal.
- Tasa de peticiones sostenida alrededor de `70–75 req/s`.
- Caída pronunciada intermedia con recuperación posterior.

---

## Resumen ejecutivo

La prueba sostuvo un throughput de `73.18 req/s`, más de 3.5 veces el mínimo de `20 TPS`. La tasa de error global fue `2.44%`, por debajo del máximo aceptable de `3%` aunque con margen estrecho. La latencia global en p(95) fue `1.57 s`, superando el umbral de `1.5 s`.

Sin embargo, la sub-métrica `{ expected_response:true }` de k6 revela que las respuestas exitosas tuvieron un p(95) de `1.42 s`, **dentro del umbral**. La degradación en el percentil global proviene de las respuestas fallidas (5xx, timeouts), que naturalmente tardan más y arrastran la cola de la distribución hacia arriba.

Los errores se concentraron casi por completo en la etapa de carga sostenida (`stage_1`): `5,987` errores `5xx` y `769` errores `4xx`, lo que apunta a saturación del backend bajo presión prolongada.

Traducción sin maquillaje: el sistema soporta volumen, pero cuando falla, falla lento — y esas fallas lentas contaminan la métrica global de latencia.

---

## Evaluación detallada de métricas

### 1. Throughput

| Métrica | Objetivo | Resultado |
|---|---|---|
| `http_reqs/s` | `≥ 20 TPS` | `73.18/s` |

La prueba alcanzó `73.18 req/s`, más de 3.5 veces el objetivo mínimo. Desde capacidad bruta de procesamiento, el sistema responde bien.

**Veredicto:** ✅ cumple con holgura.

### 2. Latencia

| Perspectiva | avg | med | p(90) | p(95) | max |
|---|---|---|---|---|---|
| **Global** (`http_req_duration`) | `861.68 ms` | `613.42 ms` | `1.28 s` | `1.57 s` | `29.93 s` |
| **Solo exitosas** (`expected_response:true`) | `735.84 ms` | `600.7 ms` | `1.22 s` | `1.42 s` | `26.72 s` |

La latencia global muestra un promedio de `861.68 ms` con mediana en `613.42 ms`. Que el promedio supere la mediana es el comportamiento esperado de una distribución sesgada a la derecha: los outliers severos (hasta `29.93 s`) tiran del promedio hacia arriba, mientras la mediana resiste. No es una irregularidad — es la firma estadística de una cola pesada.

La métrica crítica no es el promedio sino el percentil alto. Un sistema puede tener un promedio aceptable mientras castiga a una fracción relevante de usuarios con tiempos inaceptables.

**Lectura clave:** las respuestas exitosas cumplen el umbral de `1.5 s` en p(95). La latencia global lo excede porque incluye respuestas fallidas que tardaron más (timeouts parciales, errores del servidor con retardo). Esto no exculpa al sistema — las respuestas fallidas siguen siendo experiencia de usuario — pero matiza significativamente el veredicto.

**Veredicto:**

- Latencia global p(95): ❌ no cumple (`1.57 s > 1.5 s`).
- Latencia de respuestas exitosas p(95): ✅ cumple (`1.42 s < 1.5 s`).

### 3. Tasa de error

| Métrica | Objetivo | Resultado |
|---|---|---|
| `http_req_failed` | `< 3%` | `2.44%` |

El valor queda por debajo del máximo, pero a `0.56` puntos porcentuales del límite. No es margen para presumir estabilidad.

**Veredicto:** ⚠️ cumple, pero sin holgura.

### 4. Checks funcionales

| Métrica | Objetivo | Resultado |
|---|---|---|
| `checks` | `> 97%` | `97.55%` |

Hubo `6,759` validaciones fallidas de `276,650` totales. El porcentaje coincide exactamente con la tasa de `http_req_failed`, lo que indica que los checks fallan cuando y solo cuando la petición HTTP falla. No hay errores funcionales silenciosos en las respuestas exitosas.

**Veredicto:** ✅ cumple.

### 5. Desglose de duración y modelo de ejecución

#### ¿Dónde se gasta el tiempo?

| Componente | avg | % del total |
|---|---|---|
| `http_req_waiting` (TTFB) | `861.21 ms` | `~99.95%` |
| `http_req_receiving` | `424.03 µs` | `~0.05%` |
| `http_req_sending` | `43.22 µs` | `~0.005%` |

La latencia es **completamente dominada por el backend**. La red, el envío y la recepción son despreciables. Cualquier mejora de latencia requiere actuar sobre el servidor, no sobre el cliente ni la red.

#### Conexiones y TLS

`http_req_blocked` y `http_req_connecting` muestran medianas de `0 s` y promedios de microsegundos. Esto indica **reutilización efectiva de conexiones TCP/TLS**: k6 no abrió conexiones nuevas por cada request, lo cual es correcto y esperado con keep-alive.

#### Modelo de ejecución inferido

La presencia de contadores custom por etapa (`stage_0`, `stage_1`, `stage_2`) y el patrón de VUs en el diagrama (rampa de subida → meseta → rampa de bajada) indican un executor tipo **`ramping-vus`** o **`ramping-arrival-rate`** con tres etapas definidas.

El hecho de que `iterations` = `http_reqs` = `276,650` sugiere una iteración = un request, sin lógica adicional por ciclo de VU más allá de la petición y un probable `sleep()` para think time. Esto es consistente con `iteration_duration avg = 1.86 s` frente a `http_req_duration avg = 861.68 ms` — la diferencia de ~1 s apunta a un `sleep(1)` entre iteraciones.

No se reportó `dropped_iterations` en el resumen, lo que sugiere que el generador de carga pudo sostener el ritmo pedido sin descartar iteraciones.

---

## Análisis del diagrama VUs vs requests por segundo

La gráfica sugiere tres fases:

| Fase | VUs | req/s | Comportamiento |
|---|---|---|---|
| **Ramp-up** (`stage_0`) | `0 → ~140` | Creciente | Calentamiento progresivo |
| **Carga sostenida** (`stage_1`) | `~120–140` | `~70–75` | Meseta con caída intermedia |
| **Ramp-down** (`stage_2`) | `~140 → 2` | Decreciente | Descarga gradual |

### Lectura técnica

- **No hubo colapso total.** Mientras los VUs se mantuvieron altos, el throughput siguió activo.
- **La caída intermedia es la señal más relevante.** Indica un episodio transitorio de degradación compatible con: saturación del pool de conexiones del backend, timeouts en cascada, rate limiting, reinicios parciales o garbage collection agresivo.
- **La recuperación posterior refuerza que es intermitente**, no una caída definitiva. El servicio se degrada bajo presión sostenida pero no muere.
- **La distribución de errores por etapa lo confirma**: `stage_1` concentra el `99.96%` de los fallos (6,756 de 6,759). El sistema soporta el ramp-up inicial pero se deteriora cuando la presión se mantiene.

---

## Hallazgos

### Críticos

1. **Latencia global p(95) fuera de umbral.** `1.57 s` excede el límite de `1.5 s`. Sin embargo, las respuestas exitosas cumplen (`1.42 s`), lo que revela que el incumplimiento está causado por las respuestas fallidas, no por degradación general del tiempo de respuesta funcional.

2. **Concentración masiva de errores 5xx en `stage_1`.** `5,987` errores de servidor en la etapa de carga sostenida. Esto no es ruido — es el backend saturándose bajo presión prolongada.

3. **Outliers extremos (max = 29.93 s).** Indica que algunos requests experimentaron timeouts casi completos. Estos arrastran el promedio y son la razón principal de la divergencia entre avg y mediana.

### Informativos

4. **Throughput ampliamente superior al objetivo.** `73.18 req/s` sobre un mínimo de `20 TPS`. El sistema no tiene problema de capacidad bruta.

5. **Latencia dominada por el backend.** `http_req_waiting` representa el `~99.95%` del tiempo total. La red no es factor.

6. **Reutilización de conexiones TCP/TLS activa.** `http_req_blocked` y `http_req_connecting` near-zero en medianas y percentiles altos.

7. **Checks alineados con errores HTTP.** No hay errores funcionales silenciosos: las respuestas exitosas pasan todos los checks.

### Pendientes de investigación

8. **769 errores HTTP 4xx en `stage_1`.** ¿Son throttling (429)? ¿Autenticación caducada (401)? ¿Datos de entrada rechazados (400)? Sin el desglose por código específico, no se puede distinguir entre un problema del cliente y una defensa del servidor.

9. **Causa raíz de la caída intermedia en el diagrama.** ¿Coincide temporalmente con un pico de errores 5xx? ¿Con un reinicio del servicio? Sin métricas del lado servidor ni logs, queda como hipótesis.

10. **Timeout máximo de ~30 s.** El `max = 29.93 s` sugiere que algún timeout (del backend, del proxy o de k6) está fijado en ~30 s y algunas peticiones lo agotan por completo.

---

## Conclusiones

La prueba demuestra que el sistema puede procesar un volumen elevado de solicitudes (`73.18 req/s`) y mantener una tasa de error todavía aceptable (`2.44%`). Sin embargo, el panorama de latencia requiere una lectura más fina que el simple "cumple / no cumple":

- **Globalmente**, p(95) = `1.57 s` → no cumple el umbral de `1.5 s`.
- **Para respuestas exitosas**, p(95) = `1.42 s` → sí cumple.

Esa diferencia no es trivial. Dice que el sistema atiende bien a la mayoría de sus usuarios, pero cuando falla, falla lento. Las respuestas erróneas no solo devuelven un status incorrecto: tardan más en hacerlo, penalizando la métrica global.

El sistema no está colapsado. Tampoco está fino. Presenta degradación bajo presión sostenida, concentrada en la etapa de carga máxima, con recuperación posterior. En una evaluación técnica honesta: **capacidad aceptable, estabilidad parcial, latencia global insuficiente en p(95), pero latencia funcional dentro del umbral**.

---

## Recomendaciones

### Inmediatas (vinculadas a hallazgos)

1. **Desglosar los 769 errores 4xx por código HTTP exacto** (¿401? ¿429? ¿400?). Si son `429 Too Many Requests`, el SUT tiene rate limiting y la prueba está chocando contra él. Si son `401`, hay un problema de autenticación bajo carga. Si son `400`, los datos de prueba tienen inconsistencias. Cada caso tiene una acción diferente.

2. **Correlacionar temporalmente la caída intermedia del diagrama con métricas del servidor** (CPU, memoria, pool de conexiones, logs de errores). El patrón de degradación + recuperación es típico de saturación de recursos con auto-recuperación, pero sin datos del servidor es especulación.

3. **Ejecutar al menos tres corridas en condiciones comparables** para determinar si la degradación es reproducible o fue un evento aislado. Una sola corrida no es evidencia de tendencia.

### De diseño

4. **Definir con precisión qué métrica de latencia es el SLA.** ¿Aplica p(95) global (incluye todo) o p(95) de respuestas exitosas (`{ expected_response:true }`)? La respuesta cambia el veredicto. En la industria, lo habitual es medir sobre respuestas exitosas, pero debe declararse.

5. **Evaluar si `http_req_duration` global o `{ expected_response:true }` es la métrica de referencia.** k6 las calcula por separado por diseño. Si se elige la global, los errores con alta latencia siempre penalizarán el percentil. Si se elige la filtrada, se mide la experiencia funcional real.

### Exploratorias

6. **Ejecutar una prueba de estrés incremental** (subir la tasa gradualmente: 80, 90, 100 req/s) para identificar el punto de quiebre real del sistema. El techo de rendimiento no se encontró con esta corrida — el sistema se degradó pero no colapsó.

7. **Revisar la configuración de timeouts del SUT y de k6.** El `max = 29.93 s` sugiere que algún timeout está fijado en ~30 s y algunas peticiones lo agotan. Reducir ese timeout podría mejorar la experiencia percibida y liberar recursos del pool de conexiones antes.

---

## Veredicto final

| Criterio | Resultado | Cumple |
|---|---|---|
| Throughput ≥ 20 TPS | `73.18 req/s` | ✅ |
| Error rate < 3% | `2.44%` | ⚠️ |
| p(95) global < 1.5 s | `1.57 s` | ❌ |
| p(95) exitosas < 1.5 s | `1.42 s` | ✅ |

**Conclusión directa:** si el criterio es p(95) global, la prueba no pasa. Si el criterio es p(95) de respuestas exitosas, sí pasa. La diferencia la causan respuestas fallidas con alta latencia, no degradación funcional del servicio para usuarios atendidos correctamente.

- Con interpretación estricta: **no cumple en latencia global**.
- Con interpretación matizada: **cumple condicionalmente**, con un problema claro de estabilidad bajo carga sostenida que debe investigarse.