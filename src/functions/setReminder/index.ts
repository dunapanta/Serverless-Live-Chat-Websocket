import { formatJSONResponse } from "@libs/apiGateway";
import { dynamo } from "@libs/dynamo";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuid } from "uuid";

import { isValidEmail } from "utils/validations";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body);
    const tableName = process.env.roomConnectionTable;
    const { email, phoneNumber, reminder, reminderDate } = body;

    const validationErrors = validateInputs({
      email,
      phoneNumber,
      reminder,
      reminderDate,
    });

    if (validationErrors) {
      return validationErrors;
    }

    const userId = email || phoneNumber;

    const data = {
      ...body,
      id: uuid(),
      TTL: reminderDate / 1000, //TTL dynamo is in seconds
      pk: userId, //group by user
      sk: reminderDate.toString(), //sort by date

      //userId,
      //reminder,
      //email,
      //phoneNumber,
      //reminderDate,
    };

    await dynamo.write(data, tableName);

    return formatJSONResponse({
      data: {
        message: `Reminder set for ${new Date(reminderDate).toDateString()}`,
        id: data.id,
      },
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

const validateInputs = ({
  email,
  phoneNumber,
  reminder,
  reminderDate,
}: {
  email?: string;
  phoneNumber?: string;
  reminder: string;
  reminderDate: number;
}) => {

  if (!email && !phoneNumber) {
    return formatJSONResponse({
      statusCode: 400,
      data: { message: "Email or Phone Number are required" },
    });
  }

  if (email && !isValidEmail(email)) {
    return formatJSONResponse({
      statusCode: 400,
      data: { message: "Invalid email" },
    });
  }

  if (!reminder) {
    return formatJSONResponse({
      statusCode: 400,
      data: { message: "Reminder is required" },
    });
  }

  if (!reminderDate) {
    return formatJSONResponse({
      statusCode: 400,
      data: { message: "Reminder Date is required" },
    });
  }

  return;
};
