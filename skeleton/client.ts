/**
 * Skeleton for the API Client for the nRF Cloud REST API
 *
 * This file will be parsed by ../generate-client.ts and augmented with the methods for the endpoints.
 */
import { HttpProblem, ApplicationError } from '@nrfcloud/models';

export type QueryString = { [index: string]: string | undefined; }
export type Headers = { [index: string]: string; }

export class Client {
  static apiVersion: string = '';
  protected token: string;
  protected endpoint: string;

  protected async request(method: string,
                          path: string,
                          queryString: QueryString = {},
                          body?: any,
                          headers: Headers = {'Accept': 'application/json'}): Promise<any> {

    const res: Response = await fetch(
      `${this.endpoint.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}${toQueryString(queryString)}`,
      {
        method,
        headers: {
          ...headers,
          Authorization: `Bearer ${this.token}`,
          'X-nRFCloud-API-Version': Client.apiVersion,
          'X-nRFCloud-API-Client': '@nrfcloud/api-client-javascript',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    const contentType: string = res.headers.get('content-type') || '', mediaType: string = contentType.split(';')[0];
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
}

export const toQueryString = (obj: { [index: string]: string | undefined }): string => Object.keys(obj)
  .filter(key => obj[key]) // Filter out undefined values
  .reduce((queryString, key, i) => {
    let delimiter, value;
    delimiter = (i === 0) ? '?' : '&';
    key = encodeURIComponent(key);
    value = encodeURIComponent(`${obj[key]}`);
    return [queryString, delimiter, key, '=', value].join('');
  }, '');
