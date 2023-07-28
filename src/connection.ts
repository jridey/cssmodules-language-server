import * as fs from "fs";
import { Glob } from "glob";
import * as readline from "readline";
import execWithIndices from "regexp-match-indices";
import * as lsp from "vscode-languageserver/node";
import { CSSModulesCompletionProvider } from "./CompletionProvider";
import * as db from "./db";
import { CSSModulesDefinitionProvider } from "./DefinitionProvider";
import { textDocuments } from "./textDocuments";

export function createConnection(): lsp.Connection {
  const connection = lsp.createConnection(process.stdin, process.stdout);

  textDocuments.listen(connection);

  const completionProvider = new CSSModulesCompletionProvider();
  const definitionProvider = new CSSModulesDefinitionProvider();

  connection.onInitialize(({ capabilities }) => {
    // TODO: Setup workspace functionality to only scan the correct directories
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
           * only invoke completion once ` `  is pressed
           */
          triggerCharacters: [" "],
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
    const cssFilesStream = new Glob("**/*.css", { ignore: ["node_modules/**"], withFileTypes: true });
    cssFilesStream.stream().on("data", path => {
      const fileStream = fs.createReadStream(path.fullpath(), "utf-8");
      const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

      let lineNo = 0;
      rl.on("line", line => {
        const match = execWithIndices(/.*@value (.+?): .*;/, line);
        if (match) {
          const cssClass = match[1];
          const startChar = match.indices[1][0];
          db.add(cssClass, path.relative(), lineNo, startChar);
        }
        lineNo++;
      });
    }).on("end", () => {
      // connection.sendProgress(new lsp.ProgressType<number>(), "css-indexing", 0);
      console.log("Done indexing")
    });
  });

  connection.onCompletion(completionProvider.completion);
  connection.onDefinition(definitionProvider.definition);

  return connection;
}
