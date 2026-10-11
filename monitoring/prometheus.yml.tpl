global:
  scrape_interval: 15s
scrape_configs:
  - job_name: voicecraft-backend
    scheme: https
    metrics_path: /metrics
    static_configs:
      - targets: ["${APP_HOST}:443"]