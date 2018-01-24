import { GatewayRegistrationResult } from "./types/GatewayRegistrationResult";
import { HttpProblem, ApplicationError } from "@nrfcloud/models";
/**
 * API Client for the nRF Cloud REST API
 *
 * This client has been auto-generated for version 1.0.0-preview.1 of the API definition.
 *
 * @see https://github.com/nRFCloud/api-client-javascript#readme
 * @author Nordic Semiconductor ASA | nordicsemi.no
 */
export class Client {
    static apiVersion: string = "1.0.0-preview.1";
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
    private async request(method: string, path: string, body?: any, headers: {
            [index: string]: string;
        } = { "Accept": "application/json" }): Promise<any> {
        const res: Response = await fetch(`${this.endpoint}/${path}`, {
            method,
            headers: {
                ...headers,
                Authorization: this.token,
                "X-API-Version": Client.apiVersion,
                "X-API-Client": "@nrfcloud/api-client-javascript"
            },
            body: body ? JSON.stringify(body) : undefined
        });
        const contentType: string = res.headers.get("content-type") || "", mediaType: string = contentType.split(";")[0];
        if (headers.Accept.indexOf(mediaType) < 0)
            throw new TypeError(`The content-type "${contentType}" of the response does not match accepted media-type ${headers.Accept}`);
        if (/^application\/([^ \/]+\+)?json$/.test(mediaType) === false)
            throw new TypeError(`The content-type "${contentType}" of the response is not JSON!`);
        const json: any = await res.json();
        if (res.status >= 400)
            if (json.$context === HttpProblem.$context.toString())
                throw HttpProblem.fromJSON(json);
            else
                throw new ApplicationError(JSON.stringify(json));
        return json;
    }
    /**
     * Register new Gateway
     *
     * Registers a new Gateway and returns the certificate
     * Sends a POST request to /tenants/{tenantId}/gateways
     *
     * Returns:
     * - for status 201
     *   a GatewayRegistrationResult as application/json
     *   (The certificate for the newly create gateway)
     * - for status 400
     *   a HttpProblem as application/json
     *   (The supplied request data was invalid. Check the response body for details.)
     * - for status 403
     *   a HttpProblem as application/json
     *   (Access was denied. Check the response body for details.)
     * - for status 500
     *   a HttpProblem as application/json
     *   (An internal error occurred. Check the response body for details.)
     *
     * @param {string} tenantId required path parameter
     * @throws {TypeError} if the response could not be parsed
     * @throws {HttpProblem} if the backend returned an error
     * @throws {ApplicationError} if the response was an error, but not a HttpProblem
     */
    async registerGateway(tenantId: string): Promise<GatewayRegistrationResult> {
        let path: string = "tenants/{tenantId}/gateways";
        path = path.replace("{tenantId}", tenantId);
        return this.request("POST", path, undefined, { Accept: "application/json" });
    }
}