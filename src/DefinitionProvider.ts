import { EOL } from "os";
import path from "path";
import { Hover, Location, Position, Range } from "vscode-languageserver-protocol";
import { TextDocument } from "vscode-languageserver-textdocument";
import * as lsp from "vscode-languageserver/node";
import { textDocuments } from "./textDocuments";
import {
  CamelCaseValues,
  Classname,
  filePathToClassnameDict,
  findImportPath,
  genImportRegExp,
  getCurrentDirFromUri,
  getPosition,
  getTransformer,
  getWords,
  isImportLineMatch,
  stringiyClassname,
} from "./utils";

export class CSSModulesDefinitionProvider {
  _camelCaseConfig: CamelCaseValues;

  constructor(camelCaseConfig: CamelCaseValues) {
    this._camelCaseConfig = camelCaseConfig;
  }

  updateSettings(camelCaseConfig: CamelCaseValues): void {
    this._camelCaseConfig = camelCaseConfig;
  }

  definition = async (params: lsp.DefinitionParams) => {
    const textdocument = textDocuments.get(params.textDocument.uri);
    if (textdocument === undefined) {
      return [];
    }

    return this.provideDefinition(textdocument, params.position);
  };

  async provideDefinition(
    textdocument: TextDocument,
    position: Position,
  ): Promise<Location | null> {
    const fileContent = textdocument.getText();
    const lines = fileContent.split(EOL);
    const currentLine = lines[position.line];
    const currentWord = getWordAt(currentLine, position.character);
    const currentDir = getCurrentDirFromUri(textdocument.uri);

    // If this is an import line then we can extract out the import path from the currentLine
    const matches = genImportRegExp("(\\S+)").exec(currentLine);
    if (
      matches
      && isImportLineMatch(currentLine, matches, position.character)
    ) {
      const importPath: string = path.resolve(currentDir, matches[2]);

      const targetPosition = await getPosition(
        importPath,
        currentWord,
        this._camelCaseConfig,
      );

      let targetRange: Range = Range.create(
        Position.create(0, 0),
        Position.create(0, 0),
      );
      if (targetPosition != null) {
        targetRange = {
          start: targetPosition,
          end: targetPosition,
        };
      }

      return Location.create(`file://${importPath}`, targetRange);
    }

    // Otherwise try and find the import path
    const importPath = findImportPath(fileContent, currentWord, currentDir);
    if (importPath !== "") {
      const targetPosition = await getPosition(
        importPath,
        currentWord,
        this._camelCaseConfig,
      );
      if (targetPosition != null) {
        const targetRange: Range = {
          start: targetPosition,
          end: targetPosition,
        };
        return Location.create(`file://${importPath}`, targetRange);
      }
    }

    return null
  }
}

// Borrowed from https://stackoverflow.com/a/5174867, slight modification to add commas as separator characters
function getWordAt(str: string, pos: number) {
  // Search for the word's beginning and end.
  const left = str.slice(0, pos + 1).search(/\S+(\s|,)*$/),
    right = str.slice(pos).search(/(\s|,)/);

  // The last word in the string is a special case.
  if (right < 0) {
    return str.slice(left);
  }

  // Return the word, using the located bounds to extract it from the string.
  return str.slice(left, right + pos);
}