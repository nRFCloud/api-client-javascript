import { Client, Headers, QueryString } from '../../skeleton/client';

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
    beforeEach(() => {
      fetch = jest.fn();
      fetch
        .mockReturnValue(Promise.resolve({
          headers: {
            get: (header: string) => {
              switch (header) {
                case 'content-type':
                  return 'application/json; charset=utf-8';
                default:
                  return null;
              }
            },
          },
          json: () => Promise.resolve({}),
        }));
      (<any>global).fetch = fetch;
    });
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
          Authorization: 'Bearer sometoken'
        }
      });
    })
  });
});
