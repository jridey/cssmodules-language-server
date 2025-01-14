import { EOL } from "os";
import { Location, Position, Range } from "vscode-languageserver-protocol";
import { TextDocument } from "vscode-languageserver-textdocument";
import * as lsp from "vscode-languageserver/node";
import { textDocuments } from "./textDocuments";
import { getPositionOfClassName, getWordAt, importLineMatch, resolveTSConfigPath } from "./utils";

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

    console.log("Trying to find the definition");

    // We need to be on an import line to go to a definition.
    const match = importLineMatch(currentLine);
    if (!match) {
      console.log("Not currently on a import line");
      return null;
    }

    const absoluteFilePath = resolveTSConfigPath(match.filePath, textdocument.uri);
    if (!absoluteFilePath) {
      console.log("Unable to resolve file path", match.filePath, textdocument.uri);
      return null;
    }

    console.log("File path resolved as", absoluteFilePath);

    const targetPositionStart = getPositionOfClassName(
      currentWord,
      match.filePath,
    );

    console.log("Target position is", targetPositionStart);

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

    return Location.create(absoluteFilePath, targetRange);
  }
}
