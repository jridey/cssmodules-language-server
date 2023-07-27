import { EOL } from "os";
import { CompletionList } from "vscode-languageserver";
import { CompletionItem, Position, Range, TextEdit } from "vscode-languageserver-protocol";
import { TextDocument } from "vscode-languageserver-textdocument";
import * as lsp from "vscode-languageserver/node";
import * as db from "./db";
import { textDocuments } from "./textDocuments";
import { CamelCaseValues, getTransformer } from "./utils";

// // check if current character or last character is .
// function isTrigger(line: string, position: Position): boolean {
//     const i = position.character - 1;
//     return line[i] === '.' || (i > 1 && line[i - 1] === '.');
// }
//
// function getWords(line: string, position: Position): string {
//     const text = line.slice(0, position.character);
//     const index = text.search(/[a-z0-9\._]*$/i);
//     if (index === -1) {
//         return '';
//     }
//
//     return text.slice(index);
// }

export class CSSModulesCompletionProvider {
  completion = async (params: lsp.CompletionParams) => {
    const textdocument = textDocuments.get(params.textDocument.uri);
    if (textdocument === undefined) {
      return [];
    }

    return this.provideCompletionItems(textdocument, params.position);
  };

  async provideCompletionItems(
    textdocument: TextDocument,
    position: Position,
  ): Promise<CompletionList | null> {
    const fileContent = textdocument.getText();
    const lines = fileContent.split(EOL);
    const currentLine = lines[position.line];

    let lastImportLine = 0;
    lines.forEach((line, i) => {
      if (/@value .+ from ".+";/g.test(line)) lastImportLine = i;
    });

    const firstColon = currentLine.indexOf(": ");
    if (firstColon === -1) return CompletionList.create();

    const partialClassName = currentLine.slice(firstColon + 2);
    const classNameMatches = db.searchPartly(partialClassName);

    const completionItems = classNameMatches.map((completion): CompletionItem => ({
      ...CompletionItem.create(completion.key),
      kind: lsp.CompletionItemKind.Text,
      textEdit: TextEdit.replace(
        Range.create(
          Position.create(position.line, firstColon + 2),
          Position.create(position.line, firstColon + 2 + completion.key.length),
        ),
        completion.key,
      ),
      additionalTextEdits: [TextEdit.insert(
        Position.create(lastImportLine, 0),
        `@value ${completion.key} from "${completion.filePath}";\n`,
      )],
    }));

    return CompletionList.create(completionItems);
  }
}
