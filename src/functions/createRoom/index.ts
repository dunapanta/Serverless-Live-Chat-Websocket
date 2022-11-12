import { formatJSONResponse } from "@libs/apiGateway";
import { v4 as uuid } from "uuid";
import { dynamo } from "@libs/dynamo";
import { websocket } from "@libs/websocket";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { UserConnectionRecord } from "src/types/dynamo";

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
