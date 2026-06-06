module.exports = {
  apps: [{
    name: 'ai-interviewer',
    cwd: '/home/ubuntu/AI_interviewer',
    script: 'npm',
    args: 'start -- -p 3001',
    env: {
      NODE_ENV: 'production',
    },
  }]
};
