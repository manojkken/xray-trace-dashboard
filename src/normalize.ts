export function normalizePath(rawUrl: string): string {
  let pathname: string;
  try {
    pathname = new URL(rawUrl).pathname;
  } catch {
    pathname = rawUrl.split('?')[0];
  }

  // Replace UUIDs
  pathname = pathname.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    '{id}',
  );

  // Replace standalone 4+ digit numeric segments
  pathname = pathname.replace(/(\/)\d{4,}(\/|$)/g, '$1{id}$2');

  // Strip trailing slash (preserve bare /)
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  return pathname;
}

export type Environment = 'prod' | 'stage' | 'dev' | 'unknown';

// Optional exact-domain override for prod, e.g. "yourcompany.com" — set via env
// for setups where prod hosts don't follow the *.prod.* convention below.
const PROD_DOMAIN_SUFFIX = process.env.PROD_DOMAIN_SUFFIX;

export function extractEnvironment(rawUrl: string): Environment {
  try {
    const hostname = new URL(rawUrl).hostname;
    if (PROD_DOMAIN_SUFFIX && hostname.endsWith(PROD_DOMAIN_SUFFIX)) return 'prod';
    if (hostname.includes('.prod.'))          return 'prod';
    if (hostname.includes('.stage.'))         return 'stage';
    if (hostname.includes('.dev.'))           return 'dev';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

export function extractService(rawUrl: string): string {
  try {
    const hostname = new URL(rawUrl).hostname;
    const firstLabel = hostname.split('.')[0];
    return firstLabel.replace(/-(main|prod|staging|dev)$/, '');
  } catch {
    return 'unknown';
  }
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((p / 100) * (sorted.length - 1))];
}
