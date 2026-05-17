module.exports = {
  apps: [
    {
      name: 'medcert-premium',
      script: 'server/index.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      env: {
        NODE_ENV: 'production',
        PORT: 5174
      },
      // Production optimizations
      instances: 1, // Single instance is enough for a static wrapper, set to 'max' for heavy APIs
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '300M',
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true
    }
  ]
};
