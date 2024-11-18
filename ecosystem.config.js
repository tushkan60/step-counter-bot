module.exports = {
    apps: [
        {
            name: 'steps-bot',
            // Update script path to absolute path
            script: '/var/www/step-counter-bot/dist/server.js',
            watch: false,
            // Update env file path to absolute path
            env_file: '/var/www/step-counter-bot/.env',
            // Set working directory
            cwd: '/var/www/step-counter-bot',
            exp_backoff_restart_delay: 100,
            max_memory_restart: '300M',
            // Update log paths
            error_file: "/var/www/step-counter-bot/logs/error.log",
            out_file: "/var/www/step-counter-bot/logs/out.log"
        }
    ]
};