import { EOL } from "os";
import execWithIndices from "regexp-match-indices";
import { CompletionList } from "vscode-languageserver";
import { CompletionItem, Position, Range, TextEdit } from "vscode-languageserver-protocol";
import { TextDocument } from "vscode-languageserver-textdocument";
import * as lsp from "vscode-languageserver/node";
import * as db from "./db";
import { Data } from "./db";
import { textDocuments } from "./textDocuments";

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

const IMPORT_REGEX = /(.*?@value )(.+?)( from "(.+)";)/;

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

    // TODO: Probably not the best regex for extracting out variables but it will do
    const match = execWithIndices(/.*?: ?([^ ;]+)(.*)/, currentLine);
    if (!match) return CompletionList.create();

    const partialClassName = match[1];
    const classNameMatches = db.searchPartly(partialClassName);

    const completionItems = classNameMatches.map((completion) => {
      const importEdit = this.createImportEdit(completion, lines);
      if (!importEdit) return undefined;

      const matchText = match[2];
      const matchIndex = match.indices[2][0];

      return {
        ...CompletionItem.create(completion.key),
        kind: lsp.CompletionItemKind.Variable,
        detail: "@value",
        textEdit: TextEdit.replace(
          Range.create(
            Position.create(position.line, matchIndex),
            Position.create(position.line, matchIndex + completion.key.length + matchText.length),
          ),
          completion.key + matchText,
        ),
        additionalTextEdits: [importEdit],
      };
    }).filter(item => item != null);

    return CompletionList.create(completionItems as CompletionItem[]);
  }

  createImportEdit(completion: Data, lines: string[]) {
    let importLine: { index: number; line: string; match: RegExpExecArray } | undefined = undefined;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = IMPORT_REGEX.exec(line);
      if (match) {
        importLine = { index: i, line, match };

        const existingClasses = match[2].split(",").map(cls => cls.trim());

        // If the class already exists as an import then lets exclude it from the completion,
        // since it will probably already be handled by the editor.
        if (existingClasses.indexOf(completion.key) !== -1) {
          return undefined;
        }

        if (match[4] === completion.filePath) {
          break;
        }
      }
    }

    if (importLine) {
      const start = importLine.match[1];
      const existingClasses = importLine.match[2].split(",").map(cls => cls.trim());
      const newClasses = [...existingClasses, completion.key].sort().join(", ");
      const end = importLine.match[3];

      return TextEdit.replace(
        Range.create(
          Position.create(importLine.index, 0),
          Position.create(importLine.index, importLine.line!.length),
        ),
        `${start}${newClasses}${end}`,
      );
    }

    return TextEdit.insert(
      Position.create(0, 0),
      `@value ${completion.key} from "${completion.filePath}";\n`,
    );
  }
}
