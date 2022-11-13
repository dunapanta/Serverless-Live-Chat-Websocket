import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  PostToConnectionCommandInput,
} from "@aws-sdk/client-apigatewaymanagementapi";

type WebsocketData = {
  data: {
    message?: string;
    type?: string;
    from?: string; //who the message is from
  };
  client?: ApiGatewayManagementApiClient;
  connectionId?: string; //Id of the user who we are sending the message to
  domainName?: string;
  stage?: string;
};

type WebSocketClient = {
  domainName: string;
  stage: string;
};

export const websocket = {
  createClient: ({ domainName, stage }: WebSocketClient) => {
    //Create Client
    const client = new ApiGatewayManagementApiClient({
      endpoint: `https://${domainName}/${stage}`, //which websocket will be dealing with
    });
    return client;
  },
  send: ({ data, connectionId, client, domainName, stage }: WebsocketData) => {
    if (!client) {
      if (!domainName || !stage) {
        throw new Error(
          "Please provide domainName or stage if no client is provided"
        );
      }
      client = websocket.createClient({ domainName, stage });
    }

    const params: PostToConnectionCommandInput = {
      ConnectionId: connectionId,
      Data: JSON.stringify(data) as any,
    };

    const command = new PostToConnectionCommand(params);

    return client.send(command);
  },
};
