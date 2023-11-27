import dgram from "dgram";
import crypto from "crypto";

import { Peer } from "../types";

function sendAnnounceRequest(
  socket,
  connectionId,
  transactionId,
  infoHash: Buffer,
  peerId,
  port,
  url,
  reject
) {
  const announceRequest = Buffer.alloc(98);

  // Connection ID
  connectionId.copy(announceRequest, 0);
  // Action (1 for announce)
  announceRequest.writeUInt32BE(1, 8);
  // Transaction ID
  transactionId.copy(announceRequest, 12);
  // Info hash
  infoHash.copy(announceRequest, 16);
  // Peer ID
  Buffer.from(peerId, "hex").copy(announceRequest, 36);
  // Downloaded
  Buffer.alloc(8).copy(announceRequest, 56);
  // Left
  Buffer.alloc(8).copy(announceRequest, 64);
  // Uploaded
  Buffer.alloc(8).copy(announceRequest, 72);
  // Event (0 for none)
  announceRequest.writeUInt32BE(0, 80);
  // IP address (0 for default)
  announceRequest.writeUInt32BE(0, 84);
  // Key
  crypto.randomBytes(4).copy(announceRequest, 88);
  // Num want (-1 for default)
  announceRequest.writeInt32BE(-1, 92);
  // Port
  announceRequest.writeUInt16BE(port, 96);

  socket.send(
    announceRequest,
    0,
    announceRequest.length,
    url.port,
    url.hostname,
    (err) => {
      if (err) {
        console.error("Error sending announce request:", err);
        reject(err);
      } else {
        console.log("Announce request sent");
      }
    }
  );
}

function handleAnnounceResponse(response: Buffer): Peer[] {
  const interval = response.readUInt32BE(8);
  const leechers = response.readUInt32BE(12);
  const seeders = response.readUInt32BE(16);
  const peers = parsePeers(response.slice(20));

  console.log(
    `Interval: ${interval}, Leechers: ${leechers}, Seeders: ${seeders}`
  );
  return peers;
}

function parsePeers(peersBuffer: Buffer): Peer[] {
  const peers: Peer[] = [];
  for (let i = 0; i < peersBuffer.length; i += 6) {
    const ip = peersBuffer.slice(i, i + 4).join(".");
    const port = peersBuffer.readUInt16BE(i + 4);
    peers.push({ ip, port });
  }
  return peers;
}

export async function contactUDPTracker(
  trackerUrl: string,
  transactionId: Buffer,
  infoHash: Buffer,
  peerId: string,
  port: number
): Promise<Peer[]> {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket("udp4");
    const url = new URL(trackerUrl);

    // Connect request (protocol ID + action + transaction ID)
    const connectRequest = Buffer.alloc(16);
    connectRequest.writeUInt32BE(0x417, 0); // Protocol ID
    connectRequest.writeUInt32BE(0x27101980, 4);
    connectRequest.writeUInt32BE(0, 8); // Action (0 for connect)
    transactionId.copy(connectRequest, 12); // Transaction ID

    socket.on("message", (response) => {
      const action = response.readUInt32BE(0);

      if (action === 0) {
        // Connect response
        const connectionId = response.slice(8, 16);
        sendAnnounceRequest(
          socket,
          connectionId,
          transactionId,
          infoHash,
          peerId,
          port,
          url,
          reject
        );
      } else if (action === 1) {
        // Announce response
        const peers = handleAnnounceResponse(response);
        socket.close(); // Close the socket after resolving
        resolve(peers);
      }
    });

    socket.send(
      connectRequest,
      0,
      connectRequest.length,
      parseInt(url.port),
      url.hostname,
      (err) => {
        if (err) {
          console.error("Error sending connect request:", err);
          socket.close(); // Close the socket if there's an error
          reject(err);
        } else {
          console.log("Connect request sent");
        }
      }
    );
  });
}
