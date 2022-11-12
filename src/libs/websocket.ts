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
  connectionId?: string; //Id of the user who we are sending the message to
  domainName: string;
  stage: string;
};

export const websocket = {
  send: ({ data, connectionId, domainName, stage }: WebsocketData) => {
    //Create Client
    const client = new ApiGatewayManagementApiClient({
      endpoint: `https://${domainName}/${stage}`, //which websocket will be dealing with
    });

    const params: PostToConnectionCommandInput = {
      ConnectionId: connectionId,
      Data: JSON.stringify(data) as any,
    };

    const command = new PostToConnectionCommand(params);

    return client.send(command);
  },
};
