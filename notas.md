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

## Live Chat App - Clase 8 Websocket Deploy Test

- En Postman se seleccion `Websocket Request`

```
{
    "action": "createRoom",
    "name": "Daniel"
}
```

- Respuesta

```
{"message":"You are now connected to room with code b31ae33e","type":"info"}
```

## Live Chat App - Clase 10 Websocket Join Room

```
import { formatJSONResponse } from "@libs/apiGateway";
import { dynamo } from "@libs/dynamo";
import { websocket } from "@libs/websocket";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { UserConnectionRecord } from "src/types/dynamo";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { name, roomCode } = JSON.parse(event.body);
    const tableName = process.env.roomConnectionTable;

    const { connectionId, domainName, stage } = event.requestContext;

    if (!name) {
      await websocket.send({
        data: {
          message: "Please provide a name on joinRoom",
          type: "err",
        },
        connectionId,
        domainName,
        stage,
      });
      //early return
      return formatJSONResponse({});
    }

    if (!roomCode) {
      await websocket.send({
        data: {
          message: "Please provide a roomCode on joinRoom",
          type: "err",
        },
        connectionId,
        domainName,
        stage,
      });
      //early return
      return formatJSONResponse({});
    }

    const roomUsers = await dynamo.query({
      pkValue: roomCode,
      tableName,
      index: "index1",
      limit: 1, //One record to know if the room exists
    });

    if (roomUsers.length === 0) {
      await websocket.send({
        data: {
          message: "Room does not exist. Please create a room first",
          type: "err",
        },
        connectionId,
        domainName,
        stage,
      });
      //early return
      return formatJSONResponse({});
    }

    const data: UserConnectionRecord = {
      id: connectionId,
      pk: roomCode,
      sk: connectionId,

      roomCode,
      name,
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


## Live Chat App - Clase 11 Message and code
```
import { formatJSONResponse } from "@libs/apiGateway";
import { dynamo } from "@libs/dynamo";
import { websocket } from "@libs/websocket";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { UserConnectionRecord } from "src/types/dynamo";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { message } = JSON.parse(event.body);
    const tableName = process.env.roomConnectionTable;

    const { connectionId, domainName, stage } = event.requestContext;

    if (!message) {
      await websocket.send({
        data: {
          message: "Please provide a message on message actions",
          type: "err",
        },
        connectionId,
        domainName,
        stage,
      });
      //early return
      return formatJSONResponse({});
    }

    const existingUser = await dynamo.get<UserConnectionRecord>(
      connectionId,
      tableName
    );

    if (!existingUser) {
      await websocket.send({
        data: {
          message: "Please need to create or join a room",
          type: "err",
        },
        connectionId,
        domainName,
        stage,
      });
      //early return
      return formatJSONResponse({});
    }

    const { name, roomCode } = existingUser;

    const roomUsers = await dynamo.query<UserConnectionRecord>({
      pkValue: roomCode,
      tableName,
      index: "index1",
    });

    //Send message to all users in the room
    const messagePromiseArray = roomUsers
      .filter((targetUser) => {
        return targetUser.id !== existingUser.id;
      })
      .map(async (user) => {
        const { id: connectionId, domainName, stage } = user;
        return websocket.send({
          data: {
            message,
            from: existingUser.name,
          },
          connectionId,
          domainName,
          stage,
        });
      });

    await Promise.all(messagePromiseArray);

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