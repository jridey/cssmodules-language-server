import path from "path";
import execWithIndices from "regexp-match-indices";
import { Position } from "vscode-languageserver-protocol";
import * as db from "./db";

const IMPORT_REGEX = /(.*?@value )(.+?)( from "(.+)";)/;

export type ImportLineMatch = {
  line: string;
  start: string;
  classNames: string[];
  end: string;
  filePath: string;
};

/**
 * Resolve the file path from a tsconfig style path to a absolute one
 */
export function importLineMatch(
  line: string,
): ImportLineMatch | undefined {
  const match = execWithIndices(IMPORT_REGEX, line);
  return match
    ? {
      line: match[0],
      start: match[1],
      classNames: match[2].split(",").map(cls => cls.trim()),
      end: match[3],
      filePath: match[4],
    }
    : undefined;
}

/**
 * Resolve the file path from a tsconfig style path to a absolute one
 * ie "pages/home/frog.css" -> "/Home/User/canva/web/src/pages/home/frog.css"
 */
export function resolveTSConfigPath(filePath: string, fileUri: string) {
  // TODO: There are probably much better ways of doing this but this will work for the time being
  const srcInd = fileUri.indexOf("src");
  // Somehow we are outside the src directory?
  if (srcInd === -1) {
    return null;
  }

  // 7 for the "file://" since path.resolve doesn't correctly handle it
  const rootUri = fileUri.slice(7, srcInd + 3);
  return `file://${path.resolve(rootUri, filePath)}`;
}

/**
 * Resolve the file path from a absolute file path to a tsconfig path
 * ie "/Home/User/canva/web/src/pages/home/frog.css" -> "pages/home/frog.css"
 */
export function toTSConfigPath(filePath: string) {
  // TODO: There are probably much better ways of doing this but this will work for the time being
  const srcInd = filePath.indexOf("src");
  // Somehow we are outside the src directory?
  if (srcInd === -1) {
    return filePath;
  }
  return filePath.slice(srcInd + 4);
}

/**
 * Finds the position of the className in filePath
 */
export function getPositionOfClassName(
  className: string,
  filePath: string,
): Position | undefined {
  // TODO: This might return the wrong data if the file name is the same but I'm lazy so...
  const match = db.searchPartly(className, filePath)?.[0];
  if (match) {
    return Position.create(match.lineNo, match.startChar);
  }
}

/**
 * Gets the word at the position in the string
 * Borrowed from https://stackoverflow.com/a/5174867, slight modification to add commas as separator characters
 */
export function getWordAt(str: string, pos: number) {
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
