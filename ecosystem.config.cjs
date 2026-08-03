module.exports = {
  apps: [
    {
      name: 'whatsapp-bot',
      script: 'src/index.js',
      cwd: './bot',
      interpreter: 'node',
      // PRD 0.4: fork mode único — solo una conexión por sesión de WhatsApp
      exec_mode: 'fork',
      instances: 1,
      // Reinicio automático ante caídas
      autorestart: true,
      watch: false,
      max_restarts: 20,
      restart_delay: 5000,
      // Backoff exponencial ante fallos repetidos (delegado también al index.js)
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: 'production',
      },
      // Node 20+ no requiere --experimental-vm-modules para ESM
      node_args: '--env-file=.env',
      error_file: './logs/bot-error.log',
      out_file: './logs/bot-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '512M',
    },
  ],
};
