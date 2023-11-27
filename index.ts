import fs from "fs";
import crypto from "crypto";

import { decode, encode } from "./src/my_encoder";
import { contactUDPTracker } from "./src/udp";
import { connectToPeer } from "./src/bittorrent";
import { Peer } from "./types";

const torrentFilePath = "torrents/tears-of-steel.torrent";

const torrentFile = fs.readFileSync(torrentFilePath);
const decoded = decode(torrentFile);
fs.writeFileSync("decoded.json", JSON.stringify(decoded, null, 2));

const peerId: string = crypto.randomBytes(20).toString("hex");
const port: number = 6881; // Your client's listening port
const infoHash: Buffer = encode(decoded.info);
const url: string = decoded["announce-list"][2][0] as string;
const transactionId: Buffer = crypto.randomBytes(4);

const main = async () => {
  const peers: Peer[] = await contactUDPTracker(
    url,
    transactionId,
    infoHash,
    peerId,
    port
  );
  console.log(peers);
	for (let i = 0; i < peers.length; i++) {
		connectToPeer(peers[i], Buffer.from(infoHash), peerId)
	}
};

main();
