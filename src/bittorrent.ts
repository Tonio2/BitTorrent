import net from "net";
import { Peer } from "../types";

// Function to create the BitTorrent handshake message
function createHandshake(infoHash: Buffer, peerId: string) {
  const buffer = Buffer.alloc(68);

  // Protocol identifier length
  buffer.writeUInt8(19, 0);

  // Protocol identifier
  buffer.write("BitTorrent protocol", 1);

  // Reserved bytes
  buffer.writeUInt32BE(0, 20);
  buffer.writeUInt32BE(0, 24);

  // Info hash
  infoHash.copy(buffer, 28);

  // Peer ID
  buffer.write(peerId, 48);

  return buffer;
}

// Function to connect to a peer and send the handshake
export function connectToPeer(peer: Peer, infoHash: Buffer, peerId: string) {
  const client = new net.Socket();

  client.connect(peer.port, peer.ip, () => {
    console.log(`Connected to peer: ${peer.ip}:${peer.port}`);
    const handshake = createHandshake(infoHash, peerId);
    client.write(handshake);
  });

  client.on("data", (data) => {
    console.log(`Received: ${data}`);
    // Handle response here
  });

  client.on("error", (err) => {
    console.error(
      `Connection error with peer ${peer.ip}:${peer.port} - ${err.message}`
    );
		console.error(err);
  });

  client.on("close", (hadError) => {
    if (hadError) {
      console.log(`Connection closed with error: ${peer.ip}:${peer.port}`);
    } else {
      console.log(`Connection closed gracefully: ${peer.ip}:${peer.port}`);
    }
  });
}
