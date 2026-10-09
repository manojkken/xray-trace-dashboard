import { XRayClient, GetTraceSummariesCommand, TraceSummary } from '@aws-sdk/client-xray';

const xrayClient = new XRayClient({});

const MAX_PAGES = 20;

export async function getAllTraceSummaries(startTime: Date, endTime: Date): Promise<TraceSummary[]> {
  const summaries: TraceSummary[] = [];
  let nextToken: string | undefined;
  let pages = 0;

  do {
    const response = await xrayClient.send(
      new GetTraceSummariesCommand({
        StartTime: startTime,
        EndTime: endTime,
        TimeRangeType: 'Event',
        Sampling: false,
        NextToken: nextToken,
      }),
    );

    for (const summary of response.TraceSummaries ?? []) {
      // Skip traces with no HTTP data (background jobs, SQS consumers, etc.)
      if (!summary.Http?.HttpURL) continue;
      summaries.push(summary);
    }

    nextToken = response.NextToken;
    pages++;
  } while (nextToken && pages < MAX_PAGES);

  return summaries;
}
