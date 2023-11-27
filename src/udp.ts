import dgram from "dgram";
import crypto from "crypto";

export async function contactUDPTracker(trackerUrl: string, transactionId: Buffer, infoHash: string, peerId: string, port: number) {
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
      sendAnnounceRequest(socket, connectionId);
    } else if (action === 1) {
      // Announce response
      handleAnnounceResponse(response);
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
      } else {
        console.log("Connect request sent");
      }
    }
  );

  function sendAnnounceRequest(socket, connectionId) {
    const announceRequest = Buffer.alloc(98);

    // Connection ID
    connectionId.copy(announceRequest, 0);
    // Action (1 for announce)
    announceRequest.writeUInt32BE(1, 8);
    // Transaction ID
    transactionId.copy(announceRequest, 12);
    // Info hash
    Buffer.from(infoHash, "hex").copy(announceRequest, 16);
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
        } else {
          console.log("Announce request sent");
        }
      }
    );
  }

  function handleAnnounceResponse(response) {
    const interval = response.readUInt32BE(8);
    const leechers = response.readUInt32BE(12);
    const seeders = response.readUInt32BE(16);
    const peers = parsePeers(response.slice(20));

    console.log(
      `Interval: ${interval}, Leechers: ${leechers}, Seeders: ${seeders}`
    );
    console.log("Peers:", peers);
  }

  function parsePeers(peersBuffer) {
    const peers = [];
    for (let i = 0; i < peersBuffer.length; i += 6) {
      const ip = peersBuffer.slice(i, i + 4).join(".");
      const port = peersBuffer.readUInt16BE(i + 4);
      peers.push({ ip, port });
    }
    return peers;
  }
}
