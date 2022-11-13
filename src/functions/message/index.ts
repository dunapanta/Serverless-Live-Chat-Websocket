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
