import DeploymentRollback from "./rollback.js";
import { execSync } from "child_process";

async function deploy() {
  const rollback = new DeploymentRollback({
    // healthCheckEndpoint: 'https://your-api-endpoint/health',
    // slackWebhook: process.env.SLACK_WEBHOOK_URL
  });

  try {
    await rollback.initialize();
    await rollback.createDeploymentBackup();

    console.log("Starting deployment...");

    execSync("aws sts get-caller-identity --profile non-production", { stdio: 'inherit' });

    // Your deployment commands here
    execSync("npm run build", { stdio: 'inherit' });
    execSync("amplify push --debug", { stdio: 'inherit' });

    // Verify deployment
    const isHealthy = await rollback.performHealthCheck();
    if (!isHealthy) {
      throw new Error("Deployment health check failed");
    }

    await rollback.cleanup();
  } catch (error) {
    console.error("Deployment failed:", error);
    await rollback.rollback();
  }
}

deploy().catch(console.error);
