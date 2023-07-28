import { EOL } from "os";
import execWithIndices from "regexp-match-indices";
import { CompletionList } from "vscode-languageserver";
import { CompletionItem, Position, Range, TextEdit } from "vscode-languageserver-protocol";
import { TextDocument } from "vscode-languageserver-textdocument";
import * as lsp from "vscode-languageserver/node";
import * as db from "./db";
import { Data } from "./db";
import { textDocuments } from "./textDocuments";
import { ImportLineMatch, importLineMatch, toTSConfigPath } from "./utils";

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

    console.log("Completion called with", currentLine);

    // TODO: Probably not the best regex for extracting out variables but it will do
    const match = execWithIndices(/.*?: ?([^ ;]+)(.*)/, currentLine);
    if (!match) return CompletionList.create([], true);

    const partialClassName = match[1];

    console.log("Trying to complete with", partialClassName);

    const classNameMatches = db.searchPartly(partialClassName);

    console.log(
      "This is what I found (only showing first 5)",
      classNameMatches.map(item => item.className).slice(0, 5).join(", "),
    );

    const completionItems = classNameMatches.map((completion) => {
      const importEdit = this.createImportEdit(completion, lines);
      if (!importEdit) return undefined;

      const classNameInd = match.indices[1][0];
      const endText = match[2];

      return {
        ...CompletionItem.create(completion.className),
        kind: lsp.CompletionItemKind.Variable,
        detail: "@value",
        textEdit: TextEdit.replace(
          Range.create(
            Position.create(position.line, classNameInd),
            Position.create(position.line, classNameInd + completion.className.length + endText.length),
          ),
          completion.className + endText,
        ),
        additionalTextEdits: [importEdit],
      };
    }).filter(item => item != null);

    return CompletionList.create(completionItems as CompletionItem[]);
  }

  createImportEdit(completion: Data, lines: string[]) {
    const filePath = toTSConfigPath(completion.filePath);

    let importLine: { index: number; match: ImportLineMatch } | undefined = undefined;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = importLineMatch(line);
      if (match) {
        importLine = { index: i, match };

        // If the class already exists as an import then lets exclude it from the completion,
        // since it will probably already be handled by the editor.
        if (match.classNames.indexOf(completion.className) !== -1) {
          return undefined;
        }

        if (match.filePath === filePath) {
          break;
        }
      }
    }

    if (importLine && importLine.match.filePath === filePath) {
      const match = importLine.match;
      const newClasses = [...match.classNames, completion.className].sort().join(", ");

      return TextEdit.replace(
        Range.create(
          Position.create(importLine.index, 0),
          Position.create(importLine.index, match.line.length),
        ),
        `${match.start}${newClasses}${match.end}`,
      );
    }

    return TextEdit.insert(
      Position.create(importLine?.index ?? 0, 0),
      `@value ${completion.className} from "${filePath}";\n`,
    );
  }
}
