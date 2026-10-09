import express from 'express';
import path from 'path';
import { getAllTraceSummaries } from './xray';
import { normalizePath, extractService, extractEnvironment, percentile, Environment } from './normalize';

const app = express();
app.use(express.static(path.join(__dirname, '../frontend')));

interface EndpointBucket {
  method: string;
  path: string;
  service: string;
  durations: number[];
  errorCount: number;
}

const VALID_ENVS: Environment[] = ['prod', 'stage', 'dev'];

app.get('/api/traces', async (req, res) => {
  const env = (req.query.env as string) ?? 'dev';
  if (!VALID_ENVS.includes(env as Environment)) {
    res.status(400).json({ error: `Invalid env. Must be one of: ${VALID_ENVS.join(', ')}` });
    return;
  }

  try {
    const end = new Date();
    const start = new Date(end.getTime() - 5 * 60 * 1000);

    const allTraces = await getAllTraceSummaries(start, end);
    // Filter to the requested environment
    const rawTraces = allTraces.filter(
      (t) => extractEnvironment(t.Http!.HttpURL!) === env,
    );

    const endpointMap = new Map<string, EndpointBucket>();
    const allTracePoints: Array<{
      method: string;
      url: string;
      service: string;
      durationMs: number;
      statusCode: number;
      timestamp: string;
    }> = [];
    let errorCount = 0;

    for (const trace of rawTraces) {
      const rawUrl = trace.Http!.HttpURL!;
      const method = (trace.Http?.HttpMethod ?? 'UNKNOWN').toUpperCase();
      const status = trace.Http?.HttpStatus ?? 0;
      // X-Ray returns float seconds — convert to ms
      const durationMs = Math.round((trace.ResponseTime ?? trace.Duration ?? 0) * 1000);
      const normalPath = normalizePath(rawUrl);
      const service = extractService(rawUrl);
      const isError = !!(trace.HasFault || trace.HasError || status >= 400);

      if (isError) errorCount++;

      const key = `${method}:${normalPath}`;
      let ep = endpointMap.get(key);
      if (!ep) {
        ep = { method, path: normalPath, service, durations: [], errorCount: 0 };
        endpointMap.set(key, ep);
      }
      ep.durations.push(durationMs);
      if (isError) ep.errorCount++;

      allTracePoints.push({
        method,
        url: normalPath,
        service,
        durationMs,
        statusCode: status,
        timestamp: trace.StartTime?.toISOString() ?? end.toISOString(),
      });
    }

    // Sort by time desc, cap at 500 for scatter
    allTracePoints.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const recentTraces = allTracePoints.slice(0, 500);

    // Top 10 slowest for the list panel
    const slowestTraces = [...allTracePoints]
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, 10);

    // Endpoints sorted by P95 desc
    const endpoints = Array.from(endpointMap.values())
      .map((ep) => ({
        method: ep.method,
        path: ep.path,
        service: ep.service,
        count: ep.durations.length,
        errorCount: ep.errorCount,
        errorRate: ep.durations.length > 0 ? ep.errorCount / ep.durations.length : 0,
        p50Ms: percentile(ep.durations, 50),
        p95Ms: percentile(ep.durations, 95),
        p99Ms: percentile(ep.durations, 99),
      }))
      .sort((a, b) => b.p95Ms - a.p95Ms);

    // Histogram buckets
    const histogram = [
      { label: '<100ms',    count: 0 },
      { label: '100-500ms', count: 0 },
      { label: '500ms-1s',  count: 0 },
      { label: '1-2s',      count: 0 },
      { label: '>2s',       count: 0 },
    ];
    for (const t of allTracePoints) {
      if      (t.durationMs < 100)  histogram[0].count++;
      else if (t.durationMs < 500)  histogram[1].count++;
      else if (t.durationMs < 1000) histogram[2].count++;
      else if (t.durationMs < 2000) histogram[3].count++;
      else                          histogram[4].count++;
    }

    // Global P95 across all traces
    const allDurations = allTracePoints.map((t) => t.durationMs);
    const globalP95 = percentile(allDurations, 95);
    const globalAvg = allDurations.length > 0
      ? Math.round(allDurations.reduce((s, v) => s + v, 0) / allDurations.length)
      : 0;

    res.json({
      timestamp: end.toISOString(),
      environment: env,
      windowMinutes: 5,
      totalTraces: rawTraces.length,
      errorCount,
      globalAvgMs: globalAvg,
      globalP95Ms: globalP95,
      endpoints,
      recentTraces,
      slowestTraces,
      histogram,
    });
  } catch (err) {
    console.error('Error fetching traces:', err);
    res.status(500).json({
      error: 'Failed to fetch traces',
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

const PORT = parseInt(process.env.PORT ?? '3000', 10);
app.listen(PORT, () => console.log(`Dashboard: http://localhost:${PORT}/traces.html`));
