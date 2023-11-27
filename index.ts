import fs from "fs";
import crypto from "crypto";

import { decode, encode } from "./src/bencode";
import { contactUDPTracker } from "./src/udp";

const torrentFilePath = "torrents/file.torrent";

const torrentFile = fs.readFileSync(torrentFilePath);
const decoded = decode(torrentFile);

const peerId = crypto.randomBytes(20).toString("hex");
const port = 6881; // Your client's listening port
const infoHash = encode(decoded.info);
const transactionId = crypto.randomBytes(4);

contactUDPTracker(decoded["announce"], transactionId, infoHash, peerId, port );
