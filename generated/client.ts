import { TenantsList } from "./types/TenantsList";
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
    protected token: string;
    protected endpoint: string;
    /**
     * @param {string} token AWS Cognito Identity token
     * @param {string} endpoint API endpoint
     */
    constructor(token: string, endpoint: string = "https://hnmr2uba55.execute-api.us-east-1.amazonaws.com/dev") {
        this.token = token;
        this.endpoint = endpoint;
    }
    protected async request(method: string, path: string, queryString: QueryString = {}, body?: any, headers: Headers = { "Accept": "application/json" }): Promise<any> {
        const res: Response = await fetch(`${this.endpoint.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}${toQueryString(queryString)}`, {
            method, headers: {
                ...headers, Authorization: `Bearer ${this.token}`, "X-nRFCloud-API-Version": Client.apiVersion, "X-nRFCloud-API-Client": "@nrfcloud/api-client-javascript",
            }, body: body ? JSON.stringify(body) : undefined,
        });
        const contentType: string = res.headers.get("content-type") || "", mediaType: string = contentType.split(";")[0];
        if (headers.Accept.indexOf(mediaType) < 0)
            throw new TypeError(`The content-type "${contentType}" of the response does not match accepted media-type ${headers.Accept}`);
        if (/^application\/([^ \/]+\+)?json$/.test(mediaType) === false)
            throw new TypeError(`The content-type "${contentType}" of the response is not JSON!`);
        const status: number = res.status;
        const contentLength: number = +(res.headers.get("content-length") || 0);
        if (status >= 400) {
            if (contentLength) {
                const json: any = await res.json();
                if (json.$context === HttpProblem.$context.toString())
                    throw HttpProblem.fromJSON(json);
                else
                    throw new ApplicationError(JSON.stringify(json));
            }
            throw new ApplicationError(`Response status code was ${status}, but not response was returned.`);
        }
        if (contentLength)
            return await res.json();
    }
    /**
     * Fetch user's tenant
     *
     * Returns the tenants for a user (and creating them if they do not exist)
     * Sends a POST request to /tenants
     *
     * Returns:
     * - for status 200
     *   a TenantsList as application/json
     *   (The tenants for the authenticated user)
     * - for status 201
     *   a TenantsList as application/json
     *   (A list with the the tenant which was just created.)
     * - for status 400
     *   a HttpProblem as application/json
     *   (The supplied request data was invalid. Check the response body for details.)
     * - for status 404
     *   a HttpProblem as application/json
     *   (An entity was not found. Check the response body for details.)
     * - for status 500
     *   a HttpProblem as application/json
     *   (An internal error occurred. Check the response body for details.)
     *
     * @param {string} create (query parameter) Set this parameter to `true` to create a new tenant if no tenant exists for the authenticated user
     * @throws {TypeError} if the response could not be parsed
     * @throws {HttpProblem} if the backend returned an error
     * @throws {ApplicationError} if the response was an error, but not a HttpProblem
     */
    async listTenants(create?: string): Promise<TenantsList> {
        let path: string = "tenants";
        return this.request("POST", path, { create }, undefined, { Accept: "application/json" });
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
     *   (The certificate for the newly created gateway)
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
     * @param {string} tenantId required (path parameter) Id of the tenant to register the gateway for
     * @throws {TypeError} if the response could not be parsed
     * @throws {HttpProblem} if the backend returned an error
     * @throws {ApplicationError} if the response was an error, but not a HttpProblem
     */
    async registerGateway(tenantId: string): Promise<GatewayRegistrationResult> {
        let path: string = "tenants/{tenantId}/gateways";
        path = path.replace("{tenantId}", tenantId);
        return this.request("POST", path, {}, undefined, { Accept: "application/json" });
    }
}
export type QueryString = {
    [index: string]: string | undefined;
};
export type Headers = {
    [index: string]: string;
};
export const toQueryString = (obj: {
    [index: string]: string | undefined;
}): string => Object.keys(obj).filter(key => obj[key]).reduce((queryString, key, i) => {
    let delimiter, value;
    delimiter = (i === 0) ? "?" : "&";
    key = encodeURIComponent(key);
    value = encodeURIComponent(`${obj[key]}`);
    return [queryString, delimiter, key, "=", value].join("");
}, "");