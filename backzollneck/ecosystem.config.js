module.exports = {
  apps : [{
    name: 'backzollneck',
    script: './dist/main.js',
    env: {
      JWT_SECRET: process.env.JWT_SECRET,
      DB_PASSWORD: process.env.DB_PASSWORD,
    }
  }]
};
