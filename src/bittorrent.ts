import net from "net";
import { Peer } from "../types";

// Function to create the BitTorrent handshake message
export function createHandshake(infoHash: Buffer, peerId: string) {
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

export function sendInterested(client: net.Socket) {
  const buffer = Buffer.alloc(5);
  buffer.writeUInt32BE(1, 0); // Length prefix
  buffer.writeUInt8(2, 4); // Message ID for 'interested'
  client.write(buffer);
}

export function requestPiece(client: net.Socket, index, begin, length) {
  const buffer = Buffer.alloc(17);
  buffer.writeUInt32BE(13, 0); // Length prefix
  buffer.writeUInt8(6, 4); // Message ID for 'request'
  buffer.writeUInt32BE(index, 5);
  buffer.writeUInt32BE(begin, 9);
  buffer.writeUInt32BE(length, 13);
  client.write(buffer);
}

export function isHandshakeValid(response: Buffer, infoHash: Buffer) {
  if (response.length !== 68 || response.readUInt8(0) !== 19) {
    return false;
  }

  const protocol = response.toString("utf8", 1, 20);
  if (protocol !== "BitTorrent protocol") {
    return false;
  }

  const responseInfoHash = response.slice(28, 48);
  console.log("Response info hash:", responseInfoHash.toString("hex"));
  console.log("Expected info hash:", infoHash.toString("hex"));
  return infoHash.equals(responseInfoHash);
}
