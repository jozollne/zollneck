import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class SocketGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket, ...args: any[]) {
    console.log(`Client connected: ${client.id}`);
  }

  handleYoutubeDownloadProgress(clientId: string, progress: number) {
    const client = this.server.sockets.sockets.get(clientId);
    if (client) {
      client.emit('downloadProgress', progress);
    }
  }
  
  handleDownloadProgress(clientId: string, data: { fileName: string, progress: number }) {
    const client = this.server.sockets.sockets.get(clientId);
    if (client) {
      client.emit('downloadProgress', data);
    }
  }
}
