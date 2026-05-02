import { OpenFgaClient } from '@openfga/sdk';
import { env } from '~/env';

// Base options configured from environment vars
const fgaClientOptions: any = {
  apiUrl: env.FGA_API_URL,
};

// Inject the specific Store ID
if (env.FGA_STORE_ID) {
  fgaClientOptions.storeId = env.FGA_STORE_ID;
}

// Ensure the client targets the specific authorization model snapshot
if (env.FGA_AUTHORIZATION_MODEL_ID) {
  fgaClientOptions.authorizationModelId = env.FGA_AUTHORIZATION_MODEL_ID;
}

// Export the singleton instance to be used across the application
export const fgaClient = new OpenFgaClient(fgaClientOptions);
