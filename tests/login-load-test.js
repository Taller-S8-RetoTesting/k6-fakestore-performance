import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';
import exec from 'k6/execution';

/*
Supuestos de la prueba:
1) Interpretamos "tiempo maximo 1.5s" como p(95) < 1500 ms para controlar cola de latencia.
2) En modelo abierto, cada iteracion iniciada equivale a 1 transaccion (TPS) objetivo.
3) No se agrega think time para medir throughput puro del endpoint.
*/

const credentials = new SharedArray('credentials', function () {
  const csvRaw = open('../data/credentials.csv');
  const parsed = papaparse.parse(csvRaw, {
    header: true,
    skipEmptyLines: true,
  });

  // Fallar temprano evita ejecutar una carga invalida con dataset vacio o mal formado.
  if (parsed.errors && parsed.errors.length > 0) {
    throw new Error(`Error parseando credentials.csv: ${JSON.stringify(parsed.errors)}`);
  }

  if (!parsed.data || parsed.data.length === 0) {
    throw new Error('No se encontraron credenciales en ../data/credentials.csv');
  }

  return parsed.data.map((row, index) => {
    const user = String(row.user ?? '').trim();
    const passwd = String(row.passwd ?? '').trim();

    if (!user || !passwd) {
      throw new Error(`La fila ${index + 2} del CSV no tiene user/passwd validos`);
    }

    return { user, passwd };
  });
});

function readNumberEnv(name, fallback) {
  const value = Number(__ENV[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readExpectedStatuses() {
  const rawValue = __ENV.LOGIN_EXPECTED_STATUSES || '201';

  return rawValue
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value >= 100 && value <= 599);
}

const BASE_URL = __ENV.BASE_URL || 'https://fakestoreapi.com';
const RATE = readNumberEnv('LOGIN_RATE', 20);
const DURATION = __ENV.LOGIN_DURATION || '5m';
const PRE_ALLOC_VUS = readNumberEnv('LOGIN_PRE_ALLOC_VUS', 30);
const MAX_VUS = readNumberEnv('LOGIN_MAX_VUS', 100);
const EXPECTED_STATUSES = readExpectedStatuses();

export const options = {
  scenarios: {
    login_load: {
      // Modelo abierto: fija llegadas por segundo y desacopla carga de la latencia de cada request.
      executor: 'constant-arrival-rate',
      rate: RATE,
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: PRE_ALLOC_VUS,
      maxVUs: MAX_VUS,
      gracefulStop: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.03'],
    http_req_duration: ['p(95)<1500'],
    checks: ['rate>0.97'],
  },
};

export default function () {
  const index = exec.scenario.iterationInTest % credentials.length;
  const credential = credentials[index];

  const payload = JSON.stringify({
    username: credential.user,
    password: credential.passwd,
  });

  const response = http.post(`${BASE_URL}/auth/login`, payload, {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: {
      name: 'login',
      type: 'auth',
    },
  });

  let jsonBody;
  try {
    jsonBody = response.json();
  } catch (e) {
    jsonBody = null;
  }

  check(response, {
    'status is expected': (r) => EXPECTED_STATUSES.includes(r.status),
    'response body exists': (r) => r.body && r.body.length > 0,
    'response contains token': () => !!(jsonBody && jsonBody.token),
  });
}
