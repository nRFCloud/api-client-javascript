import { GatewayRegistrationResult } from "./types/GatewayRegistrationResult";
export declare class Client {
    private token;
    private endpoint;
    /**
     * @param {string} token AWS Cognito Identity token
     * @param {string} endpoint API endpoint
     */
    constructor(token: string, endpoint?: string);
    private request(method, path, body?);
    /**
     * Register new Gateway
     *
     * Registers a new Gateway and returns the certificate
     * Sends a POST request to /tenants/{tenantId}/gateways
     *
     * Returns:
     * - for status 200 a GatewayRegistrationResult (The certificate for the newly create gateway)
     * - for status 400 a HttpProblem (The supplied request data was invalid. Check the response body for details.)
     * - for status 403 a HttpProblem (Access was denied. Check the response body for details.)
     * - for status 500 a HttpProblem (An internal error occurred. Check the response body for details.)
     *
     * @param {string} tenantId required path parameter
     */
    registerGateway(tenantId: string): Promise<GatewayRegistrationResult>;
}
