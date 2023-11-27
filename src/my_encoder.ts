type BencodeValue =
  | number
  | string
  | BencodeValue[]
  | { [key: string]: BencodeValue };

const decoder = new TextDecoder("utf-8");

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

  function parseString(asBuffer = false): string | Buffer {
    let colon = buffer.indexOf(58, index); // trouver ':'
    let length = parseInt(buffer.toString("ascii", index, colon));
    index = colon + 1;
    if (asBuffer) {
      let data = buffer.slice(index, index + length);
      index += length;
      return data;
    } else {
      let string = buffer.slice(index, index + length).toString("utf-8");
      index += length;
      return string;
    }
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
      let key = parseString() as string;
      let isPiecesKey = key === "pieces";
      dict[key] = isPiecesKey ? parseString(true) : parse();
    }
    index++; // passer 'e'
    return dict;
  }

  return parse();
};

export const encode = (value: BencodeValue): Buffer => {
  if (typeof value === "number") {
    return Buffer.from(`i${value}e`, "utf-8");
  } else if (typeof value === "string") {
    const buffer = Buffer.from(value, "utf-8");
    const length = Buffer.from(`${buffer.length}:`, "utf-8");
    return Buffer.concat([length, buffer]);
  } else if (Buffer.isBuffer(value)) {
    // Directly handle Buffer objects
    const length = Buffer.from(`${value.length}:`, "utf-8");
    return Buffer.concat([length, value]);
  } else if (Array.isArray(value)) {
    const encodedValues = value.map(encode);
    const encodedList = Buffer.concat(encodedValues);
    return Buffer.concat([Buffer.from("l"), encodedList, Buffer.from("e")]);
  } else if (typeof value === "object" && value !== null) {
    const keys = Object.keys(value).sort((a, b) => {
      const bufferA = Buffer.from(a, "utf-8");
      const bufferB = Buffer.from(b, "utf-8");
      return bufferA.compare(bufferB);
    });
    const encodedDict = keys.reduce((acc, key) => {
      const encodedKey = encode(key);
      const encodedValue = encode(value[key]);
      return Buffer.concat([acc, encodedKey, encodedValue]);
    }, Buffer.from("d"));
    return Buffer.concat([encodedDict, Buffer.from("e")]);
  } else {
    throw new Error("Unsupported data type");
  }
};
