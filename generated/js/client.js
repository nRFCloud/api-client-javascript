"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("@nrfcloud/models");
class Client {
    /**
     * @param {string} token AWS Cognito Identity token
     * @param {string} endpoint API endpoint
     */
    constructor(token, endpoint = "https://hnmr2uba55.execute-api.us-east-1.amazonaws.com/prod") {
        this.token = token;
        this.endpoint = endpoint;
    }
    request(method, path, body) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield fetch(`${this.endpoint}/${path}`, {
                method,
                headers: {
                    Authorization: this.token
                },
                body: body ? JSON.stringify(body) : undefined
            });
            const json = yield res.json();
            if (res.status >= 400)
                throw models_1.HttpProblem.fromJSON(json);
            return json;
        });
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
    registerGateway(tenantId) {
        return __awaiter(this, void 0, void 0, function* () {
            let path = "tenants/{tenantId}/gateways";
            path = path.replace("{tenantId}", tenantId);
            return this.request("POST", path);
        });
    }
}
exports.Client = Client;
