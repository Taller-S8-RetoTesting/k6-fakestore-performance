# README - Ejecución del ejercicio con k6

Este proyecto ejecuta una prueba de carga sobre `POST https://fakestoreapi.com/auth/login` usando Grafana k6 y credenciales parametrizadas desde un archivo CSV.

## Versiones usadas

| Herramienta | Versión |
|---|---|
| k6 | `v1.7.0` |
| Sistema operativo validado | `Windows` |

> k6 es un binario standalone. No se requiere Node.js.

## Archivos necesarios

- `tests/login-load-test.js`: script principal de la prueba.
- `data/credentials.csv`: datos de entrada con las columnas `user,passwd`.
- `CONCLUSIONES.md`: hallazgos de la ejecución validada.

## Paso a paso

1. Ubicarse en la raíz del proyecto.

2. Verificar que k6 esté instalado.

```bash
k6 version
```

3. Confirmar que exista el archivo `data/credentials.csv` con las columnas `user,passwd`.

4. Ejecutar la prueba con la configuración base del ejercicio.

```bash
k6 run tests/login-load-test.js
```

5. Ejecutar la corrida validada para esta entrega.

```bash
k6 run -e LOGIN_RATE=25 -e LOGIN_DURATION=3m tests/login-load-test.js
```

6. Revisar en la salida de consola estas métricas:

- `iterations` o `http_reqs` para confirmar el throughput.
- `http_req_duration` para validar `p(95) < 1500 ms`.
- `http_req_failed` para validar un error rate `< 3%`.
- `checks` para confirmar las validaciones funcionales.
- `dropped_iterations` para comprobar que k6 pudo sostener la tasa pedida.

7. Consultar `CONCLUSIONES.md` para ver el análisis de la ejecución validada.

## Variables de entorno disponibles

| Variable | Valor por defecto | Uso |
|---|---|---|
| `BASE_URL` | `https://fakestoreapi.com` | URL base de la API |
| `LOGIN_RATE` | `20` | Iteraciones por segundo |
| `LOGIN_DURATION` | `5m` | Duración de la prueba |
| `LOGIN_PRE_ALLOC_VUS` | `30` | VUs preasignados |
| `LOGIN_MAX_VUS` | `100` | VUs máximos |
| `LOGIN_EXPECTED_STATUSES` | `201` | Status HTTP válidos separados por coma |

## Advertencia importante sobre configuración

No uses variables personalizadas con prefijo `K6_` para parametrizar este script.

k6 reserva ese prefijo para su propia configuración interna y puede sobrescribir el escenario definido en `options`. En este proyecto se usan variables `LOGIN_*` precisamente para evitar esa colisión.

## Criterios de aceptación implementados

- `http_req_failed < 3%`
- `http_req_duration p(95) < 1500 ms`
- `checks > 97%`

## Notas de ejecución

- Para este ejercicio se asumió que el límite de `1.5 segundos` corresponde a `p(95) < 1500 ms`, no a un máximo absoluto por request.
- La API evaluada es pública, por lo tanto los resultados pueden variar entre corridas.
- Actualmente, el endpoint responde `201` cuando el login es exitoso; por eso el script valida ese status por defecto.
