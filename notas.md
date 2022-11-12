## Live Chat App - Clase 6 Create Room

- El primer usuario es el que crea la sala
- En `functions.ts`

```
import type { AWS } from "@serverless/typescript";

const functions: AWS["functions"] = {
  createRoom: {
    handler: "src/functions/createRoom/index.handler",
    events: [
      {
        websocket:{
          route: "createRoom" //route that will point to this lambda function
        }
      }
    ],
  },
};

export default functions;

```

- Se define funcion `createRoom`

```
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body);
    const tableName = process.env.roomConnectionTable;

    const { connectionId, domainName, stage } = event.requestContext;

    if (!body.name) {
      await websocket.send({
        data: {
          message: "Please provide a name on createRoom",
          type: "err",
        },
        connectionId,
        domainName,
        stage,
      });
      //early return
      return formatJSONResponse({});
    }

    const roomCode = uuid().substring(0, 8);

    const data: UserConnectionRecord = {
      id: connectionId,
      pk: roomCode,
      sk: connectionId,

      roomCode,
      name: body.name,
      domainName,
      stage,
    };

    await dynamo.write(data, tableName);

    await websocket.send({
      data: {
        message: `You are now connected to room with code ${roomCode}`,
        type: "info",
      },
      connectionId,
      domainName,
      stage,
    });

    return formatJSONResponse({});
  } catch (err) {
    return formatJSONResponse({
      statusCode: 500,
      data: {
        error: err.message,
      },
    });
  }
};

```

## Live Chat App - Clase 7 Websocket Library
- En `libs` se crea `websocket.ts`
- Ejecutar `npm i @aws-sdk/client-apigatewaymanagementapi`
- Definir cliente de websocket
```
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

```
