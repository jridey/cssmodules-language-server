import * as lsp from "vscode-languageserver/node";

import * as fs from "fs";
import { Glob } from "glob";
import { matchCaptureGroupAll } from "match-index";
import * as readline from "readline";
import { CSSModulesCompletionProvider } from "./CompletionProvider";
import * as db from "./db";
import { CSSModulesDefinitionProvider } from "./DefinitionProvider";
import { textDocuments } from "./textDocuments";

export function createConnection(): lsp.Connection {
  const connection = lsp.createConnection(process.stdin, process.stdout);

  textDocuments.listen(connection);

  let rootPath: string;
  const completionProvider = new CSSModulesCompletionProvider();
  const definitionProvider = new CSSModulesDefinitionProvider();

  connection.onInitialize(({ rootUri, capabilities }) => {
    rootPath = rootUri ?? "";
    const hasWorkspaceFolderCapability = !!(
      capabilities.workspace && !!capabilities.workspace.workspaceFolders
    );
    const result: lsp.InitializeResult = {
      capabilities: {
        textDocumentSync: {
          openClose: true,
          change: lsp.TextDocumentSyncKind.Full,
          willSave: false,
          willSaveWaitUntil: false,
          save: false,
        },
        hoverProvider: false,
        definitionProvider: true,
        implementationProvider: false,
        completionProvider: {
          /**
           * only invoke completion once `.` is pressed
           */
          triggerCharacters: ["."],
          resolveProvider: true,
        },
      },
    };
    if (hasWorkspaceFolderCapability) {
      result.capabilities.workspace = {
        workspaceFolders: {
          supported: true,
        },
      };
    }

    return result;
  });

  connection.onInitialized(() => {
    // slice(7) -> remove the file:// at the start of the string.
    const cssFilesStream = new Glob("src/**/*.css", { root: rootPath, withFileTypes: true });
    cssFilesStream.stream().on("data", path => {
      const fileStream = fs.createReadStream(path.fullpath(), "utf-8");
      const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

      let lineNo = 0;
      rl.on("line", line => {
        const match = matchCaptureGroupAll(line, /.*@value (.+?): .*;/);
        if (match?.[0]) {
          const cssClass = match[0];
          const startChar = cssClass.index;
          db.add(cssClass.text, path.relative(), lineNo, startChar);
        }
        lineNo++;
      });
    });
  });

  connection.onCompletion(completionProvider.completion);
  connection.onDefinition(definitionProvider.definition);

  return connection;
}
