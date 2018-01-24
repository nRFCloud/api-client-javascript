import * as ts from 'typescript';
import { schemas } from '@nrfcloud/models';

type JSONSchema = {
  type: string
}
type ApiParameter = {
  name: string,
  required: boolean,
  in: string,
  schema: JSONSchema
}

type ApiResponse = {
  description: string,
  headers: {
    [key: string]: {
      description: string,
      schema: {
        type: string
      }
    }
  }[],
  content: {
    [key: string]: {
      schema: {
        $ref: string
      }
    }
  }
}

type ApiResponses = {
  [index: string]: ApiResponse
}

export class ClientGenerator {
  private api: any;
  private packageJson: any;
  private returnTypes: string[];

  constructor(api: any, packageJson: any) {
    this.api = api;
    this.packageJson = packageJson;

    const returnTypes: string[] = [];
    Object.keys(this.api.paths)
      .forEach(path => Object.keys(this.api.paths[path])
        .forEach(method => {
          this.getReturnsTypesForPath(this.api.paths[path][method].responses)
            .forEach(returnType => {
              if (returnTypes.includes(returnType)) return;
              returnTypes.push(returnType);
            });
        }));
    this.returnTypes = returnTypes;
  }

  private getReturnsTypesForPath(responses: ApiResponses) {
    const returnTypes: string[] = [];
    Object.keys(responses)
      .forEach(statusCode => {
        Object.keys(responses[statusCode].content).forEach(contentType => {
          const returnType = responses[statusCode].content[contentType].schema.$ref.replace('#/components/schemas/', '');
          if (returnTypes.includes(returnType)) return;
          if (returnType === 'HttpProblem') return; // This is thrown
          returnTypes.push(returnType);
        });
      });
    return returnTypes;
  }

  generate(): string {
    const client = this.createClient();

    const models = schemas.map(({title}) => title);

    const imports = this.returnTypes.map(model => ts.createImportDeclaration(
      undefined,
      undefined,
      ts.createImportClause(
        undefined,
        ts.createNamedImports([
          ts.createImportSpecifier(undefined, ts.createIdentifier(model)),
        ]),
      ),
      ts.createLiteral(
        models.includes(model) ? '@nrfcloud/models' : `./types/${model}`),
    ));
    imports.push(ts.createImportDeclaration(
      undefined,
      undefined,
      ts.createImportClause(
        undefined,
        ts.createNamedImports([
          ts.createImportSpecifier(undefined, ts.createIdentifier('HttpProblem')),
          ts.createImportSpecifier(undefined, ts.createIdentifier('ApplicationError')),
        ]),
      ),
      ts.createLiteral('@nrfcloud/models'),
    ));

    const clientFile = ts.createSourceFile('client.ts', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
    const printer = ts.createPrinter({
      newLine: ts.NewLineKind.LineFeed,
    });

    return [
      ...imports,
      ...client,
    ]
      .map(segment => printer.printNode(ts.EmitHint.Unspecified, segment, clientFile))
      .join('\n');
  }

  private createClient() {

    const c = ts.createClassDeclaration(
      undefined,
      [ts.createToken(ts.SyntaxKind.ExportKeyword)],
      'Client',
      undefined,
      [],
      [
        ts.createProperty(
          undefined,
          [
            ts.createToken(ts.SyntaxKind.StaticKeyword),
          ],
          'apiVersion',
          undefined,
          ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
          ts.createLiteral(this.api.info.version),
        ),
        ts.createProperty(
          undefined,
          [
            ts.createToken(ts.SyntaxKind.PrivateKeyword),
          ],
          'token',
          undefined,
          ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
          undefined,
        ),
        ts.createProperty(
          undefined,
          [
            ts.createToken(ts.SyntaxKind.PrivateKeyword),
          ],
          'endpoint',
          undefined,
          ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
          undefined,
        ),
        this.createConstructor(),
        this.createRequest(),
        ...this.createMethods(),
      ],
    );

    ts.addSyntheticLeadingComment(c, ts.SyntaxKind.MultiLineCommentTrivia, '*\n' +
      ' * API Client for the nRF Cloud REST API\n' +
      ' * \n' +
      ` * This client has been auto-generated for version ${this.api.info.version} of the API definition.\n` +
      ' * \n' +
      ` * @see ${this.packageJson.homepage}\n` +
      ` * @author ${this.packageJson.author}\n` +
      ' ', true);

    return [
      c,
    ];
  }

  private createMethods(): ts.MethodDeclaration[] {
    const methods: ts.MethodDeclaration[] = [];
    Object.keys(this.api.paths)
      .forEach(path => Object.keys(this.api.paths[path])
        .forEach(method => {
          methods.push(this.createClientMethod(path, method.toUpperCase(), this.api.paths[path][method]));
        }));
    return methods;
  }

  private createClientMethod(path: string, httpMethod: string, {summary, description, operationId, parameters, responses}: {
    summary: string,
    description: string,
    operationId: string,
    parameters: ApiParameter[],
    responses: ApiResponses
  }): ts.MethodDeclaration {

    const method = ts.createMethod(
      undefined,
      /*modifiers*/[ts.createToken(ts.SyntaxKind.AsyncKeyword)],
      undefined,
      operationId,
      undefined,
      undefined,
      this.createClientMethodParameters(parameters),
      ts.createTypeReferenceNode('Promise', [
        ts.createUnionTypeNode(this.getReturnsTypesForPath(responses).map(returnType => ts.createTypeReferenceNode(returnType, undefined))),
      ]),
      this.createClientMethodBody(path, httpMethod, parameters, responses),
    );

    ts.addSyntheticLeadingComment(method, ts.SyntaxKind.MultiLineCommentTrivia, '*\n' +
      ` * ${summary}\n` +
      ' * \n' +
      ` * ${description}\n` +
      ` * Sends a ${httpMethod} request to ${path}\n` +
      ' * \n' +
      ' * Returns:\n' +
      `${Object.keys(responses)
        .map((statusCode: string) => ` * - for status ${statusCode}\n *   a ${Object.keys(responses[statusCode].content)
            .map(contentType => `${responses[statusCode].content[contentType].schema.$ref.replace('#/components/schemas/', '')} as ${contentType}`)}\n` +
          ` *   (${responses[statusCode].description})\n`).join('')}` +
      ' * \n' +
      `${parameters.map(({name, required, in: location, schema: {type}}) => ` * @param {${type}} ${name}${required ? ' required' : ''} ${location} parameter\n`)}` +
      ' * @throws {TypeError} if the response could not be parsed\n' +
      ' * @throws {HttpProblem} if the backend returned an error\n' +
      ' * @throws {ApplicationError} if the response was an error, but not a HttpProblem\n' +
      ' ', true);

    return method;
  }


  private createClientMethodBody(path: string, method: string, parameters: ApiParameter[], responses: ApiResponses): ts.Block {

    const pathParams = (path.match(/\{[^\}]+\}/g) || []).map(p => p.substr(1, p.length - 2));

    const acceptTypes: { [index: string]: boolean } = {};
    for (let contentType of getAcceptTypes(responses)) {
      acceptTypes[contentType] = true;
    }

    return ts.createBlock([
        ts.createVariableStatement(
          [],
          ts.createVariableDeclarationList(
            [
              ts.createVariableDeclaration(
                'path',
                ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                ts.createLiteral(path.replace(/^\//, '')),
              ),
            ],
            ts.NodeFlags.Let,
          ),
        ),
        ...pathParams.map(param => ts.createStatement(
          ts.createAssignment(
            ts.createIdentifier('path'),
            ts.createCall(
              ts.createPropertyAccess(
                ts.createIdentifier('path'),
                ts.createIdentifier('replace'),
              ),
              undefined,
              [
                ts.createLiteral(`{${param}}`),
                ts.createIdentifier(param),
              ],
            ),
          ),
        )),
        ts.createReturn(
          ts.createCall(
            ts.createPropertyAccess(
              ts.createThis(),
              'request',
            ),
            undefined,
            [
              ts.createLiteral(method.toUpperCase()),
              ts.createIdentifier('path'),
              ts.createIdentifier('undefined'),
              ts.createObjectLiteral(
                [
                  ts.createPropertyAssignment(
                    'Accept',
                    ts.createLiteral(Object.keys(acceptTypes).join(', ')),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
      true,
    );
  }


  private createClientMethodParameters(parameters: ApiParameter[]): ts.ParameterDeclaration[] {
    return [
      // Required parameters first
      ...parameters.filter(({required}) => required).map(({name, schema}) => ts.createParameter(
        undefined,
        undefined,
        undefined,
        name,
        undefined,
        this.createTypeFromJsonSchema(schema),
      )),
      // Optional parameters
      ...parameters.filter(({required}) => !required).map(({name, schema}) => ts.createParameter(
        undefined,
        undefined,
        undefined,
        name,
        ts.createToken(ts.SyntaxKind.QuestionToken),
        this.createTypeFromJsonSchema(schema),
      )),
    ];
  }

  private createTypeFromJsonSchema(schema: JSONSchema): ts.KeywordTypeNode | undefined {
    switch (schema.type) {
      case 'string':
        return ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
    }
  }

  private createConstructor() {
    const constructor = ts.createMethod(
      undefined,
      undefined,
      undefined,
      'constructor',
      undefined,
      undefined,
      [
        ts.createParameter(
          undefined,
          undefined,
          undefined,
          'token',
          undefined,
          ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        ),
        ts.createParameter(
          undefined,
          undefined,
          undefined,
          'endpoint',
          undefined,
          ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
          ts.createLiteral(this.api.servers[0].url),
        ),
      ],
      undefined,
      ts.createBlock([
          ts.createStatement(ts.createAssignment(
            ts.createPropertyAccess(
              ts.createThis(),
              'token',
            ),
            ts.createIdentifier('token'),
          )),
          ts.createStatement(ts.createAssignment(
            ts.createPropertyAccess(
              ts.createThis(),
              'endpoint',
            ),
            ts.createIdentifier('endpoint'),
          )),
        ],
        true,
      ),
    );

    ts.addSyntheticLeadingComment(constructor, ts.SyntaxKind.MultiLineCommentTrivia, '*\n' +
      ' * @param {string} token AWS Cognito Identity token\n' +
      ' * @param {string} endpoint API endpoint\n' +
      ' ', true);

    return constructor;
  }

  private createRequest() {
    return ts.createMethod(
      undefined,
      [
        ts.createToken(ts.SyntaxKind.PrivateKeyword),
        ts.createToken(ts.SyntaxKind.AsyncKeyword),
      ],
      undefined,
      'request',
      undefined,
      undefined,
      [
        ts.createParameter(
          undefined,
          undefined,
          undefined,
          'method',
          undefined,
          ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        ),
        ts.createParameter(
          undefined,
          undefined,
          undefined,
          'path',
          undefined,
          ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        ),
        ts.createParameter(
          undefined,
          undefined,
          undefined,
          'body',
          ts.createToken(ts.SyntaxKind.QuestionToken),
          ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
        ),
        ts.createParameter(
          undefined,
          undefined,
          undefined,
          'headers',
          undefined,
          ts.createTypeLiteralNode([
            ts.createPropertySignature(
              undefined,
              ts.createIdentifier('[index: string]'), // This does not seem the correct way
              undefined,
              ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
              undefined,
            ),
          ]),
          ts.createObjectLiteral(
            [
              ts.createPropertyAssignment(
                ts.createLiteral('Accept'),
                ts.createLiteral('application/json'),
              ),
            ],
          ),
        ),
      ],
      ts.createTypeReferenceNode('Promise', [
        ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
      ]),
      ts.createBlock([
          ts.createVariableStatement(
            [],
            ts.createVariableDeclarationList(
              [
                ts.createVariableDeclaration(
                  'res',
                  ts.createTypeReferenceNode('Response', undefined),
                  ts.createAwait(
                    ts.createCall(
                      ts.createIdentifier('fetch'),
                      undefined,
                      [
                        ts.createTemplateExpression(
                          ts.createTemplateHead(''),
                          [
                            ts.createTemplateSpan(
                              ts.createPropertyAccess(
                                ts.createThis(),
                                ts.createIdentifier('endpoint'),
                              ),
                              ts.createTemplateMiddle('/'),
                            ),
                            ts.createTemplateSpan(
                              ts.createIdentifier('path'),
                              ts.createTemplateTail(''),
                            ),
                          ],
                        ),
                        ts.createObjectLiteral(
                          [
                            ts.createShorthandPropertyAssignment('method'),
                            ts.createPropertyAssignment('headers', ts.createObjectLiteral(
                              [
                                ts.createSpreadAssignment(ts.createIdentifier('headers')),
                                ts.createPropertyAssignment(
                                  'Authorization',
                                  ts.createPropertyAccess(
                                    ts.createThis(),
                                    ts.createIdentifier('token'),
                                  ),
                                ),
                                ts.createPropertyAssignment(
                                  ts.createLiteral('X-API-Version'),
                                  ts.createPropertyAccess(
                                    ts.createIdentifier('Client'),
                                    ts.createIdentifier('apiVersion'),
                                  ),
                                ),
                                ts.createPropertyAssignment(
                                  ts.createLiteral('X-API-Client'),
                                  ts.createLiteral(this.packageJson.name),
                                ),
                              ],
                              true,
                            )),
                            ts.createPropertyAssignment(
                              'body',
                              ts.createConditional(
                                ts.createIdentifier('body'),
                                ts.createCall(
                                  ts.createPropertyAccess(
                                    ts.createIdentifier('JSON'),
                                    ts.createIdentifier('stringify'),
                                  ),
                                  undefined,
                                  [
                                    ts.createIdentifier('body'),
                                  ],
                                ),
                                ts.createIdentifier('undefined'),
                              ),
                            ),
                          ],
                          true,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
              ts.NodeFlags.Const,
            ),
          ),
          // Check if we have json
          ts.createVariableStatement(
            [],
            ts.createVariableDeclarationList(
              [
                ts.createVariableDeclaration('contentType', ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                  ts.createLogicalOr(
                    ts.createCall(
                      ts.createPropertyAccess(
                        ts.createIdentifier('res.headers'),
                        ts.createIdentifier('get'),
                      ),
                      undefined,
                      [
                        ts.createLiteral('content-type'),
                      ],
                    ),
                    ts.createLiteral(''),
                  ),
                ),
                ts.createVariableDeclaration('mediaType', ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                  ts.createElementAccess(
                    ts.createCall(
                      ts.createPropertyAccess(
                        ts.createIdentifier('contentType'),
                        ts.createIdentifier('split'),
                      ),
                      undefined,
                      [
                        ts.createLiteral(';'),
                      ],
                    ),
                    0,
                  ),
                ),
              ],
              ts.NodeFlags.Const,
            ),
          ),
          // Throw if content type does not match accept
          ts.createIf(
            ts.createBinary(
              ts.createCall(
                ts.createPropertyAccess(
                  ts.createIdentifier('headers.Accept'),
                  ts.createIdentifier('indexOf'),
                ),
                undefined,
                [
                  ts.createIdentifier('mediaType'),
                ],
              ),
              ts.SyntaxKind.LessThanToken,
              ts.createLiteral(0),
            ),
            ts.createThrow(
              ts.createNew(
                ts.createIdentifier('TypeError'),
                undefined,
                [
                  ts.createTemplateExpression(
                    ts.createTemplateHead('The content-type "'),
                    [
                      ts.createTemplateSpan(
                        ts.createIdentifier('contentType'),
                        ts.createTemplateMiddle('" of the response does not match accepted media-type '),
                      ),
                      ts.createTemplateSpan(
                        ts.createPropertyAccess(
                          ts.createIdentifier('headers'),
                          ts.createIdentifier('Accept'),
                        ),
                        ts.createTemplateTail(''),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          // Response is JSON?
          ts.createIf(
            ts.createBinary(
              ts.createCall(
                ts.createPropertyAccess(
                  ts.createIdentifier('/^application\\/([^ \\/]+\\+)?json$/'),
                  ts.createIdentifier('test'),
                ),
                undefined,
                [
                  ts.createIdentifier('mediaType'),
                ],
              ),
              ts.SyntaxKind.EqualsEqualsEqualsToken,
              ts.createFalse(),
            ),
            ts.createThrow(
              ts.createNew(
                ts.createIdentifier('TypeError'),
                undefined,
                [
                  ts.createTemplateExpression(
                    ts.createTemplateHead('The content-type "'),
                    [
                      ts.createTemplateSpan(
                        ts.createIdentifier('contentType'),
                        ts.createTemplateTail('" of the response is not JSON!'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          // res.json()
          ts.createVariableStatement(
            [],
            ts.createVariableDeclarationList(
              [
                ts.createVariableDeclaration('json', ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
                  ts.createAwait(
                    ts.createCall(
                      ts.createPropertyAccess(
                        ts.createIdentifier('res'),
                        ts.createIdentifier('json'),
                      ),
                      undefined,
                      [],
                    ),
                  ),
                ),
              ],
              ts.NodeFlags.Const,
            ),
          ),
          // Throw as HttpProblem if statusCode >= 400, backend is expected to return this
          ts.createIf(
            ts.createBinary(
              ts.createPropertyAccess(
                ts.createIdentifier('res'),
                ts.createIdentifier('status'),
              ),
              ts.SyntaxKind.GreaterThanEqualsToken,
              ts.createLiteral(400),
            ),
            // Response is HttpProblem?
            ts.createIf(
              ts.createBinary(
                ts.createPropertyAccess(
                  ts.createIdentifier('json'),
                  ts.createIdentifier('$context'),
                ),
                ts.SyntaxKind.EqualsEqualsEqualsToken,
                ts.createCall(
                  ts.createPropertyAccess(
                    ts.createIdentifier('HttpProblem.$context'),
                    ts.createIdentifier('toString'),
                  ),
                  undefined,
                  [
                  ]
                )
              ),
              ts.createThrow(
                ts.createCall(
                  ts.createPropertyAccess(
                    ts.createIdentifier('HttpProblem'),
                    ts.createIdentifier('fromJSON'),
                  ),
                  undefined,
                  [
                    ts.createIdentifier('json'),
                  ],
                ),
              ),
              ts.createThrow(
                ts.createNew(
                  ts.createIdentifier('ApplicationError'),
                  undefined,
                  [
                    ts.createCall(
                      ts.createPropertyAccess(
                        ts.createIdentifier('JSON'),
                        ts.createIdentifier('stringify'),
                      ),
                      undefined,
                      [
                        ts.createIdentifier('json')
                      ]
                    )
                  ],
                ),
              ),
            )
          ),
          ts.createReturn(ts.createIdentifier('json')),
        ],
        true,
      ),
    );
  }
}

function* getAcceptTypes(responses: ApiResponses): IterableIterator<string> {
  for (let statusCode of Object.keys(responses)) {
    for (let contentType of Object.keys(responses[statusCode].content)) {
      yield contentType;
    }
  }
}
