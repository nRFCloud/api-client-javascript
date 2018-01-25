import * as ts from 'typescript';
import { schemas } from '@nrfcloud/models';

type JSONSchema = {
  type: string
}
type ApiParameter = {
  name: string,
  description?: string,
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
  private skeletonSource: string;
  private api: any;
  private packageJson: any;
  private returnTypes: string[];

  constructor(skeletonSource: string, api: any, packageJson: any) {
    this.skeletonSource = skeletonSource;
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
    const skeleton = ts.createSourceFile('skeleton.ts', this.skeletonSource, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
    const root: ts.Node = skeleton.getChildAt(0);
    const skeletonClient: ts.Node | undefined = root.getChildren().find(node => ts.isClassDeclaration(node));
    if (!skeletonClient) {
      throw new Error('No class declaration found!');
    }
    const client = this.updateClient(<ts.ClassDeclaration>skeletonClient);

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
    imports.push(
      ts.createImportDeclaration(
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
      ),
    );

    const blank = ts.createSourceFile('blank.ts', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
    const printer = ts.createPrinter({
      newLine: ts.NewLineKind.LineFeed,
    });
    return [
      ...imports,
      client,
      ...root.getChildren()
        .filter(node => !ts.isClassDeclaration(node))
        .filter(node => !ts.isImportDeclaration(node)),
    ]
      .map(segment => printer.printNode(ts.EmitHint.Unspecified, segment, blank))
      .join('\n');
  }

  private updateClient(c: ts.ClassDeclaration): ts.ClassDeclaration {
    const apiVersionPropertyFilter = (member: ts.Node) => ts.isPropertyDeclaration(member)
      && (<ts.Identifier>(<ts.PropertyDeclaration>member).name).escapedText === 'apiVersion';
    let apiVersionProperty: ts.PropertyDeclaration | undefined = c.members.find(member => apiVersionPropertyFilter(member)) as ts.PropertyDeclaration;
    if (!apiVersionProperty) {
      throw new Error('Skeleton client must provide "apiVersion" property!')
    }

    apiVersionProperty = ts.updateProperty(
      apiVersionProperty,
      apiVersionProperty.decorators,
      apiVersionProperty.modifiers,
      apiVersionProperty.name,
      apiVersionProperty.questionToken,
      apiVersionProperty.type,
      ts.createLiteral(this.api.info.version)
    )

    c = ts.updateClassDeclaration(
      c,
      c.decorators,
      c.modifiers,
      c.name,
      c.typeParameters,
      c.heritageClauses ? c.heritageClauses : [],
      [
        apiVersionProperty,
        ...c.members.filter(member => !apiVersionPropertyFilter(member) && ts.isPropertyDeclaration(member)),
        this.createClientConstructor(),
        ...c.members.filter(member => !apiVersionPropertyFilter(member) && !ts.isPropertyDeclaration(member)),
        ...this.createClientMethods(),
      ],
    );

    c = ts.addSyntheticLeadingComment(c, ts.SyntaxKind.MultiLineCommentTrivia, '*\n' +
      ' * API Client for the nRF Cloud REST API\n' +
      ' * \n' +
      ` * This client has been auto-generated for version ${this.api.info.version} of the API definition.\n` +
      ' * \n' +
      ` * @see ${this.packageJson.homepage}\n` +
      ` * @author ${this.packageJson.author}\n` +
      ' ', true);

    return c;
  }

  private createClientMethods(): ts.MethodDeclaration[] {
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
      `${parameters.map(({name, description, required, in: location, schema: {type}}) => ` * @param {${type}} ${name}${required ? ' required' : ''} (${location} parameter)${description ? ` ${description}` : ''}\n`)}` +
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
              ts.createObjectLiteral(
                parameters
                  .filter(({in: location}) => location === 'query')
                  .map(({name}) => ts.createShorthandPropertyAssignment(name)),
              ),
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
      ...parameters.filter(({required}) => required).map(parameter => ts.createParameter(
        undefined,
        undefined,
        undefined,
        parameter.name,
        undefined,
        this.createTypeFromJsonSchema(parameter),
      )),
      // Optional parameters
      ...parameters.filter(({required}) => !required).map(parameter => ts.createParameter(
        undefined,
        undefined,
        undefined,
        parameter.name,
        ts.createToken(ts.SyntaxKind.QuestionToken),
        this.createTypeFromJsonSchema(parameter),
      )),
    ];
  }

  private createTypeFromJsonSchema(parameter: ApiParameter): ts.KeywordTypeNode | undefined {
    switch (parameter.schema.type) {
      case 'string':
        return ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
      case 'boolean':
        if (parameter.in === 'query') {
          throw new Error(`Query parameters must be string! ${JSON.stringify(parameter)}`);
        }
        return ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
      default:
        throw new Error(`Unsupported schema type: ${parameter.schema.type}!`);
    }
  }

  private createClientConstructor() {
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
}

function* getAcceptTypes(responses: ApiResponses): IterableIterator<string> {
  for (let statusCode of Object.keys(responses)) {
    for (let contentType of Object.keys(responses[statusCode].content)) {
      yield contentType;
    }
  }
}

const createStringMapType = (allowUndefined: boolean = false) => ts.createTypeLiteralNode([
  ts.createPropertySignature(
    undefined,
    ts.createIdentifier('[index: string]'), // This does not seem the correct way
    undefined,
    allowUndefined ? ts.createUnionTypeNode([
      ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
      ts.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
    ]) : ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
    undefined,
  ),
]);
