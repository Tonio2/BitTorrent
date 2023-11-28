import fs from "fs";
import crypto from "crypto";
import net from "net";

import { decode, encode } from "./src/my_encoder";
import { contactUDPTracker } from "./src/udp";
import { createHandshake, isHandshakeValid } from "./src/bittorrent";
import { Peer } from "./types";

const torrentFilePath = "torrents/file.torrent";

function connectToPeer(peer: Peer, infoHash: Buffer, peerId: string) {
  let isHandshakeComplete = false;
  const client = new net.Socket();

  client.connect(peer.port, peer.ip, () => {
    console.log(`Connected to peer: ${peer.ip}:${peer.port}`);
    const handshake = createHandshake(infoHash, peerId);
    client.write(handshake);
  });

  client.on("data", (data: Buffer) => {
    if (!isHandshakeComplete) {
      if (isHandshakeValid(data, infoHash)) {
        isHandshakeComplete = true;
      } else {
        console.log("Invalid handshake received.");
        client.end();
        return;
      }
    } else {
      if (data.length > 4) {
        const messageId = data.readUInt8(4);
        switch (messageId) {
          // Add cases for handling different message types
          default:
            console.log(`Received message of type ${messageId}`);
        }
      }
    }

    // Handle response here
  });

  client.on("error", (err) => {
    console.error(
      `Connection error with peer ${peer.ip}:${peer.port} - ${err.message}`
    );
  });

  client.on("close", (hadError) => {
    if (!hadError) {
      console.log(`Connection closed gracefully: ${peer.ip}:${peer.port}`);
    }
  });
}

const main = async () => {
  const torrentFile = fs.readFileSync(torrentFilePath);
  const decoded = decode(torrentFile);
  fs.writeFileSync("decoded.json", JSON.stringify(decoded, null, 2));

  const peerId: string = crypto.randomBytes(20).toString("hex");
  const port: number = 6881; // Your client's listening port
  const infoHash: Buffer = crypto
    .createHash("sha1")
    .update(encode(decoded.info))
    .digest();
  //   const url: string = decoded["announce"] as string;
  //   console.log("Contacting tracker... ", url);
  const transactionId: Buffer = crypto.randomBytes(4);
  const peers: Peer[] = [];
  for (let i = 0; i < decoded["announce-list"].length; i++) {
    const url = decoded["announce-list"][i][0];
    let newPeers: Peer[] = [];
    try {
      newPeers = await contactUDPTracker(
        url,
        transactionId,
        infoHash,
        peerId,
        port
      );
    } catch (e) {
      console.log("Error contacting tracker [", url, "]: ", e.message);
    }
    for (const peer of newPeers) {
      if (!peers.find((p) => p.ip === peer.ip && p.port === peer.port)) {
        peers.push(peer);
      }
    }
  }
  console.log(peers);
  for (let i = 0; i < peers.length; i++) {
    connectToPeer(peers[i], infoHash, peerId);
  }
};

main();
