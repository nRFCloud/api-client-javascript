import { GatewayRegistrationResult } from "./types/GatewayRegistrationResult";
import { HttpProblem } from "@nrfcloud/models";
export class Client {
    private token: string;
    private endpoint: string;
    /**
     * @param {string} token AWS Cognito Identity token
     * @param {string} endpoint API endpoint
     */
    constructor(token: string, endpoint: string = "https://hnmr2uba55.execute-api.us-east-1.amazonaws.com/prod") {
        this.token = token;
        this.endpoint = endpoint;
    }
    private async request(method: string, path: string, body?: any): Promise<any> {
        const res: Response = await fetch(`${this.endpoint}/${path}`, {
            method,
            headers: {
                Authorization: this.token
            },
            body: body ? JSON.stringify(body) : undefined
        });
        const json: any = await res.json();
        if (res.status >= 400)
            throw HttpProblem.fromJSON(json);
        return json;
    }
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
    async registerGateway(tenantId: string): Promise<GatewayRegistrationResult> {
        let path: string = "tenants/{tenantId}/gateways";
        path = path.replace("{tenantId}", tenantId);
        return this.request("POST", path);
    }
}