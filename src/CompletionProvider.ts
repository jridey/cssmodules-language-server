import { matchCaptureGroupAll } from "match-index";
import { EOL } from "os";
import { CompletionList } from "vscode-languageserver";
import { CompletionItem, Position, Range, TextEdit } from "vscode-languageserver-protocol";
import { TextDocument } from "vscode-languageserver-textdocument";
import * as lsp from "vscode-languageserver/node";
import * as db from "./db";
import { Data } from "./db";
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

type ImportLine = { index: number; line?: string };

const IMPORT_REGEX = /(.*?@value )(.+?)( from ".+";)/;

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

    let lastImportLine: ImportLine = { index: 0, line: undefined };
    lines.forEach((line, i) => {
      if (IMPORT_REGEX.test(line)) {
        lastImportLine = { index: i, line };
      }
    });

    const match = matchCaptureGroupAll(currentLine, /.*?: ?(.+?);?/);
    if (!match.length) return CompletionList.create();

    const partialClassName = match[0].text;
    const classNameMatches = db.searchPartly(partialClassName);

    const completionItems = classNameMatches.map((completion) => {
      const importEdit = this.createImportEdit(completion, lastImportLine);
      if (!importEdit) return undefined;

      return {
        ...CompletionItem.create(completion.key),
        kind: lsp.CompletionItemKind.Text,
        textEdit: TextEdit.replace(
          Range.create(
            Position.create(position.line, match[0].index),
            Position.create(position.line, match[0].index + completion.key.length),
          ),
          completion.key,
        ),
        additionalTextEdits: [importEdit],
      };
    }).filter(item => item != null);

    return CompletionList.create(completionItems as CompletionItem[]);
  }

  createImportEdit(completion: Data, importLine: ImportLine) {
    const match = importLine.line ? IMPORT_REGEX.exec(importLine.line) : undefined;
    if (match?.length == 4) {
      const start = match[1];
      const existingClasses = match[2].split(",").map(cls => cls.trim());

      // If the class already exists as an import then lets exclude it from the completion,
      // since it will probably already be handled by the editor.
      if (existingClasses.indexOf(completion.key) !== -1) {
        return undefined;
      }
      const newClasses = [...existingClasses, completion.key].sort().join(", ");
      const end = match[3];
      return TextEdit.replace(
        Range.create(
          Position.create(importLine.index + 1, 0),
          Position.create(importLine.index + 1, importLine.line!.length),
        ),
        `${start}${newClasses}${end}\n`,
      );
    }
    return TextEdit.insert(
      Position.create(0, 0),
      `@value ${completion.key} from "${completion.filePath}";\n`,
    );
  }
}
