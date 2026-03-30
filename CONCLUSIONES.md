# Conclusiones - Prueba de performance del login de Fake Store API

## Resumen de la ejecución validada

Se ejecutó la prueba con el siguiente comando:

```bash
k6 run -e LOGIN_RATE=25 -e LOGIN_DURATION=3m tests/login-load-test.js
```

Configuración usada:

| Parámetro | Valor |
|---|---|
| Endpoint | `POST https://fakestoreapi.com/auth/login` |
| Herramienta | `k6 v1.7.0` |
| Modelo de carga | `constant-arrival-rate` |
| Tasa objetivo | `25 iteraciones/s` |
| Duración | `3 minutos` |
| VUs preasignados | `30` |
| VUs máximos | `100` |
| Status esperado por defecto | `201` |

## Resultados obtenidos

| Métrica | Resultado |
|---|---|
| `iterations` | `4500` |
| `iterations/s` | `24.910213/s` |
| `http_reqs` | `4500` |
| `http_req_duration avg` | `443.25 ms` |
| `http_req_duration p(90)` | `471.10 ms` |
| `http_req_duration p(95)` | `502.07 ms` |
| `http_req_duration max` | `5.2 s` |
| `http_req_failed` | `0.00%` |
| `checks` | `100.00%` |
| `vus` | `min=9, max=21` |

## Evaluación frente al objetivo del taller

| Criterio | Umbral | Resultado | Veredicto |
|---|---|---|---|
| Throughput | `>= 20 TPS` | `24.91 TPS` | Cumple |
| Latencia p(95) | `< 1500 ms` | `502.07 ms` | Cumple |
| Tasa de error | `< 3%` | `0.00%` | Cumple |
| Checks exitosos | `> 97%` | `100.00%` | Cumple |

## Hallazgos

1. La prueba cumplió con holgura el objetivo de throughput. Aunque la configuración pedía `25 iteraciones/s`, el valor observado fue `24.91/s`, que en términos prácticos demuestra que el escenario sostuvo la carga objetivo.
2. La latencia fue estable en los percentiles relevantes. El `p(95)` quedó en `502.07 ms`, muy por debajo del umbral de `1500 ms`.
3. Hubo un outlier de `5.2 s` en el máximo de `http_req_duration`. No afecta el criterio definido porque el umbral se interpretó como `p(95)`, pero sí recuerda que una API pública puede tener picos aislados.
4. No hubo errores HTTP ni fallos funcionales. Los checks de status esperado, presencia de body y presencia de token pasaron al `100%`.
5. La prueba no necesitó escalar cerca del límite superior de VUs. k6 usó entre `9` y `21` VUs, por debajo de los `30` preasignados, lo cual sugiere que la configuración fue suficiente para sostener la tasa pedida sin presión adicional sobre el generador de carga.

## Corrección importante sobre la configuración

Durante la preparación del ejercicio apareció un error de configuración relevante: usar variables de entorno con prefijo `K6_` para parametrizar el script.

Ese prefijo está reservado por k6 para su propia configuración y puede sobrescribir el escenario definido en `options`. Por eso el script final usa variables `LOGIN_*` y no `K6_*`.

## Supuestos y límites del resultado

1. El enunciado decía `máximo 1.5 segundos`, pero no definía la métrica exacta. Se adoptó `p(95) < 1500 ms` como supuesto operativo. Es defendible, pero sigue siendo un supuesto y conviene decirlo sin maquillaje.
2. La API evaluada es pública y compartida. Estos resultados son válidos para esta corrida, no una garantía contractual de comportamiento futuro.
3. Actualmente, el login exitoso responde con status `201`, no `200`. El script fue ajustado para reflejar ese comportamiento real del endpoint.
4. Solo se realizó una corrida validada con esta configuración. Para hablar de tendencia sería mejor ejecutar varias corridas en horarios distintos.
5. No hubo métricas del lado servidor. Se midió exclusivamente desde cliente: latencia, tasa de error, throughput y checks funcionales.

## Transparencia sobre el uso de agentes de IA

Este proyecto se construyó con apoyo de agentes de IA: `Orchestrator`, `Planner`, `Coder` y `Designer`.

El aporte real de esos agentes fue este:

1. Acelerar la descomposición del problema: requisitos del taller, modelo de carga, thresholds y estructura de entregables.
2. Reducir iteraciones tontas en la implementación del script k6, sobre todo en la lectura del CSV, el uso de `SharedArray` y la definición del escenario abierto.
3. Ahorrar tiempo en documentación y orden del repositorio.

También conviene ser honestos con lo obvio:

1. Los agentes no "demuestran" que la solución sirva. Lo que la valida es la ejecución real de k6 y sus métricas.
2. Hubo criterio humano para revisar supuestos, correr la prueba y decidir qué resultados eran sostenibles para documentar.
3. La rapidez fue alta comparada con hacerlo completamente desde cero, pero no reemplaza la necesidad de verificar cada decisión técnica.

Conclusión directa: la IA ayudó a producir más rápido una solución ordenada y reproducible, pero el valor entregable sigue estando en la evidencia empírica y en la capacidad de justificar técnicamente el trabajo.

## Recomendaciones

1. Si se quiere encontrar el punto de quiebre, subir la tasa de manera gradual a `30`, `40` y `50 TPS`.
2. Si se quiere mejor evidencia comparativa, ejecutar al menos tres corridas y consolidar percentiles y desviaciones.
3. Si se quiere mayor solidez para una conversación técnica, agregar una salida resumida con `handleSummary` y conservar evidencia de cada corrida.
