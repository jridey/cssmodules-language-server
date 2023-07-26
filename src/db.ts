import TrieSearch from "trie-search";

type Data = {
  key: string;
  filePath: string;
  start: number;
  end: number;
};

let db = new TrieSearch<Data>("key");

export function add(key: string, value: string, start: number, end: number) {
  db.add({ key, filePath: value, start, end });
}

export function searchPartly(key: string) {
  return db.search(key, undefined, 10);
}
