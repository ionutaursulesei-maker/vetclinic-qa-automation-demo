// k6 load test for the patient API.
// Run locally:   k6 run performance/patients-load.js
// Smoke only:    k6 run -e PROFILE=smoke performance/patients-load.js
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const BASE = __ENV.API_URL || 'https://petstore.swagger.io/v2';
const createLatency = new Trend('patient_create_latency', true);

const profiles = {
  // A few users for a minute – safe against a public demo API.
  smoke: { vus: 2, duration: '30s' },
  // Ramp-up / steady / ramp-down: the shape most load tests start from.
  load: {
    stages: [
      { duration: '30s', target: 5 },
      { duration: '1m', target: 5 },
      { duration: '20s', target: 0 },
    ],
  },
};

export const options = {
  ...profiles[__ENV.PROFILE || 'load'],
  // Thresholds turn the run into pass/fail – this is what gates the pipeline.
  thresholds: {
    http_req_failed: ['rate<0.02'],                  // < 2% errors
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],  // latency budget
    'http_req_duration{name:GET /pet/{id}}': ['p(95)<1000'],
    checks: ['rate>0.98'],
  },
};

export default function () {
  const id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };

  group('register patient', () => {
    const res = http.post(
      `${BASE}/pet`,
      JSON.stringify({ id, name: `k6-${id}`, photoUrls: [], status: 'available', category: { id: 1, name: 'Dog' } }),
      { headers, tags: { name: 'POST /pet' } },
    );
    createLatency.add(res.timings.duration);
    check(res, { 'create 200': (r) => r.status === 200 });
  });

  group('read patient', () => {
    // Tagging with a fixed name groups all ids under one URL in the results.
    const res = http.get(`${BASE}/pet/${id}`, { headers, tags: { name: 'GET /pet/{id}' } });
    check(res, { 'read 200 or eventually-consistent 404': (r) => r.status === 200 || r.status === 404 });
  });

  group('discharge patient', () => {
    const res = http.del(`${BASE}/pet/${id}`, null, { headers, tags: { name: 'DELETE /pet/{id}' } });
    check(res, { 'delete 200/404': (r) => r.status === 200 || r.status === 404 });
  });

  sleep(1); // think time
}
