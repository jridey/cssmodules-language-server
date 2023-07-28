import TrieSearch from "trie-search";

export type Data = {
  key: string;
  filePath: string;
  lineNo: number;
  startChar: number;
};

const db = new TrieSearch<Data>("key");

export function _internalDb() {
  return db;
}

export function add(key: string, value: string, lineNo: number, startChar: number) {
  db.add({ key, filePath: value, lineNo, startChar });
}

export function searchPartly(key: string) {
  return db.search(key, undefined, 10);
}
