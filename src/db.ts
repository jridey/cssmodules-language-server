import path from "path";
import TrieSearch from "trie-search";

export type Data = {
  _key: string;
  className: string;
  filePath: string;
  lineNo: number;
  startChar: number;
};

const db = new TrieSearch<Data>("_key");

export function _internalDb() {
  return db;
}

export function add(className: string, filePath: string, lineNo: number, startChar: number) {
  db.add({ _key: `${className}:${uniqueFilePathKey(filePath)}`, className, filePath, lineNo, startChar });
}

export function searchPartly(key: string, filePath?: string) {
  if (filePath) {
    key += `:${uniqueFilePathKey(filePath)}`;
  }

  return db.search(key).sort((a, b) => {
    const importanceA = importance(a);
    const importanceB = importance(b);
    return importanceB - importanceA;
  }); // .slice(0, 10);
}

function uniqueFilePathKey(filePath: string) {
  const parts = filePath.split(path.sep);
  return parts.slice(parts.length - 2).join(path.sep);
}

function importance(d: Data) {
  let imp = 0;
  imp += d.filePath.indexOf("ui/") !== -1 ? 1 : 0;
  imp += d.filePath.indexOf("ui/base") !== -1 ? 1 : 0;
  return imp;
}
