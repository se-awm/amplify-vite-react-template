const DeploymentRollback = require('./rollback');

async function deploy() {
    const rollback = new DeploymentRollback({
        healthCheckEndpoint: 'https://your-api-endpoint/health',
        slackWebhook: process.env.SLACK_WEBHOOK_URL
    });

    try {
        await rollback.initialize();
        await rollback.createDeploymentBackup();
        
        // Your deployment commands here
        execSync('npm run build');
        execSync('amplify push');
        
        // Verify deployment
        const isHealthy = await rollback.performHealthCheck();
        if (!isHealthy) {
            throw new Error('Deployment health check failed');
        }
        
        await rollback.cleanup();
        
    } catch (error) {
        console.error('Deployment failed:', error);
        await rollback.rollback();
    }
}

deploy().catch(console.error);