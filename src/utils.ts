import path from "path";
import execWithIndices from "regexp-match-indices";
import { Position } from "vscode-languageserver-protocol";
import { DocumentUri } from "vscode-languageserver-textdocument";
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
 * ie "/Home/User/canva/web/src/pages/home/frog.css" -> "pages/home/frog.css"
 */
export function resolveTSConfigPath(filePath: string) {
  return filePath;
}

/**
 * Resolve the file path from a absolute file path to a tsconfig path
 * ie "pages/home/frog.css" -> "/Home/User/canva/web/src/pages/home/frog.css"
 */
export function toTSConfigPath(filePath: string) {
  return filePath;
}

/**
 * Finds the position of the className in filePath
 */
export function getPosition(
  filePath: string,
  className: string,
): Position | undefined {
  const match = db.searchPartly(className)?.[0];
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

export function getCurrentDirFromUri(uri: DocumentUri) {
  return path.dirname(uri).replace(/^file:\/\//, "");
}

function isRelativeFilePath(str: string): boolean {
  return str.startsWith("../") || str.startsWith("./");
}
