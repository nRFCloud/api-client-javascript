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
  private returnTypes: string[];

  constructor(api: any) {
    this.api = api;

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

    const clientFile = ts.createSourceFile('client.ts', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
    const printer = ts.createPrinter({
      newLine: ts.NewLineKind.LineFeed,
    });

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
        ]),
      ),
      ts.createLiteral('@nrfcloud/models'),
    ));

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
      this.createClientMethodBody(path, httpMethod, parameters),
    );

    ts.addSyntheticLeadingComment(method, ts.SyntaxKind.MultiLineCommentTrivia, '*\n' +
      ` * ${summary}\n` +
      ' * \n' +
      ` * ${description}\n` +
      ` * Sends a ${httpMethod} request to ${path}\n` +
      ' * \n' +
      ' * Returns:\n' +
      `${Object.keys(responses).map((statusCode: string) => ` * - for status ${statusCode} a ${Object.keys(responses[statusCode].content).map(contentType => `${responses[statusCode].content[contentType].schema.$ref.replace('#/components/schemas/', '')}`)} (${responses[statusCode].description})\n`).join('')}` +
      ' * \n' +
      `${parameters.map(({name, required, in: location, schema: {type}}) => ` * @param {${type}} ${name}${required ? ' required' : ''} ${location} parameter\n`)}` +
      ' ', true);

    return method;
  }


  private createClientMethodBody(path: string, method: string, parameters: ApiParameter[]): ts.Block {

    const pathParams = (path.match(/\{[^\}]+\}/g) || []).map(p => p.substr(1, p.length - 2));

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
            ts.NodeFlags.Let
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
                                ts.createPropertyAssignment(
                                  'Authorization',
                                  ts.createPropertyAccess(
                                    ts.createThis(),
                                    ts.createIdentifier('token'),
                                  ),
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
                          true),
                      ],
                    ),
                  ),
                ),
              ],
              ts.NodeFlags.Const
            ),
          ),
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
                )
              ],
              ts.NodeFlags.Const
            )
          ),
          ts.createIf(
            ts.createBinary(
              ts.createPropertyAccess(
                ts.createIdentifier('res'),
                ts.createIdentifier('status'),
              ),
              ts.SyntaxKind.GreaterThanEqualsToken,
              ts.createLiteral(400),
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
          ),
          ts.createReturn(ts.createIdentifier('json')),
        ],
        true,
      ),
    );
  }
}
