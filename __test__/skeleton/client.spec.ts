import { Client, Headers, QueryString } from '../../skeleton/client';
import { HttpProblem, URLValue, ApplicationError } from '@nrfcloud/models';

class MockClient extends Client {
  constructor() {
    super();
    this.endpoint = 'http://example.com/';
    this.token = 'sometoken';
  }

  async request(method: string, path: string, queryString?: QueryString, body?: any, headers?: Headers): Promise<any> {
    return super.request(method, path, queryString, body, headers);
  }
}

describe('Client Skeleton', () => {
  describe('request', () => {
    let fetch: jest.Mock;
    let headers: { [index: string]: string };
    let response: object;
    let status: number;
    beforeEach(() => {
      fetch = jest.fn();
      headers = {
        'content-type': 'application/json; charset=utf-8',
      };
      response = {};
      status = 200;
      fetch
        .mockReturnValue(Promise.resolve({
          headers: {
            get: (header: string) => headers[header.toLowerCase()] ? headers[header.toLowerCase()] : null,
          },
          json: () => Promise.resolve(response),
          get status() {
            return status;
          },
        }));
      (<any>global).fetch = fetch;
    });
    describe('send requests', () => {
      test('construct correct urls from endpoinnt', () => {
        const c = new MockClient();
        c.request('GET', '/foo');
        expect(fetch.mock.calls[0][0]).toBe('http://example.com/foo');
      });
      test('empty query string should not be appended', () => {
        const c = new MockClient();
        c.request('GET', '/foo');
        expect(fetch.mock.calls.length).toBe(1);
        const url = new URL(fetch.mock.calls[0][0]);
        expect(url.search).toBe('');
      });
      test('query strings should be appended', () => {
        const c = new MockClient();
        c.request('GET', '/foo', {foo: 'bar', bar: 'b a z'});
        expect(fetch.mock.calls.length).toBe(1);
        const url = new URL(fetch.mock.calls[0][0]);
        expect(url.search).toBe('?foo=bar&bar=b%20a%20z');
      });
      test('send Authorization header', () => {
        const c = new MockClient();
        c.request('GET', '/foo');
        expect(fetch.mock.calls.length).toBe(1);
        expect(fetch.mock.calls[0][1]).toMatchObject({
          headers: {
            Authorization: 'Bearer sometoken',
          },
        });
      });
    });
    describe('handle responses', () => {
      test('regular response', async () => {
        status = 201;
        response = {foo: 'bar'};
        headers['content-length'] = `${JSON.stringify(response).length}`;
        const c = new MockClient();
        const r = await c.request('GET', '/foo');
        expect(r).toEqual(response);
      });
      test('handle empty responses (204)', async () => {
        status = 204;
        const c = new MockClient();
        const r = await c.request('GET', '/foo');
        expect(r).toBeUndefined();
      });
      test('handle empty responses (Content-Length: 0)', async () => {
        status = 200;
        headers['content-length'] = '0';
        response = {foo: 'bar'}; // It should not parse the response.
        const c = new MockClient();
        const r = await c.request('GET', '/foo');
        expect(r).toBeUndefined();
      });
    });
    describe('handle error responses', () => {
      test('handle HttpProblem errors', () => {
        expect.assertions(1);
        status = 400;
        response = JSON.parse(JSON.stringify(new HttpProblem(new URLValue(`https://github.com/nRFCloud/models#Foo`), 'some message', status)));
        headers['content-length'] = `${JSON.stringify(response).length}`;
        const c = new MockClient();
        return c.request('GET', '/foo')
          .catch(err => {
            expect(err).toBeInstanceOf(HttpProblem);
          });
      });
      test('handle other JSON errors', () => {
        expect.assertions(2);
        status = 400;
        response = {foo: 'bar'};
        headers['content-length'] = `${JSON.stringify(response).length}`;
        const c = new MockClient();
        return c.request('GET', '/foo')
          .catch((err: ApplicationError) => {
            expect(err).toBeInstanceOf(ApplicationError);
            expect(err.message).toEqual(JSON.stringify(response));
          });
      });
      test('handle empty errors', () => {
        expect.assertions(1);
        status = 400;
        const c = new MockClient();
        return c.request('GET', '/foo')
          .catch((err: ApplicationError) => {
            expect(err).toBeInstanceOf(ApplicationError);
          });
      });
      test('fail on non-json responses', () => {
        expect.assertions(1);
        status = 500;
        headers['content-type'] = 'text/plain';
        const c = new MockClient();
        return c.request('GET', '/foo')
          .catch(err => {
            expect(err).toBeInstanceOf(TypeError);
          });
      });
    });
  });
});
