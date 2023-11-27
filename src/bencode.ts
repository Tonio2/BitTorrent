type BencodeValue =
  | number
  | string
  | BencodeValue[]
  | { [key: string]: BencodeValue };

export const decode = (buffer: Buffer): any => {
  let index = 0;

  function parse(): any {
    if (buffer[index] === 105) {
      // 'i' pour un entier
      return parseInteger();
    } else if (buffer[index] >= 48 && buffer[index] <= 57) {
      // chiffres pour une chaîne
      return parseString();
    } else if (buffer[index] === 108) {
      // 'l' pour une liste
      return parseList();
    } else if (buffer[index] === 100) {
      // 'd' pour un dictionnaire
      return parseDictionary();
    } else {
      throw new Error(`Invalid bencode format at index ${index}`);
    }
  }

  function parseInteger(): number {
    index++; // passer 'i'
    let end = buffer.indexOf(101, index); // trouver 'e'
    let number = parseInt(buffer.toString("ascii", index, end));
    index = end + 1;
    return number;
  }

  function parseString(): string {
    let colon = buffer.indexOf(58, index); // trouver ':'
    let length = parseInt(buffer.toString("ascii", index, colon));
    index = colon + 1;
    let string = buffer.toString("utf-8", index, index + length);
    index += length;
    return string;
  }

  function parseList(): any[] {
    index++; // passer 'l'
    let list = [];
    while (buffer[index] !== 101) {
      // jusqu'à 'e'
      list.push(parse());
    }
    index++; // passer 'e'
    return list;
  }

  function parseDictionary(): Record<string, any> {
    index++; // passer 'd'
    let dict: Record<string, any> = {};
    while (buffer[index] !== 101) {
      // jusqu'à 'e'
      let key = parseString();
      dict[key] = parse();
    }
    index++; // passer 'e'
    return dict;
  }

  return parse();
};

export const encode = (value: BencodeValue): string => {
  if (typeof value === "number") {
    return `i${value}e`;
  } else if (typeof value === "string") {
    const buffer = Buffer.from(value, "utf-8");
    return `${buffer.length}:${value}`;
  } else if (Array.isArray(value)) {
    return `l${value.map(encode).join("")}e`;
  } else if (typeof value === "object" && value !== null) {
    const keys = Object.keys(value).sort((a, b) => {
      // Sort the keys as byte strings
      const bufferA = Buffer.from(a, "utf-8");
      const bufferB = Buffer.from(b, "utf-8");
      return bufferA.compare(bufferB);
    }); // Bencode requires dictionary keys to be sorted
    return `d${keys
      .map((key) => `${encode(key)}${encode(value[key])}`)
      .join("")}e`;
  } else {
    throw new Error("Unsupported data type");
  }
};
