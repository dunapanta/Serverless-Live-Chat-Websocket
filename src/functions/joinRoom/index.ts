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
