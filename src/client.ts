import { GatewayRegistrationResult } from '../dist/types/GatewayRegistrationResult';

export class Client {

  private token: string;

  /**
   * @param {string} token AWS Cognito Identity token
   */
  constructor(token: string) {
    this.token = token;
  }

  registerGateway(tenantId: string): Promise<GatewayRegistrationResult> {
    return Promise.reject(new Error('Not implemented.'));
  }
}
