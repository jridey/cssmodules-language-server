import TrieSearch from "trie-search";

type Data = {
  key: string;
  filePath: string;
};

let db = new TrieSearch<Data>("key");

export function add(key: string, value: string) {
  db.add({ key, filePath: value });
}

export function searchPartly(key: string) {
  return db.search(key, undefined, 10);
}
