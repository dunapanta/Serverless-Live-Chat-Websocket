import { formatJSONResponse } from "@libs/apiGateway";
import { dynamo } from "@libs/dynamo";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const tableName = process.env.roomConnectionTable;

    const { userId } = event.pathParameters || {};

    if (!userId) {
      return formatJSONResponse({
        statusCode: 400,
        data: { message: "userId is required" },
      });
    }

    const data = await dynamo.query({
      tableName,
      index: "index1",
      pkValue: userId,
    });

    return formatJSONResponse({
      data,
    });
  } catch (err) {
    return formatJSONResponse({
      statusCode: 500,
      data: {
        error: err.message,
      },
    });
  }
};