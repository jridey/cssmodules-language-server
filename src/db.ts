import TrieSearch from "trie-search";

type Data = {
  key: string;
  filePath: string;
  lineNo: number;
  startChar: number;
};

let db = new TrieSearch<Data>("key");

export function add(key: string, value: string, lineNo: number, startChar: number) {
  db.add({ key, filePath: value, lineNo, startChar });
}

export function searchPartly(key: string) {
  return db.search(key, undefined, 10);
}
