import { EOL } from "os";
import path from "path";
import { Hover, Location, Position, Range } from "vscode-languageserver-protocol";
import { TextDocument } from "vscode-languageserver-textdocument";
import * as lsp from "vscode-languageserver/node";
import { textDocuments } from "./textDocuments";
import {
  findImportPath,
  genImportRegExp,
  getCurrentDirFromUri,
  getPosition,
  isImportLineMatch,
} from "./utils";

export class CSSModulesDefinitionProvider {
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

      const targetPositionStart = getPosition(
        importPath,
        currentWord,
      );

      let targetRange: Range = Range.create(
        Position.create(0, 0),
        Position.create(0, 0),
      );
      if (targetPositionStart != null) {
        const targetPositionEnd = Position.create(
          targetPositionStart.line,
          targetPositionStart.character + currentWord.length,
        );
        targetRange = {
          start: targetPositionStart,
          end: targetPositionEnd,
        };
      }

      console.log(importPath, targetRange);
      return Location.create(`file://${importPath}`, targetRange);
    }

    // Otherwise try and find the import path
    const importPath = findImportPath(fileContent, currentWord, currentDir);
    if (importPath !== "") {
      const targetPositionStart = getPosition(
        importPath,
        currentWord,
      );
      if (targetPositionStart != null) {
        const targetPositionEnd = Position.create(
          targetPositionStart.line,
          targetPositionStart.character + currentWord.length,
        );
        const targetRange: Range = {
          start: targetPositionStart,
          end: targetPositionEnd,
        };
        return Location.create(`file://${importPath}`, targetRange);
      }
    }

    return null;
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
