module.exports = {
  apps: [
    {
      name: "traders-rewards",
      script: "node_modules/next/dist/bin/next",
      args: "dev",
      cwd: "C:\\Users\\vince\\traders-rewards",
      watch: false,
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: "development",
      },
    },
  ],
};
