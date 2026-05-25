// Disable default OTLP trace, metric, and log exporters to prevent ECONNREFUSED errors to port 4318
process.env.OTEL_TRACES_EXPORTER = 'none';
process.env.OTEL_METRICS_EXPORTER = 'none';
process.env.OTEL_LOGS_EXPORTER = 'none';

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_DEPLOYMENT_ENVIRONMENT } from '@opentelemetry/semantic-conventions';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

// Suppress noisy OTEL logs during development
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);

const prometheusExporter = new PrometheusExporter({
  port: 9464,
  host: '0.0.0.0', // Explicitly bind to IPv4
});

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [SEMRESATTRS_SERVICE_NAME]: 'ng-vms-backend',
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  }),
  metricReaders: [prometheusExporter],
  // Explicitly disable tracing to prevent OTLP connection errors
  traceExporter: {
    export: (spans, resultCallback) => resultCallback({ code: 0 }),
    shutdown: () => Promise.resolve(),
  },
  instrumentations: [getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-fs': { enabled: false },
    '@opentelemetry/instrumentation-http': {
      ignoreIncomingRequestHook: (req) => {
        // Ignore health checks to reduce listener overhead
        return req.url === '/health' || req.url === '/ping';
      }
    }
  })],
});

export const shutdownTracing = async () => {
  try {
    await sdk.shutdown();
    console.log('OTEL SDK shut down successfully');
  } catch (error) {
    console.log('Error shutting down OTEL SDK', error);
  }
};

export const startOtel = () => {
  sdk.start();
  console.log('AETHER Runtime Intelligence (OTEL) Active at :9464');
};
